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
        Generate diverse, 1-line non-repeating interview questions.
        Structured curriculum progression:
        - First 2 questions (Q1, Q2): Core fundamentals & basic language concepts.
        - Subsequent questions (Q3, Q4, Q5...): Object-Oriented Programming (OOPs), architecture & practical design.
        """
        exclude_block = ""
        if exclude_questions:
            recent_sample = [q.strip() for q in exclude_questions[-15:] if q and q.strip()]
            if recent_sample:
                formatted_excludes = "\n".join(f"- {q}" for q in recent_sample)
                exclude_block = f"\nIMPORTANT: Do NOT repeat or rephrase any of these recently asked questions:\n{formatted_excludes}\n"

        role_lower = (role or "").lower()

        # Specific curriculum guidelines based on role
        if "python" in role_lower:
            curriculum_guide = """
STRUCTURE AND TOPIC BLUEPRINT:
- Question 1 and Question 2: MUST test Core Basic Python fundamentals (such as mutable vs immutable types, list/tuple/dict differences, generators, memory management, or basic syntax).
- Question 3, Question 4, Question 5 (and onwards): MUST test Object-Oriented Programming (OOP) in Python (such as Classes, Inheritance, Polymorphism, Encapsulation, dunder methods like __init__ and __str__, @classmethod vs @staticmethod, or Abstract Base Classes).
"""
        elif "java" in role_lower:
            curriculum_guide = """
STRUCTURE AND TOPIC BLUEPRINT:
- Question 1 and Question 2: MUST test Core Java fundamentals (such as JVM/JRE/JDK differences, primitive types vs wrapper classes, string immutability, or garbage collection).
- Question 3, Question 4, Question 5 (and onwards): MUST test Object-Oriented Programming (OOP) in Java (such as Inheritance vs Composition, Method Overloading vs Overriding, Abstract classes vs Interfaces, Encapsulation, or Polymorphism).
"""
        elif any(k in role_lower for k in ["frontend", "react", "javascript", "js"]):
            curriculum_guide = """
STRUCTURE AND TOPIC BLUEPRINT:
- Question 1 and Question 2: MUST test Core JavaScript fundamentals (such as Event Loop, closures, let/const/var scoping, or Promises/async-await).
- Question 3, Question 4, Question 5 (and onwards): MUST test Component Architecture and React/OOP design patterns (such as Component lifecycle, hooks like useEffect/useMemo, state management, or Virtual DOM).
"""
        elif any(k in role_lower for k in ["data", "machine learning", "ai", "ml"]):
            curriculum_guide = """
STRUCTURE AND TOPIC BLUEPRINT:
- Question 1 and Question 2: MUST test Core Python data structures & manipulation (such as Pandas DataFrame vs Series, NumPy array vectorization, or handling missing data).
- Question 3, Question 4, Question 5 (and onwards): MUST test Machine Learning algorithms, OOP model design & pipelines (such as Supervised vs Unsupervised models, overfitting prevention, evaluation metrics, or model deployment).
"""
        elif any(k in role_lower for k in ["sql", "database"]):
            curriculum_guide = """
STRUCTURE AND TOPIC BLUEPRINT:
- Question 1 and Question 2: MUST test SQL fundamentals (such as JOIN types, GROUP BY vs HAVING, or Aggregate functions).
- Question 3, Question 4, Question 5 (and onwards): MUST test Database Architecture & Indexing (such as Clustered vs Non-clustered Indexes, ACID properties, Normalization, or Window functions).
"""
        else:
            curriculum_guide = """
STRUCTURE AND TOPIC BLUEPRINT:
- Question 1 and Question 2: MUST test Core foundational fundamentals of the role.
- Question 3, Question 4, Question 5 (and onwards): MUST test Object-Oriented Programming (OOP), architecture, design patterns, and practical problem-solving.
"""

        system_prompt = (
            "You are a principal technical interviewer at a top technology company. "
            "You pride yourself on asking razor-sharp, realistic, ONE-LINE questions that test true practical understanding.\n"
            "CRITICAL MANDATORY RULES:\n"
            "1. EVERY QUESTION MUST BE EXACTLY ONE SINGLE LINE (a single, clear, direct sentence of 10 to 18 words maximum).\n"
            "2. NEVER write multiple sentences, background scenario paragraphs, or follow-up sub-questions.\n"
            "3. Follow the requested topic progression strictly (First 2 questions = Core Basics; Subsequent questions = OOPs & Architecture).\n"
            "4. Respond with strictly valid JSON only. Never use unescaped double quotes inside string values; use single quotes instead."
        )

        user_prompt = f"""
Generate {count} {difficulty} level {question_type} interview questions for the role of "{role}".
{curriculum_guide}
{exclude_block}
CRITICAL REQUIREMENT:
Every single question MUST be exactly 1 line (one short, direct, punchy sentence ending with a question mark).

