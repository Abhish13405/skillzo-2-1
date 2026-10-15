"""
common/groq_service.py

SINGLE shared Groq API wrapper.
Har module (Resume Analysis, Text Interview, Audio Interview, Video Interview)
isi ek class ko import karke use karega -- alag alag Groq client kahin nahi banega.

Usage:
    from common.groq_service import groq_service

    result = groq_service.generate_questions(role="Python Developer", difficulty="Beginner", count=10)
    evaluation = groq_service.evaluate_answer(question="...", answer="...", role="Python Developer")
    resume_data = groq_service.analyze_resume(resume_text="...")
"""
import json
import re
import logging
from groq import Groq, BadRequestError
from django.conf import settings

logger = logging.getLogger(__name__)


# ─── CURATED 60-QUESTION STANDARDIZED INTERVIEW BANK ─────────────────────────
PYTHON_QUESTION_BANK = {
    "Beginner": [
        # Part 1: Basic Level (Questions 1 to 20)
        "Introduce yourself.",
        "What is Python, and why is it popular?",
        "What are the main features of Python?",
        "What is a variable in Python?",
        "What are the different data types in Python?",
        "What is the difference between a list and a tuple?",
        "What is the difference between int, float, and str?",
        "What is the difference between = and ==?",
        "What is the difference between if, elif, and else?",
        "What is the difference between a for loop and a while loop?",
        "What are break, continue, and pass?",
        "What is the difference between input() and print()?",
        "What is type casting in Python?",
        "What are arithmetic, comparison, and logical operators?",
        "What is a function in Python?",
        "What is the difference between return and print()?",
        "What is string slicing in Python?",
        "What is a dictionary, and how do you access its values?",
        "What is a set, and why is it useful?",
        "What are the uses of the len() and type() functions?",
    ],
    "Intermediate": [
        # Part 2: Medium Level (Questions 21 to 40)
        "Introduce yourself.",
        "What is the difference between mutable and immutable objects?",
        "What is the difference between is and ==?",
        "What is the difference between append() and extend()?",
        "What is the difference between sort() and sorted()?",
        "What are *args and **kwargs?",
        "What is list comprehension?",
        "What is the difference between local, global, and nonlocal variables?",
        "What is recursion?",
        "What is a lambda function?",
        "What is the difference between map(), filter(), and reduce()?",
        "What are default arguments in Python?",
        "What is the difference between shallow copy and deep copy?",
        "What is a class, and what is an object?",
        "What are self and __init__()?",
        "What is inheritance, and what are its types?",
        "What is polymorphism in Python?",
        "What is method overriding?",
        "What is exception handling in Python?",
        "What are iterators and generators?",
        "What is the difference between a module and a package?",
    ],
    "Advanced": [
        # Part 3: Hard Level (Questions 41 to 60)
        "Introduce yourself.",
        "How does Python manage memory?",
        "What is the Global Interpreter Lock (GIL)?",
        "What is the difference between multithreading and multiprocessing?",
        "What are decorators in Python?",
        "What are closures in Python?",
        "What is a context manager?",
        "What are magic methods in Python?",
        "What is Method Resolution Order (MRO)?",
        "What is the difference between instance methods, class methods, and static methods?",
        "What are async and await?",
        "What are descriptors in Python?",
        "What is the difference between __new__() and __init__()?",
        "What are metaclasses in Python?",
        "What is monkey patching?",
        "What causes circular imports in Python?",
        "How do you optimize a slow Python program?",
        "What is the difference between time complexity and space complexity?",
        "How would you implement a thread-safe counter?",
        "How would you process a very large file efficiently?",
        "How would you debug a Python application that consumes too much memory?",
    ],
}


