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
        """Generate diverse, non-repeating interview questions for a given role + difficulty."""
        exclude_block = ""
        if exclude_questions:
            recent_sample = [q.strip() for q in exclude_questions[-15:] if q and q.strip()]
            if recent_sample:
                formatted_excludes = "\n".join(f"- {q}" for q in recent_sample)
                exclude_block = f"\nIMPORTANT: Do NOT repeat or slightly rephrase any of these recently asked questions:\n{formatted_excludes}\n"

        topic_angles = [
            "Practical real-world debugging & edge cases",
            "Performance optimization, caching & scaling challenges",
            "Architectural choices, best practices & trade-offs",
            "Concurrency, async programming & API integration",
            "Database querying, data structures & memory management",
            "System reliability, failure handling & security basics",
        ]
        import random
        selected_focus = random.sample(topic_angles, k=min(3, len(topic_angles)))
        focus_str = ", ".join(selected_focus)

        system_prompt = (
            "You are a principal technical interviewer at a top technology company. "
            "You pride yourself on asking fresh, realistic, varied questions that test true practical understanding, "
            "not generic textbook definitions. Always respond with valid JSON only. "
            "CRITICAL: Never output unescaped double quotes inside JSON string values. Use single quotes instead."
        )
        user_prompt = f"""
Generate {count} {difficulty} level {question_type} interview questions for the role
of "{role}".

Focus areas for this session: {focus_str}.
Ensure each question explores a distinct concept with varied real-world phrasing.
{exclude_block}
Return JSON with EXACTLY this structure:
{{
  "questions": [
    {{"id": 1, "question": "...", "category": "..."}}
  ]
}}
"""
        return self._chat(system_prompt, user_prompt, temperature=0.85)

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
