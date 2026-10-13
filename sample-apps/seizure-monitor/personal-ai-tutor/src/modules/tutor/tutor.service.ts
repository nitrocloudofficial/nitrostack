import { Injectable } from '@nitrostack/core';
import { LESSONS, QUESTIONS, QUIZZES, type Lesson, type Question, type Quiz, type StudentProgress, type StudentAnswer } from './tutor.data.js';

@Injectable()
export class TutorService {
    private studentProgress: Map<string, StudentProgress[]> = new Map();
    private studentAnswers: Map<string, StudentAnswer[]> = new Map();

    /**
     * Get all available lessons
     */
    getAllLessons(): Lesson[] {
        return LESSONS;
    }

    /**
     * Get a specific lesson by ID
     */
    getLessonById(id: string): Lesson | undefined {
        return LESSONS.find(lesson => lesson.id === id);
    }

    /**
     * Get lessons by subject
     */
    getLessonsBySubject(subject: string): Lesson[] {
        return LESSONS.filter(lesson => lesson.subject.toLowerCase() === subject.toLowerCase());
    }

    /**
     * Get a specific question by ID
     */
    getQuestionById(id: string): Question | undefined {
        return QUESTIONS.find(q => q.id === id);
    }

    /**
     * Get questions for a lesson
     */
    getQuestionsByLesson(lessonId: string): Question[] {
        return QUESTIONS.filter(q => q.lessonId === lessonId);
    }

    /**
     * Get a specific quiz by ID
     */
    getQuizById(id: string): Quiz | undefined {
        return QUIZZES.find(quiz => quiz.id === id);
    }

    /**
     * Get all quizzes
     */
    getAllQuizzes(): Quiz[] {
        return QUIZZES;
    }

    /**
     * Get quizzes by subject
     */
    getQuizzesBySubject(subject: string): Quiz[] {
        return QUIZZES.filter(quiz => quiz.subject.toLowerCase() === subject.toLowerCase());
    }

    /**
     * Get quiz with full question details
     */
    getQuizWithQuestions(quizId: string): (Quiz & { questionDetails: Question[] }) | undefined {
        const quiz = this.getQuizById(quizId);
        if (!quiz) return undefined;

        const questionDetails = quiz.questions
            .map(qId => this.getQuestionById(qId))
            .filter((q): q is Question => q !== undefined);

        return {
            ...quiz,
            questionDetails
        };
    }

    /**
     * Submit an answer to a question
     */
    submitAnswer(studentId: string, questionId: string, answer: string): { isCorrect: boolean; explanation: string } {
        const question = this.getQuestionById(questionId);
        if (!question) {
            throw new Error(`Question not found: ${questionId}`);
        }

        // Simple answer checking (case-insensitive for short answers)
        const isCorrect = question.type === 'multiple_choice'
            ? answer === question.correctAnswer
            : answer.toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();

        // Store the answer
        if (!this.studentAnswers.has(studentId)) {
            this.studentAnswers.set(studentId, []);
        }

        this.studentAnswers.get(studentId)!.push({
            studentId,
            questionId,
            answer,
            isCorrect,
            timestamp: new Date()
        });

        return {
            isCorrect,
            explanation: question.explanation
        };
    }

    /**
     * Get student's answer history for a question
     */
    getStudentAnswers(studentId: string, questionId?: string): StudentAnswer[] {
        const answers = this.studentAnswers.get(studentId) || [];
        if (questionId) {
            return answers.filter(a => a.questionId === questionId);
        }
        return answers;
    }

    /**
     * Mark a lesson as completed for a student
     */
    markLessonComplete(studentId: string, lessonId: string, score?: number): void {
        if (!this.studentProgress.has(studentId)) {
            this.studentProgress.set(studentId, []);
        }

        const progress = this.studentProgress.get(studentId)!;
        const existing = progress.find(p => p.lessonId === lessonId);

        if (existing) {
            existing.completed = true;
            existing.score = score;
            existing.attemptCount++;
            existing.lastAttempted = new Date();
        } else {
            progress.push({
                studentId,
                lessonId,
                completed: true,
                score,
                attemptCount: 1,
                lastAttempted: new Date()
            });
        }
    }

    /**
     * Get student's progress for a lesson
     */
    getStudentProgress(studentId: string, lessonId?: string): StudentProgress[] {
        const progress = this.studentProgress.get(studentId) || [];
        if (lessonId) {
            return progress.filter(p => p.lessonId === lessonId);
        }
        return progress;
    }

    /**
     * Get student's overall statistics
     */
    getStudentStats(studentId: string): {
        totalLessonsCompleted: number;
        totalQuestionsAnswered: number;
        correctAnswers: number;
        accuracy: number;
        averageScore: number;
    } {
        const progress = this.getStudentProgress(studentId);
        const answers = this.getStudentAnswers(studentId);

        const totalLessonsCompleted = progress.filter(p => p.completed).length;
        const totalQuestionsAnswered = answers.length;
        const correctAnswers = answers.filter(a => a.isCorrect).length;
        const accuracy = totalQuestionsAnswered > 0 ? (correctAnswers / totalQuestionsAnswered) * 100 : 0;
        const completedWithScores = progress.filter(p => p.score !== undefined);
        const averageScore = completedWithScores.length > 0
            ? completedWithScores.reduce((sum, p) => sum + (p.score || 0), 0) / completedWithScores.length
            : 0;

        return {
            totalLessonsCompleted,
            totalQuestionsAnswered,
            correctAnswers,
            accuracy: Math.round(accuracy * 100) / 100,
            averageScore: Math.round(averageScore * 100) / 100
        };
    }

    /**
     * Generate a personalized lesson plan based on subject and difficulty
     */
    generateLessonPlan(subject: string, difficulty: 'beginner' | 'intermediate' | 'advanced'): Lesson[] {
        return this.getLessonsBySubject(subject)
            .filter(lesson => {
                if (difficulty === 'beginner') return lesson.difficulty === 'beginner';
                if (difficulty === 'intermediate') return ['beginner', 'intermediate'].includes(lesson.difficulty);
                return true; // advanced includes all
            });
    }

    /**
     * Get recommended next lesson based on progress
     */
    getRecommendedLesson(studentId: string): Lesson | undefined {
        const progress = this.getStudentProgress(studentId);
        const completedLessonIds = new Set(progress.filter(p => p.completed).map(p => p.lessonId));

        // Find first incomplete lesson
        const nextLesson = LESSONS.find(lesson => !completedLessonIds.has(lesson.id));
        return nextLesson;
    }
}
