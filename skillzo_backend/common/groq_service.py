"""
common/groq_service.py

SINGLE shared Groq API wrapper.
Har module (Resume Analysis, Text Interview, Audio Interview, Video Interview)
isi ek class ko import karke use karega -- alag alag Groq client kahin nahi banega.

Usage:
    from common.groq_service import groq_service

    result = groq_service.generate_questions(role="Python Developer", difficulty="Beginner")
    evaluation = groq_service.evaluate_answer(question="...", answer="...", role="Python Developer")
    resume_data = groq_service.analyze_resume(resume_text="...")
"""
import json
import logging
from groq import Groq
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

    def _chat(self, system_prompt: str, user_prompt: str, json_mode: bool = True) -> dict:
        """Core call shared by every method below."""
        try:
            kwargs = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.4,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content

            if json_mode:
                return json.loads(content)
            return {"text": content}

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
            "reviewer. Always respond with valid JSON only, no extra text."
        )
        user_prompt = f"""
Analyze this resume and return JSON with EXACTLY this structure:
{{
  "extracted_skills": ["skill1", "skill2", ...],
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
    def generate_questions(self, role: str, difficulty: str, count: int = 5,
                            question_type: str = "technical") -> dict:
        """Generate interview questions for a given role + difficulty."""
        system_prompt = (
            "You are a senior technical interviewer. Always respond with valid JSON only."
        )
        user_prompt = f"""
Generate {count} {difficulty} level {question_type} interview questions for the role
of "{role}". Return JSON with EXACTLY this structure:
{{
  "questions": [
    {{"id": 1, "question": "...", "category": "..."}},
    ...
  ]
}}
"""
        return self._chat(system_prompt, user_prompt)

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
            "valid JSON only, no extra text."
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
            "Always respond with valid JSON only."
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
