import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { TutorService } from './tutor.service.js';

/**
 * Tutor widget metadata
 */
function tutorWidget(route: string) {
    return {
        route,
        prefersBorder: true,
        csp: {
            resourceDomains: ['https://images.unsplash.com'],
        },
    };
}

// Input schemas
const AskQuestionSchema = z.object({
    studentId: z.string().describe('Unique identifier for the student'),
    topic: z.string().describe('Topic or subject to ask about'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Difficulty level of the question'),
});

const GetLessonSchema = z.object({
    lessonId: z.string().describe('ID of the lesson to retrieve'),
});

const GetLessonsBySubjectSchema = z.object({
    subject: z.string().describe('Subject name (e.g., Mathematics, Biology, Languages)'),
});

const GenerateQuizSchema = z.object({
    studentId: z.string().describe('Unique identifier for the student'),
    quizId: z.string().describe('ID of the quiz to generate'),
});

const SubmitAnswerSchema = z.object({
    studentId: z.string().describe('Unique identifier for the student'),
    questionId: z.string().describe('ID of the question being answered'),
    answer: z.string().describe('The student\'s answer'),
});

const GetProgressSchema = z.object({
    studentId: z.string().describe('Unique identifier for the student'),
});

const CreateLessonPlanSchema = z.object({
    studentId: z.string().describe('Unique identifier for the student'),
    subject: z.string().describe('Subject for the lesson plan'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Desired difficulty level'),
});

const GetRecommendedLessonSchema = z.object({
    studentId: z.string().describe('Unique identifier for the student'),
});

@Injectable({ deps: [TutorService] })
export class TutorTools {
    constructor(private readonly tutorService: TutorService) { }

    @Tool({
        name: 'ask_question',
        description: 'Ask the AI tutor a question about a specific topic. The tutor will provide an explanation and related questions.',
        inputSchema: AskQuestionSchema,
        examples: {
            request: { studentId: 'student_001', topic: 'Algebra', difficulty: 'medium' },
            response: {
                question: 'What is the value of x in the equation: 2x + 5 = 13?',
                explanation: 'To solve this equation, we need to isolate x. First, subtract 5 from both sides: 2x = 8. Then divide both sides by 2: x = 4.',
                relatedTopics: ['Linear Equations', 'Variables', 'Solving Equations'],
                difficulty: 'medium'
            }
        }
    })
    @Widget(tutorWidget('tutor-question'))
    async askQuestion(args: z.infer<typeof AskQuestionSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Student asking question', { studentId: args.studentId, topic: args.topic });

        // Get relevant questions from the service
        const allQuestions = this.tutorService.getQuestionsByLesson('algebra-101');
        const relevantQuestion = allQuestions.find(q => 
            q.difficulty === (args.difficulty || 'medium')
        ) || allQuestions[0];

        if (!relevantQuestion) {
            return {
                question: `Tell me about ${args.topic}`,
                explanation: `${args.topic} is an important concept in education. Let me help you understand it better.`,
                relatedTopics: ['Fundamentals', 'Advanced Concepts', 'Practice Problems'],
                difficulty: args.difficulty || 'medium'
            };
        }

        return {
            question: relevantQuestion.question,
            explanation: relevantQuestion.explanation,
            relatedTopics: ['Fundamentals', 'Practice Problems', 'Real-world Applications'],
            difficulty: relevantQuestion.difficulty,
            questionId: relevantQuestion.id
        };
    }

    @Tool({
        name: 'get_lesson',
        description: 'Retrieve a specific lesson with full content and learning objectives',
        inputSchema: GetLessonSchema,
        examples: {
            request: { lessonId: 'algebra-101' },
            response: {
                lesson: {
                    id: 'algebra-101',
                    title: 'Introduction to Algebra',
                    subject: 'Mathematics',
                    description: 'Learn the fundamentals of algebraic expressions and equations',
                    difficulty: 'beginner',
                    estimatedTime: 45,
                    objectives: ['Understand variables and expressions', 'Solve simple linear equations']
                },
                relatedLessons: [
                    { id: 'algebra-102', title: 'Advanced Algebra', subject: 'Mathematics' }
                ]
            }
        }
    })
    @Widget(tutorWidget('tutor-lesson'))
    async getLesson(args: z.infer<typeof GetLessonSchema>, ctx: ExecutionContext) {
        const lesson = this.tutorService.getLessonById(args.lessonId);

        if (!lesson) {
            throw new Error(`Lesson not found: ${args.lessonId}`);
        }

        ctx.logger.info('Retrieving lesson', { lessonId: args.lessonId, title: lesson.title });

        const relatedLessons = this.tutorService.getLessonsBySubject(lesson.subject)
            .filter(l => l.id !== lesson.id)
            .slice(0, 3);

        return {
            lesson,
            relatedLessons,
            questionsCount: this.tutorService.getQuestionsByLesson(lesson.id).length
        };
    }

    @Tool({
        name: 'get_lessons_by_subject',
        description: 'Get all available lessons for a specific subject',
        inputSchema: GetLessonsBySubjectSchema,
        examples: {
            request: { subject: 'Mathematics' },
            response: {
                subject: 'Mathematics',
                lessons: [
                    {
                        id: 'algebra-101',
                        title: 'Introduction to Algebra',
                        description: 'Learn the fundamentals of algebraic expressions and equations',
                        difficulty: 'beginner',
                        estimatedTime: 45
                    }
                ],
                totalLessons: 1
            }
        }
    })
    @Widget(tutorWidget('tutor-lessons-list'))
    async getLessonsBySubject(args: z.infer<typeof GetLessonsBySubjectSchema>, ctx: ExecutionContext) {
        const lessons = this.tutorService.getLessonsBySubject(args.subject);

        ctx.logger.info('Retrieving lessons by subject', { subject: args.subject, count: lessons.length });

        return {
            subject: args.subject,
            lessons: lessons.map(l => ({
                id: l.id,
                title: l.title,
                description: l.description,
                difficulty: l.difficulty,
                estimatedTime: l.estimatedTime
            })),
            totalLessons: lessons.length
        };
    }

    @Tool({
        name: 'generate_quiz',
        description: 'Generate a quiz for the student with multiple questions to test their knowledge',
        inputSchema: GenerateQuizSchema,
        examples: {
            request: { studentId: 'student_001', quizId: 'quiz-algebra-1' },
            response: {
                quiz: {
                    id: 'quiz-algebra-1',
                    title: 'Algebra Basics Quiz',
                    description: 'Test your understanding of basic algebraic equations',
                    timeLimit: 15,
                    passingScore: 70
                },
                questions: [
                    {
                        id: 'q1',
                        question: 'What is the value of x in the equation: 3x + 5 = 14?',
                        type: 'multiple_choice',
                        options: ['x = 2', 'x = 3', 'x = 4', 'x = 5']
                    }
                ],
                totalQuestions: 1
            }
        }
    })
    @Widget(tutorWidget('tutor-quiz'))
    async generateQuiz(args: z.infer<typeof GenerateQuizSchema>, ctx: ExecutionContext) {
        const quiz = this.tutorService.getQuizWithQuestions(args.quizId);

        if (!quiz) {
            throw new Error(`Quiz not found: ${args.quizId}`);
        }

        ctx.logger.info('Generating quiz', { studentId: args.studentId, quizId: args.quizId });

        return {
            quiz: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                timeLimit: quiz.timeLimit,
                passingScore: quiz.passingScore
            },
            questions: quiz.questionDetails.map(q => ({
                id: q.id,
                question: q.question,
                type: q.type,
                options: q.options,
                difficulty: q.difficulty
            })),
            totalQuestions: quiz.questionDetails.length
        };
    }

    @Tool({
        name: 'submit_answer',
        description: 'Submit an answer to a question and receive immediate feedback',
        inputSchema: SubmitAnswerSchema,
        examples: {
            request: { studentId: 'student_001', questionId: 'q1', answer: 'x = 3' },
            response: {
                isCorrect: true,
                explanation: '3x + 5 = 14 → 3x = 9 → x = 3',
                feedback: 'Excellent! You solved the equation correctly.',
                nextStep: 'Try the next question or review similar problems.'
            }
        }
    })
    @Widget(tutorWidget('tutor-answer-feedback'))
    async submitAnswer(args: z.infer<typeof SubmitAnswerSchema>, ctx: ExecutionContext) {
        const result = this.tutorService.submitAnswer(args.studentId, args.questionId, args.answer);
        const question = this.tutorService.getQuestionById(args.questionId);

        if (!question) {
            throw new Error(`Question not found: ${args.questionId}`);
        }

        ctx.logger.info('Answer submitted', { 
            studentId: args.studentId, 
            questionId: args.questionId, 
            isCorrect: result.isCorrect 
        });

        return {
            isCorrect: result.isCorrect,
            explanation: result.explanation,
            feedback: result.isCorrect 
                ? 'Excellent! You got it right. Keep up the great work!'
                : 'Not quite right. Review the explanation and try again.',
            correctAnswer: question.correctAnswer,
            nextStep: result.isCorrect 
                ? 'Move on to the next question or explore related topics.'
                : 'Review the lesson content and try a similar question.'
        };
    }

    @Tool({
        name: 'get_progress',
        description: 'Get the student\'s learning progress, including completed lessons and quiz scores',
        inputSchema: GetProgressSchema,
        examples: {
            request: { studentId: 'student_001' },
            response: {
                studentId: 'student_001',
                stats: {
                    totalLessonsCompleted: 3,
                    totalQuestionsAnswered: 15,
                    correctAnswers: 12,
                    accuracy: 80,
                    averageScore: 85.5
                },
                recentActivity: [
                    {
                        type: 'lesson_completed',
                        lessonId: 'algebra-101',
                        title: 'Introduction to Algebra',
                        score: 90,
                        timestamp: '2024-01-15T10:30:00Z'
                    }
                ]
            }
        }
    })
    @Widget(tutorWidget('tutor-progress'))
    async getProgress(args: z.infer<typeof GetProgressSchema>, ctx: ExecutionContext) {
        const stats = this.tutorService.getStudentStats(args.studentId);
        const progress = this.tutorService.getStudentProgress(args.studentId);

        ctx.logger.info('Retrieving student progress', { studentId: args.studentId });

        return {
            studentId: args.studentId,
            stats,
            completedLessons: progress.filter(p => p.completed).length,
            totalLessonsAvailable: this.tutorService.getAllLessons().length,
            progressPercentage: Math.round((progress.filter(p => p.completed).length / this.tutorService.getAllLessons().length) * 100)
        };
    }

    @Tool({
        name: 'create_lesson_plan',
        description: 'Create a personalized lesson plan based on subject and difficulty level',
        inputSchema: CreateLessonPlanSchema,
        examples: {
            request: { studentId: 'student_001', subject: 'Mathematics', difficulty: 'beginner' },
            response: {
                studentId: 'student_001',
                subject: 'Mathematics',
                difficulty: 'beginner',
                lessons: [
                    {
                        id: 'algebra-101',
                        title: 'Introduction to Algebra',
                        description: 'Learn the fundamentals of algebraic expressions and equations',
                        estimatedTime: 45,
                        objectives: ['Understand variables and expressions', 'Solve simple linear equations']
                    }
                ],
                totalEstimatedTime: 45,
                recommendations: ['Complete lessons in order', 'Take quizzes after each lesson']
            }
        }
    })
    @Widget(tutorWidget('tutor-lesson-plan'))
    async createLessonPlan(args: z.infer<typeof CreateLessonPlanSchema>, ctx: ExecutionContext) {
        const lessons = this.tutorService.generateLessonPlan(args.subject, args.difficulty);
        const totalTime = lessons.reduce((sum, l) => sum + l.estimatedTime, 0);

        ctx.logger.info('Creating lesson plan', { 
            studentId: args.studentId, 
            subject: args.subject, 
            difficulty: args.difficulty,
            lessonCount: lessons.length 
        });

        return {
            studentId: args.studentId,
            subject: args.subject,
            difficulty: args.difficulty,
            lessons: lessons.map(l => ({
                id: l.id,
                title: l.title,
                description: l.description,
                estimatedTime: l.estimatedTime,
                objectives: l.objectives
            })),
            totalEstimatedTime: totalTime,
            recommendations: [
                'Complete lessons in the recommended order',
                'Take quizzes after each lesson to reinforce learning',
                'Review difficult topics before moving forward',
                'Practice with real-world examples'
            ]
        };
    }

    @Tool({
        name: 'get_recommended_lesson',
        description: 'Get the next recommended lesson based on the student\'s progress',
        inputSchema: GetRecommendedLessonSchema,
        examples: {
            request: { studentId: 'student_001' },
            response: {
                recommendedLesson: {
                    id: 'photosynthesis-101',
                    title: 'Photosynthesis: How Plants Make Food',
                    subject: 'Biology',
                    description: 'Explore the process of photosynthesis and its importance to life on Earth',
                    difficulty: 'intermediate',
                    estimatedTime: 60,
                    objectives: ['Understand the photosynthesis equation', 'Identify the two main stages']
                },
                reason: 'Based on your progress, this intermediate Biology lesson is recommended next.'
            }
        }
    })
    @Widget(tutorWidget('tutor-recommended'))
    async getRecommendedLesson(args: z.infer<typeof GetRecommendedLessonSchema>, ctx: ExecutionContext) {
        const recommendedLesson = this.tutorService.getRecommendedLesson(args.studentId);

        ctx.logger.info('Getting recommended lesson', { studentId: args.studentId });

        if (!recommendedLesson) {
            return {
                recommendedLesson: null,
                reason: 'Congratulations! You have completed all available lessons. Consider reviewing advanced topics or exploring new subjects.'
            };
        }

        return {
            recommendedLesson,
            reason: `Based on your progress, this ${recommendedLesson.difficulty} ${recommendedLesson.subject} lesson is recommended next.`
        };
    }
}
