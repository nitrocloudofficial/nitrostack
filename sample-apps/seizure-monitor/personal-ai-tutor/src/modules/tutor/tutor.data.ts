/**
 * AI Tutor Data - Sample lessons, questions, and quiz content
 */

export interface Lesson {
    id: string;
    title: string;
    subject: string;
    description: string;
    content: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number; // in minutes
    objectives: string[];
}

export interface Question {
    id: string;
    lessonId: string;
    question: string;
    type: 'multiple_choice' | 'short_answer' | 'essay';
    difficulty: 'easy' | 'medium' | 'hard';
    options?: string[]; // for multiple choice
    correctAnswer?: string;
    explanation: string;
}

export interface Quiz {
    id: string;
    title: string;
    subject: string;
    description: string;
    questions: string[]; // question IDs
    passingScore: number; // percentage
    timeLimit?: number; // in minutes
}

export interface StudentProgress {
    studentId: string;
    lessonId: string;
    completed: boolean;
    score?: number;
    attemptCount: number;
    lastAttempted: Date;
}

export interface StudentAnswer {
    studentId: string;
    questionId: string;
    answer: string;
    isCorrect: boolean;
    timestamp: Date;
}

// Sample Lessons
export const LESSONS: Lesson[] = [
    {
        id: 'algebra-101',
        title: 'Introduction to Algebra',
        subject: 'Mathematics',
        description: 'Learn the fundamentals of algebraic expressions and equations',
        content: `
            Algebra is a branch of mathematics that uses symbols (usually letters) to represent unknown quantities.
            
            Key concepts:
            - Variables: symbols that represent unknown values
            - Expressions: combinations of variables, numbers, and operations
            - Equations: statements that two expressions are equal
            - Solving: finding the value of the variable that makes the equation true
            
            Example: In the equation 2x + 3 = 7, we solve for x:
            2x = 7 - 3
            2x = 4
            x = 2
        `,
        difficulty: 'beginner',
        estimatedTime: 45,
        objectives: [
            'Understand variables and expressions',
            'Solve simple linear equations',
            'Apply algebra to real-world problems'
        ]
    },
    {
        id: 'photosynthesis-101',
        title: 'Photosynthesis: How Plants Make Food',
        subject: 'Biology',
        description: 'Explore the process of photosynthesis and its importance to life on Earth',
        content: `
            Photosynthesis is the process by which plants convert light energy into chemical energy.
            
            The equation: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂
            
            Two main stages:
            1. Light-dependent reactions (in thylakoids): Convert light energy to ATP and NADPH
            2. Light-independent reactions/Calvin Cycle (in stroma): Use ATP and NADPH to produce glucose
            
            Importance:
            - Produces oxygen for respiration
            - Creates glucose for plant growth
            - Forms the base of most food chains
        `,
        difficulty: 'intermediate',
        estimatedTime: 60,
        objectives: [
            'Understand the photosynthesis equation',
            'Identify the two main stages',
            'Explain the importance of photosynthesis'
        ]
    },
    {
        id: 'french-basics',
        title: 'French Basics: Greetings and Introductions',
        subject: 'Languages',
        description: 'Learn essential French phrases for everyday communication',
        content: `
            Common French greetings and phrases:
            
            - Bonjour (Hello/Good day)
            - Bonsoir (Good evening)
            - Bonne nuit (Good night)
            - Au revoir (Goodbye)
            - S'il vous plaît (Please - formal)
            - S'il te plaît (Please - informal)
            - Merci (Thank you)
            - De rien (You're welcome)
            - Excusez-moi (Excuse me)
            - Je m'appelle... (My name is...)
            - Enchanté(e) (Nice to meet you)
        `,
        difficulty: 'beginner',
        estimatedTime: 30,
        objectives: [
            'Learn basic French greetings',
            'Practice pronunciation',
            'Understand formal vs informal speech'
        ]
    }
];

// Sample Questions
export const QUESTIONS: Question[] = [
    {
        id: 'q1',
        lessonId: 'algebra-101',
        question: 'What is the value of x in the equation: 3x + 5 = 14?',
        type: 'multiple_choice',
        difficulty: 'easy',
        options: ['x = 2', 'x = 3', 'x = 4', 'x = 5'],
        correctAnswer: 'x = 3',
        explanation: '3x + 5 = 14 → 3x = 9 → x = 3'
    },
    {
        id: 'q2',
        lessonId: 'algebra-101',
        question: 'Solve for y: 2y - 8 = 12',
        type: 'short_answer',
        difficulty: 'medium',
        correctAnswer: 'y = 10',
        explanation: '2y - 8 = 12 → 2y = 20 → y = 10'
    },
    {
        id: 'q3',
        lessonId: 'photosynthesis-101',
        question: 'What are the two main stages of photosynthesis?',
        type: 'short_answer',
        difficulty: 'medium',
        correctAnswer: 'Light-dependent reactions and the Calvin Cycle (or light-independent reactions)',
        explanation: 'The light-dependent reactions occur in the thylakoids and produce ATP and NADPH. The Calvin Cycle occurs in the stroma and uses these products to create glucose.'
    },
    {
        id: 'q4',
        lessonId: 'photosynthesis-101',
        question: 'Which of the following is a product of photosynthesis?',
        type: 'multiple_choice',
        difficulty: 'easy',
        options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'],
        correctAnswer: 'Oxygen',
        explanation: 'Photosynthesis produces glucose and oxygen. The oxygen is released as a byproduct.'
    },
    {
        id: 'q5',
        lessonId: 'french-basics',
        question: 'How do you say "Hello" in French?',
        type: 'multiple_choice',
        difficulty: 'easy',
        options: ['Au revoir', 'Bonjour', 'Merci', 'S\'il vous plaît'],
        correctAnswer: 'Bonjour',
        explanation: 'Bonjour means "Hello" or "Good day" in French.'
    }
];

// Sample Quizzes
export const QUIZZES: Quiz[] = [
    {
        id: 'quiz-algebra-1',
        title: 'Algebra Basics Quiz',
        subject: 'Mathematics',
        description: 'Test your understanding of basic algebraic equations',
        questions: ['q1', 'q2'],
        passingScore: 70,
        timeLimit: 15
    },
    {
        id: 'quiz-bio-1',
        title: 'Photosynthesis Quiz',
        subject: 'Biology',
        description: 'Assess your knowledge of photosynthesis',
        questions: ['q3', 'q4'],
        passingScore: 75,
        timeLimit: 20
    },
    {
        id: 'quiz-french-1',
        title: 'French Greetings Quiz',
        subject: 'Languages',
        description: 'Test your French vocabulary',
        questions: ['q5'],
        passingScore: 80,
        timeLimit: 10
    }
];
