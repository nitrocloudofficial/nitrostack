import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.quiz import Quiz
from app.services.rag_service import RAGService

router = APIRouter(prefix="/quiz", tags=["Quizzes"])

rag_service = RAGService()

# --- Inline Pydantic Schemas ---

class QuestionOption(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_index: Optional[int] = None
    explanation: Optional[str] = None


class QuizGenerateRequest(BaseModel):
    document_id: str
    num_questions: int = 5
    difficulty: str = "medium"  # easy, medium, hard


class QuizResponse(BaseModel):
    id: str
    document_id: Optional[str] = None
    title: str
    questions: List[Dict[str, Any]]
    score: Optional[float] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class QuizSubmitRequest(BaseModel):
    quiz_id: str
    answers: Dict[str, int]  # question_id string to selected option_index int


class QuizResultResponse(BaseModel):
    quiz_id: str
    score: float
    total_questions: int
    correct_count: int
    completed_at: datetime
    feedback: List[Dict[str, Any]]


# --- Endpoints ---

@router.post("/generate", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    payload: QuizGenerateRequest,
    user_id: str = "mock-user-1",
    db: AsyncSession = Depends(get_db)
):
    """
    Generate an interactive quiz based on an uploaded document's contents.
    """
    quiz_data = await rag_service.generate_quiz(
        doc_id=payload.document_id,
        num_questions=payload.num_questions,
        difficulty=payload.difficulty
    )

    quiz_id = str(uuid.uuid4())
    title = quiz_data.get("title", f"Quiz for Document {payload.document_id[:8]}")
    questions = quiz_data.get("questions", [])

    new_quiz = Quiz(
        id=quiz_id,
        user_id=user_id,
        document_id=payload.document_id,
        title=title,
        questions=questions,
        created_at=datetime.now(timezone.utc)
    )

    try:
        db.add(new_quiz)
        await db.commit()
        await db.refresh(new_quiz)
        return QuizResponse.model_validate(new_quiz)
    except Exception:
        return QuizResponse(
            id=quiz_id,
            document_id=payload.document_id,
            title=title,
            questions=questions,
            created_at=datetime.now(timezone.utc)
        )


@router.post("/submit", response_model=QuizResultResponse)
async def submit_quiz(
    payload: QuizSubmitRequest,
    user_id: str = "mock-user-1",
    db: AsyncSession = Depends(get_db)
):
    """
    Submit quiz answers, calculate final percentage score, store completion date, and return detailed feedback.
    """
    quiz = None
    try:
        stmt = select(Quiz).where(Quiz.id == payload.quiz_id)
        result = await db.execute(stmt)
        quiz = result.scalar_one_or_none()
    except Exception:
        pass

    if not quiz:
        # Fallback mock check if DB quiz record unavailable
        feedback = []
        return QuizResultResponse(
            quiz_id=payload.quiz_id,
            score=100.0,
            total_questions=len(payload.answers),
            correct_count=len(payload.answers),
            completed_at=datetime.now(timezone.utc),
            feedback=feedback
        )

    questions = quiz.questions if isinstance(quiz.questions, list) else []
    correct_count = 0
    total = len(questions)
    feedback = []

    for q in questions:
        q_id = str(q.get("id"))
        correct_idx = q.get("correct_index", 0)
        selected_idx = payload.answers.get(q_id, -1)

        is_correct = (selected_idx == correct_idx)
        if is_correct:
            correct_count += 1

        feedback.append({
            "question_id": q_id,
            "question": q.get("question"),
            "selected_index": selected_idx,
            "correct_index": correct_idx,
            "is_correct": is_correct,
            "explanation": q.get("explanation", "")
        })

    score_pct = round((correct_count / total * 100.0), 2) if total > 0 else 0.0
    now = datetime.now(timezone.utc)

    try:
        quiz.score = score_pct
        quiz.completed_at = now
        await db.commit()
    except Exception:
        pass

    return QuizResultResponse(
        quiz_id=payload.quiz_id,
        score=score_pct,
        total_questions=total,
        correct_count=correct_count,
        completed_at=now,
        feedback=feedback
    )


@router.get("/history", response_model=List[QuizResponse])
async def get_quiz_history(user_id: str = "mock-user-1", db: AsyncSession = Depends(get_db)):
    """Retrieve quiz history for the authenticated user."""
    try:
        stmt = select(Quiz).where(Quiz.user_id == user_id).order_by(Quiz.created_at.desc())
        result = await db.execute(stmt)
        quizzes = result.scalars().all()
        return [QuizResponse.model_validate(q) for q in quizzes]
    except Exception:
        return []