class GroqService:
    """
    Ek hi client instance poore project mein reuse hota hai (singleton pattern).
    Audio aur Video interview bhi isi class ko call karenge -- unka audio/video
    pehle Speech-to-Text (Web Speech API) se text mein convert hoga frontend par,
    phir wahi text yahan evaluate_answer() ko bheja jayega. Isliye "ek hi API se
    teeno mode chalte hain."
    """

    def __init__(self):
        self._client = None
        self.model = settings.GROQ_MODEL

    @property
    def client(self):
        if self._client is None:
            if not settings.GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY not set in environment (.env file)")
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client

    def _chat(self, system_prompt: str, user_prompt: str, json_mode: bool = True, temperature: float = 0.3) -> dict:
        """Core call shared by every method below, with JSON validation error recovery."""
        kwargs = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content

            if json_mode:
                return json.loads(content)
            return {"text": content}

        except BadRequestError as e:
            logger.warning(f"Groq BadRequestError: {e}")
            # Try recovering from failed_generation if provided by Groq
            if json_mode:
                err_body = getattr(e, 'body', {})
                if isinstance(err_body, dict):
                    failed_gen = err_body.get('error', {}).get('failed_generation')
                    if failed_gen:
                        try:
                            # Try directly parsing or extracting with regex
                            return json.loads(failed_gen)
                        except Exception:
                            # Attempt regex clean-up of inner unescaped quotes or markdown
                            match = re.search(r'\{[\s\S]*\}', failed_gen)
                            if match:
                                try:
                                    return json.loads(match.group(0))
                                except Exception:
                                    pass

            # If recovery failed, retry once with an extra strict system prompt
            try:
                strict_sys = (
                    system_prompt +
                    " IMPORTANT: Return ONLY strictly valid JSON. Do not put double quotes inside string values; use single quotes."
                )
                kwargs["messages"][0]["content"] = strict_sys
                response = self.client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content
                if json_mode:
                    return json.loads(content)
                return {"text": content}
            except Exception as retry_err:
                logger.error(f"Groq retry also failed: {retry_err}")
                raise e

        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise

    # ---------------------------------------------------------------
    # Module 3: Resume Analysis
    # ---------------------------------------------------------------
    def analyze_resume(self, resume_text: str) -> dict:
        """Extract skills, ATS score, feedback, suggested roles from resume text."""
        system_prompt = (
            "You are an expert ATS (Applicant Tracking System) and technical resume "
            "reviewer. Always respond with valid JSON only, no extra text. "
            "Never use unescaped double quotes inside string values; use single quotes instead."
        )
        user_prompt = f"""
Analyze this resume and return JSON with EXACTLY this structure:
{{
  "extracted_skills": ["skill1", "skill2"],
  "ats_score": <integer 0-100>,
  "feedback": ["point 1", "point 2", "point 3"],
  "suggested_job_roles": ["role1", "role2", "role3"],
  "missing_keywords": ["keyword1", "keyword2"]
}}

Resume text:
{resume_text}
"""
        return self._chat(system_prompt, user_prompt)

    # ---------------------------------------------------------------
    # Module 4: AI Interview - Question Generation
    # (shared by Text / Audio / Video modes)
    # ---------------------------------------------------------------
    def generate_questions(self, role: str, difficulty: str, count: int = 10,
                            question_type: str = "technical",
                            exclude_questions: list = None) -> dict:
        """
        Generate curated interview questions following the mandatory structure:
        - Question 1 is ALWAYS: Introduce yourself.
        - Beginner (Easy/Simple): Part 1 bank (Questions 1 to 20).
        - Intermediate (Medium): Part 2 bank (Questions 21 to 40).
        - Advanced (Hard): Part 3 bank (Questions 41 to 60).
        For any role/language, this 3-tier curriculum is strictly enforced.
        """
        role_lower = (role or "").lower()
        diff_key = "Beginner" if difficulty in ["Beginner", "Easy", "Simple"] else (
            "Advanced" if difficulty in ["Advanced", "Hard"] else "Intermediate"
        )

        # ─── 1. PYTHON ROLES: Use Curated 60-Question Standard Bank ─────────
        if "python" in role_lower:
            bank = PYTHON_QUESTION_BANK.get(diff_key, PYTHON_QUESTION_BANK["Intermediate"])
            category_label = "Core Basics" if diff_key == "Beginner" else ("Core OOPs" if diff_key == "Intermediate" else "Advanced Internals")

            # Question 1 is ALWAYS Introduce yourself
            questions = [
                {"id": 1, "question": "Introduce yourself.", "category": "Introduction"}
            ]

            pool = bank[1:]  # The 19 specific topic questions for this tier
            recent = [q.strip().lower() for q in (exclude_questions or []) if q and q.strip()]

            # Prioritize questions not recently asked by this user
            fresh_pool = [q for q in pool if q.strip().lower() not in recent]
            if len(fresh_pool) < (count - 1):
                candidates = fresh_pool + [q for q in pool if q not in fresh_pool]
            else:
                candidates = fresh_pool

            # Select remaining questions up to requested count
            remaining_needed = max(1, count - 1)
            selected = candidates[:remaining_needed]

            for idx, q_text in enumerate(selected):
                questions.append({
                    "id": idx + 2,
                    "question": q_text,
                    "category": category_label,
                })

            return {"questions": questions}

        # ─── 2. OTHER ROLES: Mirror the Exact 3-Tier Blueprint with Groq ─────
        exclude_block = ""
        if exclude_questions:
            recent_sample = [q.strip() for q in exclude_questions[-15:] if q and q.strip()]
            if recent_sample:
                formatted_excludes = "\n".join(f"- {q}" for q in recent_sample)
                exclude_block = f"\nIMPORTANT: Do NOT repeat any of these recently asked questions:\n{formatted_excludes}\n"

        if diff_key == "Beginner":
            tier_instructions = (
                "TIER: BEGINNER / EASY LEVEL (Questions 2 to 20 equivalent):\n"
                "- Questions MUST test Core Basics and syntax of the role/language "
                "(variables, data types, primitive vs complex types, equality checks, loops, condition branches, basic functions, input/output)."
            )
        elif diff_key == "Intermediate":
            tier_instructions = (
                "TIER: INTERMEDIATE / MEDIUM LEVEL (Questions 21 to 40 equivalent):\n"
                "- Questions MUST test Intermediate concepts & Object-Oriented Programming (OOP) "
                "(mutable vs immutable references, copy semantics, classes, objects, inheritance, polymorphism, method overriding, closures/lambdas, exception handling, module packaging)."
            )
        else:
            tier_instructions = (
                "TIER: ADVANCED / HARD LEVEL (Questions 41 to 60 equivalent):\n"
                "- Questions MUST test Advanced Internals, Concurrency & Performance "
                "(memory management / garbage collection, multithreading vs multiprocessing / async, decorators / metaprogramming, optimization, thread safety, streaming big datasets, memory debugging)."
            )

        system_prompt = (
            "You are a principal technical interviewer at a top technology company. "
            "You pride yourself on asking razor-sharp, realistic, ONE-LINE questions that test true practical understanding.\n"
            "CRITICAL MANDATORY RULES:\n"
            "1. EVERY QUESTION MUST BE EXACTLY ONE SINGLE LINE (a single, direct sentence of 10 to 18 words maximum).\n"
            "2. NEVER write multiple sentences, code blocks, or scenario paragraphs.\n"
            "3. Follow the requested difficulty tier instructions strictly.\n"
            "4. Respond with strictly valid JSON only."
        )

        questions_needed = max(1, count - 1)
        user_prompt = f"""
Generate {questions_needed} {diff_key} level technical interview questions for the role of "{role}".
{tier_instructions}
{exclude_block}

CRITICAL REQUIREMENT:
Every single question MUST be exactly 1 line ending with a question mark.

Return JSON with EXACTLY this structure:
{{
  "questions": [
    {{"question": "Short single-line question?", "category": "Technical"}}
  ]
}}
"""
        try:
            raw_res = self._chat(system_prompt, user_prompt, temperature=0.7)
            q_list = raw_res.get('questions', [])

            final_questions = [
                {"id": 1, "question": f"Introduce yourself and highlight your experience as a {role}.", "category": "Introduction"}
            ]

            for idx, item in enumerate(q_list[:questions_needed]):
                q_text = str(item.get('question', '')).strip()
                if '\n' in q_text:
                    q_text = q_text.split('\n')[0].strip()
                parts = re.split(r'(?<=[.?!])\s+', q_text)
                if len(parts) > 1 and len(parts[0]) >= 20:
                    q_text = parts[0].strip()
                if not q_text.endswith('?'):
                    q_text = q_text.rstrip('.! ') + '?'

                cat = item.get('category') or ("Core Basics" if diff_key == "Beginner" else ("Core OOPs" if diff_key == "Intermediate" else "Advanced Internals"))
                final_questions.append({
                    "id": idx + 2,
                    "question": q_text,
                    "category": cat
                })

            if len(final_questions) >= 2:
                return {"questions": final_questions}
        except Exception as e:
            logger.warning(f"Groq question generation failed, using structured fallback: {e}")

        return self._get_fallback_questions(role, diff_key, count)

    def _get_fallback_questions(self, role: str, difficulty: str = "Intermediate", count: int = 5) -> dict:
        """Structured 1-line fallback questions with Question 1 as introduction."""
        role_lower = (role or "").lower()
        diff_key = "Beginner" if difficulty in ["Beginner", "Easy", "Simple"] else (
            "Advanced" if difficulty in ["Advanced", "Hard"] else "Intermediate"
        )

        intro_q = {
            "id": 1,
            "question": f"Introduce yourself and highlight your experience as a {role}.",
            "category": "Introduction"
        }

        if "java" in role_lower:
            if diff_key == "Beginner":
                pool = [
                    {"question": "What is the difference between JDK, JRE, and JVM in Java architecture?", "category": "Core Basics"},
                    {"question": "What are primitive data types versus wrapper classes in Java?", "category": "Core Basics"},
                    {"question": "What is the difference between == and equals() in Java?", "category": "Core Basics"},
                    {"question": "How does a for-each loop differ from a traditional for loop in Java?", "category": "Core Basics"},
                    {"question": "What are the access modifiers in Java and their scopes?", "category": "Core Basics"},
                ]
            elif diff_key == "Intermediate":
                pool = [
                    {"question": "What is the difference between Method Overloading and Method Overriding in Java?", "category": "Core OOPs"},
                    {"question": "When would you prefer an Abstract Class over an Interface in Java?", "category": "Core OOPs"},
                    {"question": "Why are String objects immutable in Java and how does the String Constant Pool work?", "category": "Core OOPs"},
                    {"question": "What is the difference between checked and unchecked exceptions in Java?", "category": "Core OOPs"},
                    {"question": "What is the difference between shallow copy and deep copy in Java?", "category": "Core OOPs"},
                ]
            else:
                pool = [
                    {"question": "How does the Java Garbage Collector manage heap memory and detect unreferenced objects?", "category": "Advanced Internals"},
                    {"question": "What is the difference between synchronized blocks, ReentrantLock, and volatile variables in Java?", "category": "Advanced Internals"},
                    {"question": "How does the Java Memory Model guarantee thread visibility and instruction reordering prevention?", "category": "Advanced Internals"},
                    {"question": "How would you diagnose and resolve a Java heap OutOfMemoryError in production?", "category": "Advanced Internals"},
                ]
        elif any(k in role_lower for k in ["frontend", "react", "javascript"]):
            if diff_key == "Beginner":
                pool = [
                    {"question": "What is the difference between let, const, and var in JavaScript?", "category": "Core Basics"},
                    {"question": "What are the different primitive data types in JavaScript?", "category": "Core Basics"},
                    {"question": "What is the difference between == and === in JavaScript?", "category": "Core Basics"},
                    {"question": "What is an arrow function and how does it handle the this keyword?", "category": "Core Basics"},
                ]
            elif diff_key == "Intermediate":
                pool = [
                    {"question": "What are closures in JavaScript and how do they retain lexical scope?", "category": "Core OOPs"},
                    {"question": "How does JavaScript's Event Loop handle microtasks versus macrotasks?", "category": "Core OOPs"},
                    {"question": "How does React's Virtual DOM diffing algorithm optimize UI re-renders?", "category": "Component Architecture"},
                    {"question": "What is the difference between controlled and uncontrolled components in React?", "category": "Component Architecture"},
                ]
            else:
                pool = [
                    {"question": "How would you optimize a slow React application experiencing unnecessary re-renders?", "category": "Advanced Internals"},
                    {"question": "What are Web Workers and how do they enable multi-threading in JavaScript?", "category": "Advanced Internals"},
                    {"question": "How do JavaScript memory leaks occur and how do you trace them with browser DevTools?", "category": "Advanced Internals"},
                ]
        else:
            pool = [
                {"question": f"What are the foundational core principles of working as a professional {role}?", "category": "Core Basics"},
                {"question": "How do you apply Object-Oriented Principles like encapsulation and polymorphism in your code?", "category": "Core OOPs"},
                {"question": "How do you design systems with high testability, fault tolerance, and clear error handling?", "category": "Architecture"},
                {"question": "How do you systematically debug and isolate an unexpected production bottleneck?", "category": "Advanced Internals"},
            ]

        questions = [intro_q]
        for idx, item in enumerate(pool[:max(1, count - 1)]):
            questions.append({
                "id": idx + 2,
                "question": item["question"],
                "category": item["category"]
            })

        return {"questions": questions}

    # ---------------------------------------------------------------
    # Module 4: AI Interview - Answer Evaluation
    # Text mode sends typed answer directly.
    # Audio mode sends Web-Speech-API transcript.
    # Video mode sends MediaRecorder transcript (post speech-to-text).
    # => Same method, same API, three modes.
    # ---------------------------------------------------------------
    def evaluate_answer(self, question: str, answer: str, role: str,
                         difficulty: str = "Intermediate") -> dict:
        """Evaluate a single interview answer across multiple criteria."""
        system_prompt = (
            "You are an expert technical interview evaluator. Always respond with "
            "valid JSON only, no extra text. Never output unescaped double quotes inside string values; use single quotes."
        )
        intro_guidance = ""
        q_lower = (question or "").lower()
        if "introduce yourself" in q_lower or "tell me about yourself" in q_lower:
            intro_guidance = (
                "\nSPECIAL EVALUATION CRITERIA FOR INTRODUCTION QUESTION:\n"
                "Evaluate the candidate on how clearly and professionally they introduce themselves, "
                "their communication skills, confidence, structure of their introduction, "
                "and relevance of the experience/skills they highlighted.\n"
            )

        user_prompt = f"""
Role: {role}
Difficulty: {difficulty}
Question: {question}
Candidate's Answer: {answer}
{intro_guidance}
Evaluate the answer and return JSON with EXACTLY this structure:
{{
  "technical_knowledge": <integer 0-100>,
  "communication": <integer 0-100>,
  "grammar": <integer 0-100>,
  "confidence": <integer 0-100>,
  "problem_solving": <integer 0-100>,
  "overall_score": <integer 0-100>,
  "strengths": ["point1", "point2"],
  "improvements": ["point1", "point2"],
  "ideal_answer_summary": "short 2-3 line summary of a strong answer"
}}
"""
        return self._chat(system_prompt, user_prompt)

    def generate_final_report_summary(self, all_evaluations: list, role: str) -> dict:
        """After all questions answered, summarize the full interview into a final report."""
        system_prompt = (
            "You are an AI career coach summarizing an interview performance. "
            "Always respond with valid JSON only. Never output unescaped double quotes inside string values; use single quotes."
        )
        user_prompt = f"""
Role: {role}
Per-question evaluations: {json.dumps(all_evaluations)}

Return JSON with EXACTLY this structure:
{{
  "overall_score": <integer 0-100>,
  "technical_score": <integer 0-100>,
  "communication_score": <integer 0-100>,
  "confidence_trend": "improving | declining | steady",
  "ai_suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "verdict": "short one-line hiring verdict"
}}
"""
        return self._chat(system_prompt, user_prompt)


# Singleton instance -- import this everywhere, never instantiate GroqService() again
groq_service = GroqService()
