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

# ─── CURATED 60-QUESTION HR & BEHAVIORAL INTERVIEW BANK ──────────────────────
HR_QUESTION_BANK = {
    "Beginner": [
        "Introduce yourself and walk me through your background.",
        "Why do you want to join our company, and what excites you about this role?",
        "What are your top three professional and personal strengths?",
        "What is your biggest weakness, and what steps are you taking to improve it?",
        "Where do you see yourself professionally in the next 3 to 5 years?",
        "Why should we hire you over other candidates applying for this position?",
        "Tell me about a college or personal project you are most proud of.",
        "How do you organize your tasks when you have multiple competing deadlines?",
        "Tell me about a time you made a mistake and how you rectified it.",
        "How do you handle constructive criticism or feedback from a senior or peer?",
        "Do you prefer working individually or collaborating in a cross-functional team?",
        "What motivates you to perform at your best every single day?",
        "Tell me about a time you had to learn a new tool or technology under short notice.",
        "How do you stay calm and focused when working under tight pressure?",
        "What are your salary expectations and your expected notice period or availability?",
        "Are you willing to relocate or work in hybrid or flexible shifts if required?",
        "What kind of company culture brings out your best productivity and creativity?",
        "Tell me about a situation where you helped a struggling classmate or colleague.",
        "What hobbies or activities do you pursue outside of technical work?",
        "Do you have any questions for me as the HR recruiter about our company culture?",
    ],
    "Intermediate": [
        "Introduce yourself and highlight your most impactful career achievements.",
        "Tell me about a time you had a professional disagreement with a manager or coworker. How did you resolve it?",
        "Describe a situation where a critical project deadline was at risk. What steps did you take?",
        "Tell me about a time you had to push back on unrealistic requirements from a stakeholder.",
        "How do you maintain code quality and avoid burnout during high-velocity sprint cycles?",
        "Tell me about a time you received difficult or critical feedback. How did you adapt your approach?",
        "Describe an instance where you took complete initiative to solve an unassigned problem.",
        "Tell me about a time a project failed or fell short of expectations. What was your retrospective takeaway?",
        "How do you navigate ambiguous requirements when building a product feature with minimal specs?",
        "Tell me about an experience mentoring a junior engineer or onboarding a new teammate.",
        "How do you manage cross-team dependencies when external teams delay your deliverables?",
        "Describe a scenario where you made a conscious trade-off between technical perfection and business deadlines.",
        "What is your philosophy on work-life balance and sustaining long-term engineering momentum?",
        "Tell me about a time you advocated for better team collaboration, inclusion, or process empathy.",
        "What factors led you to seek this new opportunity and move on from your current role?",
        "How do you communicate complex technical decisions to non-technical stakeholders effectively?",
        "Describe a challenging client or stakeholder interaction and how you de-escalated the situation.",
        "What was the most difficult architectural or product decision you defended to team leadership?",
        "How do you assess whether a company's organizational culture and values align with your own?",
        "What specific career growth or skill expansion do you expect to achieve in this role?",
    ],
    "Advanced": [
        "Walk me through your engineering leadership philosophy and how you build resilient teams.",
        "Tell me about a time you resolved a deep interpersonal or cultural conflict within an engineering team.",
        "How do you manage executive pressure and stakeholder transparency during catastrophic production outages?",
        "Describe a situation where you spearheaded an organizational pivot that met significant internal resistance.",
        "How do you nurture high-potential engineers, conduct impactful 1-on-1s, and retain top talent?",
        "Tell me about a difficult decision to reassign or separate an underperforming team member.",
        "How do you strategically balance technical debt reduction with aggressive business revenue goals?",
        "Describe an instance where you championed long-term architectural stability over short-term feature demands.",
        "How do you foster psychological safety and an open blameless post-mortem culture under high pressure?",
        "Tell me about a time you influenced executive leadership or cross-functional directors without formal authority.",
        "What is your framework for managing technical debt and code governance across distributed teams?",
        "Describe how you scaled an engineering organization through hypergrowth while maintaining culture.",
        "How do you balance engineering autonomy and innovation with enterprise compliance and security standards?",
        "Tell me about a high-budget crisis or missed deliverable and the governance steps you took to prevent recurrence.",
        "How do you design career progression ladders and ensure fair, unbiased performance appraisals?",
        "Describe a time you transformed a fragmented or siloed team dynamic into an aligned collaborative unit.",
        "How do you evaluate make-versus-buy trade-offs when choosing core enterprise platforms?",
        "What long-term impact or cultural legacy do you strive to leave behind in your leadership roles?",
        "How do you maintain team morale and steady execution during company restructuring or market volatility?",
        "What strategic questions do you have for executive leadership regarding our company trajectory?",
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

        # ─── 2. HR & BEHAVIORAL ROLES: AI-Powered Dynamic Generation via Groq ───
        is_hr = any(k in role_lower for k in ["hr", "behavioral", "behavioural", "culture", "fit", "leadership", "placement"])
        if is_hr:
            if diff_key == "Beginner":
                hr_tier_instructions = (
                    "TIER: FRESHER / CAMPUS PLACEMENT HR ROUND\n"
                    "- Generate questions about: candidate's background, academic/college projects, personal strengths & weaknesses, "
                    "motivation to join our organization, handling constructive criticism from professors/peers, learning new tools quickly, "
                    "working effectively in teams, adaptability, and career goals for the next 2-3 years."
                )
            elif diff_key == "Intermediate":
                hr_tier_instructions = (
                    "TIER: STAR METHOD SITUATIONAL & BEHAVIORAL ROUND\n"
                    "- Generate scenario-based behavioral questions strictly testing the STAR method (Situation, Task, Action, Result).\n"
                    "- Cover: resolving professional disagreements with peers or managers, handling urgent shifting deadlines, "
                    "learning from a major project setback, taking proactive initiative on unassigned problems, managing client expectations, "
                    "and pushing back diplomatically on unrealistic requirements."
                )
            else:
                hr_tier_instructions = (
                    "TIER: LEADERSHIP, ETHICS & CULTURAL VALUES ROUND\n"
                    "- Generate high-level questions for leadership and culture fit.\n"
                    "- Cover: engineering leadership philosophy, building psychological safety, resolving interpersonal team friction, "
                    "making tough decisions regarding underperformance, managing executive pressure during outages, "
                    "and balancing business velocity with architectural integrity."
                )

            exclude_block = ""
            if exclude_questions:
                recent_sample = [q.strip() for q in exclude_questions[-15:] if q and q.strip()]
                if recent_sample:
                    formatted_excludes = "\n".join(f"- {q}" for q in recent_sample)
                    exclude_block = f"\nIMPORTANT: Do NOT repeat any of these recently asked questions:\n{formatted_excludes}\n"

            system_prompt = (
                "You are an expert HR Director, VP of People, and seasoned Talent Acquisition Leader at a top global tech firm. "
                "You ask insightful, conversational, realistic, ONE-LINE HR interview questions.\n"
                "CRITICAL MANDATORY RULES:\n"
                "1. EVERY QUESTION MUST BE EXACTLY ONE SINGLE SENTENCE (12 to 24 words maximum).\n"
                "2. Questions must be strictly HR, behavioral, situational, or culture fit. NEVER ask coding or technical syntax questions.\n"
                "3. Follow the requested HR tier instructions strictly.\n"
                "4. Respond with strictly valid JSON only."
            )

            questions_needed = max(1, count - 1)
            user_prompt = f"""
Generate {questions_needed} {diff_key} level HR & Behavioral interview questions for the role: "{role}".
{hr_tier_instructions}
{exclude_block}

CRITICAL REQUIREMENT:
Every question MUST be a single line ending with a question mark.

Return JSON with EXACTLY this structure:
{{
  "questions": [
    {{"question": "Short single-line HR question?", "category": "HR & Behavioral"}}
  ]
}}
"""
            category_label = (
                "Core HR & Culture" if diff_key == "Beginner" else
                ("Behavioral & STAR Method" if diff_key == "Intermediate" else "Leadership & Conflict")
            )

            try:
                raw_res = self._chat(system_prompt, user_prompt, temperature=0.7)
                q_list = raw_res.get('questions', [])

                intro_q = "Welcome! Please introduce yourself, walk me through your background, and tell me what excites you about this role."
                final_questions = [
                    {"id": 1, "question": intro_q, "category": "Introduction"}
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

                    cat = item.get('category') or category_label
                    final_questions.append({
                        "id": idx + 2,
                        "question": q_text,
                        "category": cat
                    })

                if len(final_questions) >= 2:
                    return {"questions": final_questions}
            except Exception as e:
                logger.warning(f"Groq HR question generation failed, using structured HR bank fallback: {e}")

            # Fallback to curated HR bank if Groq fails
            bank = HR_QUESTION_BANK.get(diff_key, HR_QUESTION_BANK["Intermediate"])
            questions = [
                {"id": 1, "question": "Welcome! Please introduce yourself, walk me through your background, and tell me what excites you about this role.", "category": "Introduction"}
            ]
            pool = bank[1:]
            recent = [q.strip().lower() for q in (exclude_questions or []) if q and q.strip()]
            fresh_pool = [q for q in pool if q.strip().lower() not in recent]
            candidates = fresh_pool if len(fresh_pool) >= (count - 1) else (fresh_pool + [q for q in pool if q not in fresh_pool])
            selected = candidates[:max(1, count - 1)]
            for idx, q_text in enumerate(selected):
                questions.append({
                    "id": idx + 2,
                    "question": q_text,
                    "category": category_label,
                })
            return {"questions": questions}

        # ─── 3. OTHER ROLES: Mirror the Exact 3-Tier Blueprint with Groq ─────
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
                {"id": 1, "question": "Introduce yourself.", "category": "Introduction"}
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
            "question": "Introduce yourself.",
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
        elif any(k in role_lower for k in ["hr", "behavioral", "behavioural", "culture", "fit"]):
            intro_q["question"] = "Introduce yourself and walk me through your background."
            if diff_key == "Beginner":
                pool = [
                    {"question": "Why do you want to join our company, and what excites you about this role?", "category": "Core HR & Culture"},
                    {"question": "What are your top three professional strengths and one weakness you are actively improving?", "category": "Core HR & Culture"},
                    {"question": "Where do you see yourself professionally in the next 3 to 5 years?", "category": "Core HR & Culture"},
                    {"question": "How do you organize your tasks when you have multiple competing deadlines?", "category": "Core HR & Culture"},
                ]
            elif diff_key == "Intermediate":
                pool = [
                    {"question": "Tell me about a time you had a professional disagreement with a coworker. How was it resolved?", "category": "Behavioral & STAR Method"},
                    {"question": "Describe a situation where a critical project deadline was at risk. What steps did you take?", "category": "Behavioral & STAR Method"},
                    {"question": "Tell me about a time you received difficult or critical feedback. How did you adapt?", "category": "Behavioral & STAR Method"},
                    {"question": "Describe an instance where you made a conscious trade-off between technical perfection and business deadlines.", "category": "Behavioral & STAR Method"},
                ]
            else:
                pool = [
                    {"question": "Walk me through your engineering leadership philosophy and how you build resilient teams.", "category": "Leadership & Conflict"},
                    {"question": "Tell me about a time you resolved a deep interpersonal conflict within an engineering team.", "category": "Leadership & Conflict"},
                    {"question": "How do you manage executive pressure and stakeholder transparency during critical production incidents?", "category": "Leadership & Conflict"},
                    {"question": "How do you strategically balance technical debt reduction with aggressive business revenue goals?", "category": "Leadership & Conflict"},
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
        is_hr = any(k in (role or '').lower() for k in ['hr', 'behavioral', 'behavioural', 'culture', 'fit'])
        if is_hr:
            system_prompt = (
                "You are an expert HR Director and Behavioral Interview evaluator. "
                "Always evaluate candidate responses using the STAR method (Situation, Task, Action, Result), "
                "communication clarity, self-awareness, cultural alignment, and emotional intelligence. "
                "Always respond with valid JSON only, no extra text. "
                "Never output unescaped double quotes inside string values; use single quotes."
            )
        else:
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
        elif is_hr:
            intro_guidance = (
                "\nSPECIAL EVALUATION CRITERIA FOR HR & BEHAVIORAL ROUND:\n"
                "- Evaluate communication clarity, active listening, and tone.\n"
                "- Evaluate whether they used the STAR method (Situation, Task, Action, Result).\n"
                "- Evaluate teamwork, honesty, ownership, conflict management, and situational maturity.\n"
                "- In strengths, highlight what made their personal or behavioral answer stand out.\n"
                "- In improvements, give practical advice on how to structure behavioral responses.\n"
                "- In ideal_answer_summary, provide a concise 2-3 line model response demonstrating the STAR framework.\n"
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
