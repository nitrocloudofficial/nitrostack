import json
import logging
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are StudyBuddy AI, an intelligent, empathetic, and highly effective personal AI tutor. Your mission is to help students master complex subjects through personalized explanations, active learning, step-by-step guidance, and interactive quizzes. Adapt your teaching style based on the student's exam target and skill level. Be encouraging, clear, structured, and accurate. When reference context from uploaded documents is provided, cite relevant sections accurately."""


class AIService:
    """Service wrapping OpenAI / Gemini API calls with StudyBuddy system instructions."""

    def __init__(self):
        self.openai_api_key = settings.OPENAI_API_KEY
        self.google_api_key = settings.GOOGLE_API_KEY
        self._openai_client = None

        if self.openai_api_key:
            try:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(api_key=self.openai_api_key)
            except ImportError:
                logger.warning("openai package not installed. AsyncOpenAI client unavailable.")

    async def generate_response(
        self,
        user_message: str,
        context: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        exam_target: Optional[str] = None
    ) -> str:
        """
        Generate a text response from the AI tutor.
        
        Args:
            user_message: The user's query or prompt.
            context: Retrieved document chunks context for RAG.
            history: Conversation history list of {"role": "user"|"assistant", "content": "..."}.
            exam_target: Target examination (e.g., "SAT", "MCAT", "GRE", "AP Physics").
            
        Returns:
            String response from the AI tutor.
        """
        messages = self._build_messages(user_message, context, history, exam_target)

        if self._openai_client:
            try:
                response = await self._openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1500
                )
                return response.choices[0].message.content or ""
            except Exception as e:
                logger.error(f"OpenAI API call failed: {e}")
                return self._fallback_response(user_message, context)

        return self._fallback_response(user_message, context)

    async def generate_stream(
        self,
        user_message: str,
        context: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        exam_target: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream response tokens from the AI tutor for WebSocket delivery.
        
        Args:
            user_message: User message.
            context: RAG context.
            history: Conversation history.
            exam_target: Target exam.
            
        Yields:
            Token chunks as text strings.
        """
        messages = self._build_messages(user_message, context, history, exam_target)

        if self._openai_client:
            try:
                stream = await self._openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1500,
                    stream=True
                )
                async for chunk in stream:
                    content = chunk.choices[0].delta.content or ""
                    if content:
                        yield content
                return
            except Exception as e:
                logger.error(f"OpenAI streaming failed: {e}")

        # Fallback simulated streaming response
        fallback_text = self._fallback_response(user_message, context)
        words = fallback_text.split(" ")
        for word in words:
            yield word + " "

    async def generate_quiz(
        self,
        context: str,
        num_questions: int = 5,
        difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """
        Generate a structured JSON quiz based on context documents.
        
        Args:
            context: Document text context.
            num_questions: Number of questions to generate.
            difficulty: Difficulty level ('easy', 'medium', 'hard').
            
        Returns:
            Dict containing title and questions array with options, correct_index, explanation.
        """
        prompt = f"""
Generates a quiz based on the following content.
Target Number of Questions: {num_questions}
Difficulty: {difficulty}

SOURCE CONTENT:
{context}

Return ONLY valid JSON matching this structure:
{{
  "title": "Quiz Title",
  "questions": [
    {{
      "id": 1,
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Detailed explanation of why Option A is correct."
    }}
  ]
}}
"""

        messages = [
            {"role": "system", "content": "You are a quiz generation expert. Respond only with valid JSON."},
            {"role": "user", "content": prompt}
        ]

        if self._openai_client:
            try:
                response = await self._openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=0.3,
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content or "{}"
                return json.loads(content)
            except Exception as e:
                logger.error(f"Failed to generate quiz via OpenAI: {e}")

        # Fallback quiz structure if API key missing or error
        return {
            "title": f"StudyBuddy {difficulty.title()} Quiz",
            "questions": [
                {
                    "id": i + 1,
                    "question": f"Sample Question {i + 1} based on study material?",
                    "options": [
                        "Primary core concept",
                        "Alternative explanation",
                        "Common misconception",
                        "Unrelated choice"
                    ],
                    "correct_index": 0,
                    "explanation": "Option A is correct according to the study material provided."
                }
                for i in range(min(num_questions, 5))
            ]
        }

    def _build_messages(
        self,
        user_message: str,
        context: Optional[str],
        history: Optional[List[Dict[str, str]]],
        exam_target: Optional[str]
    ) -> List[Dict[str, str]]:
        """Construct prompt message list with system prompt and context."""
        sys_prompt = SYSTEM_PROMPT
        if exam_target:
            sys_prompt += f"\n\nThe student is specifically preparing for: {exam_target}."

        messages = [{"role": "system", "content": sys_prompt}]

        if history:
            for item in history:
                role = item.get("role", "user")
                content = item.get("content", "")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": content})

        user_content = user_message
        if context:
            user_content = f"CONTEXT FROM STUDY MATERIALS:\n{context}\n\nSTUDENT QUESTION:\n{user_message}"

        messages.append({"role": "user", "content": user_content})
        return messages

    def _fallback_response(self, user_message: str, context: Optional[str]) -> str:
        """Provide a helpful fallback response if AI API key is not configured."""
        res = f"Hello! I am StudyBuddy AI. I received your question: '{user_message}'."
        if context:
            res += f"\n\nI reviewed your uploaded documents. Here is a summary of relevant information found in your study notes:\n{context[:300]}..."
        else:
            res += "\n\nFeel free to upload your study documents or ask me any questions about your coursework!"
        return res