Return JSON with EXACTLY this structure:
{{
  "questions": [
    {{"id": 1, "question": "Short single-line question?", "category": "Core Basics"}},
    {{"id": 2, "question": "Short single-line question?", "category": "Core Basics"}},
    {{"id": 3, "question": "Short single-line question?", "category": "OOPs"}},
    {{"id": 4, "question": "Short single-line question?", "category": "OOPs"}},
    {{"id": 5, "question": "Short single-line question?", "category": "OOPs"}}
  ]
}}
"""
        try:
            raw_res = self._chat(system_prompt, user_prompt, temperature=0.7)
            q_list = raw_res.get('questions', [])
            cleaned_questions = []

            for idx, item in enumerate(q_list):
                q_text = str(item.get('question', '')).strip()
                # Post-processing: Strictly guarantee 1 single line
                if '\n' in q_text:
                    q_text = q_text.split('\n')[0].strip()
                # Truncate if multiple sentences returned
                parts = re.split(r'(?<=[.?!])\s+', q_text)
                if len(parts) > 1 and len(parts[0]) >= 20:
                    q_text = parts[0].strip()
                if not q_text.endswith('?'):
                    q_text = q_text.rstrip('.! ') + '?'

                cat = item.get('category') or ('Core Basics' if idx < 2 else 'OOPs & Architecture')
                cleaned_questions.append({
                    "id": idx + 1,
                    "question": q_text,
                    "category": cat
                })

            if cleaned_questions:
                return {"questions": cleaned_questions}
        except Exception as e:
            logger.warning(f"Groq question generation failed, using structured 1-line fallback: {e}")

        # High-quality 1-line fallback questions following the exact 2-basic + 3-OOPs blueprint
        return self._get_fallback_questions(role, count)

    def _get_fallback_questions(self, role: str, count: int = 5) -> dict:
        """Structured 1-line fallback questions with 2-basic + 3-OOPs blueprint."""
        role_lower = (role or "").lower()

        if "python" in role_lower:
            pool = [
                {"question": "What is the key difference between mutable and immutable data types in Python?", "category": "Core Basics"},
                {"question": "How does Python handle memory management and automatic garbage collection internally?", "category": "Core Basics"},
                {"question": "What is the difference between @classmethod and @staticmethod in Python classes?", "category": "OOPs"},
                {"question": "How does multiple inheritance work in Python and how does MRO resolve method calls?", "category": "OOPs"},
                {"question": "How do dunder methods like __init__ and __str__ implement encapsulation and representation in Python?", "category": "OOPs"},
                {"question": "How can you implement abstract classes and enforce method overriding using Python's abc module?", "category": "OOPs"},
                {"question": "What is the difference between composition and inheritance in Python object design?", "category": "OOPs"},
                {"question": "How does polymorphism allow different Python classes to share the same interface?", "category": "OOPs"},
                {"question": "How do property decorators enable data encapsulation and getter/setter logic in Python?", "category": "OOPs"},
                {"question": "What is the difference between shallow copy and deep copy when working with custom objects in Python?", "category": "OOPs"},
            ]
        elif "java" in role_lower:
            pool = [
                {"question": "What is the difference between JDK, JRE, and JVM in Java architecture?", "category": "Core Basics"},
                {"question": "Why are String objects immutable in Java and how does the String Constant Pool work?", "category": "Core Basics"},
                {"question": "What is the difference between Method Overloading and Method Overriding in Java OOP?", "category": "OOPs"},
                {"question": "When would you prefer an Abstract Class over an Interface in Java object design?", "category": "OOPs"},
                {"question": "How does Java enforce encapsulation using access modifiers and getter/setter methods?", "category": "OOPs"},
                {"question": "How does Runtime Polymorphism work using dynamic method dispatch in Java?", "category": "OOPs"},
                {"question": "What is the difference between composition and inheritance in Java software architecture?", "category": "OOPs"},
                {"question": "How does the final keyword impact class inheritance, methods, and member variables?", "category": "OOPs"},
            ]
        elif any(k in role_lower for k in ["frontend", "react", "javascript"]):
            pool = [
                {"question": "What is the difference between let, const, and var regarding scoping and hoisting in JavaScript?", "category": "Core Basics"},
                {"question": "How does JavaScript's Event Loop handle microtasks like Promises versus macrotasks like setTimeout?", "category": "Core Basics"},
                {"question": "How does React's Virtual DOM diffing algorithm optimize UI re-renders?", "category": "Component Architecture"},
                {"question": "What is the difference between useEffect and useLayoutEffect in React component lifecycle?", "category": "Component Architecture"},
                {"question": "How do custom React hooks promote reusable stateful logic and modular design?", "category": "Component Architecture"},
                {"question": "What is the difference between controlled and uncontrolled components in React forms?", "category": "Component Architecture"},
            ]
        else:
            pool = [
                {"question": f"What are the foundational core principles of working as a professional {role}?", "category": "Core Basics"},
                {"question": "How do you systematically debug and isolate an unexpected production performance bottleneck?", "category": "Core Basics"},
                {"question": "How do you apply Object-Oriented Principles like encapsulation and polymorphism in your code?", "category": "OOPs"},
                {"question": "What software design pattern do you frequently utilize to keep code modular and decoupled?", "category": "OOPs & Architecture"},
                {"question": "How do you design systems with high testability, fault tolerance, and clear error handling?", "category": "Architecture"},
            ]

        selected = pool[:count]
        return {
            "questions": [
                {"id": idx + 1, "question": item["question"], "category": item["category"]}
                for idx, item in enumerate(selected)
            ]
        }

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
        user_prompt = f"""
Role: {role}
Difficulty: {difficulty}
Question: {question}
Candidate's Answer: {answer}

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
