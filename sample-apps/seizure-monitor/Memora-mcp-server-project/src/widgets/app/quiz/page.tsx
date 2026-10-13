'use client';

import React, { useState, useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { useSearchParams } from 'next/navigation';
import './quiz.css';

interface Question {
    type?: 'multiple_choice' | 'true_false' | 'short_answer';
    question: string;
    options?: string[];
    answer: string;
    explanation: string;
}

interface QuizData {
    course_name?: string;
    topic: string;
    difficulty: string;
    questions: Question[];
    success: boolean;
}

import dynamic from 'next/dynamic';

function QuizContent() {
    const { isReady, getToolOutput, callTool } = useWidgetSDK();
    const widgetData = getToolOutput<QuizData>();
    const searchParams = useSearchParams();
    const courseParam = searchParams.get('course');
    const topicParam = searchParams.get('topic');
    
    const [standaloneData, setStandaloneData] = useState<QuizData | null>(null);
    const data = widgetData || standaloneData;

    useEffect(() => {
        if (!widgetData && courseParam && topicParam && isReady && !standaloneData) {
            callTool('study_quiz_start', { course_name: courseParam, topic: topicParam, difficulty: 'medium' }).then((rawResponse: any) => {
                if (rawResponse.content) {
                    const textBlock = rawResponse.content.find((c: any) => c.type === 'text');
                    if (textBlock && textBlock.text) {
                        setStandaloneData(JSON.parse(textBlock.text));
                    }
                }
            }).catch(e => console.error(e));
        }
    }, [widgetData, courseParam, topicParam, isReady, callTool, standaloneData]);
    
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [shortAnswer, setShortAnswer] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    if (!isReady || !data) {
        return (
            <div className="quiz-container animate-fade-in-up">
                <main className="quiz-body glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: '#94a3b8' }}>Loading interactive quiz...</p>
                </main>
            </div>
        );
    }

    if (!data.questions || data.questions.length === 0) {
        return (
            <div className="quiz-container animate-fade-in-up">
                <main className="quiz-body glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
                    <h2 style={{ color: '#ef4444' }}>Error Generating Quiz</h2>
                    <p style={{ color: '#94a3b8' }}>No questions were returned.</p>
                </main>
            </div>
        );
    }

    const isQuizComplete = currentQuestionIdx >= data.questions.length;
    const currentQ = isQuizComplete ? null : data.questions[currentQuestionIdx];
    const qType = currentQ?.type || 'multiple_choice';

    const handleSubmit = () => {
        if (!currentQ) return;
        
        let isCorrect = false;

        if (qType === 'multiple_choice' || qType === 'true_false') {
            if (selectedOption !== null && currentQ.options) {
                isCorrect = currentQ.options[selectedOption].toLowerCase() === currentQ.answer.toLowerCase();
            }
        } else if (qType === 'short_answer') {
            // For hackathon, any non-empty answer that contains some keywords or just grading it leniently. 
            // We'll just do a very loose includes check or exact match for simplicity.
            isCorrect = shortAnswer.trim().length > 0 && currentQ.answer.toLowerCase().includes(shortAnswer.trim().toLowerCase());
        }

        if (isCorrect) {
            setScore(prev => prev + 1);
        }
        setIsSubmitted(true);
    };

    const handleNext = () => {
        setSelectedOption(null);
        setShortAnswer('');
        setIsSubmitted(false);
        setCurrentQuestionIdx(prev => prev + 1);
    };

    if (isQuizComplete) {
        return (
            <div className="quiz-container animate-fade-in-up">
                <header className="quiz-header">
                    <div className="quiz-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Quiz Complete</div>
                    <h1>{data.topic}</h1>
                    <p style={{ textTransform: 'capitalize' }}>{data.difficulty} Difficulty</p>
                </header>
                <main className="quiz-body glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <h2 style={{ fontSize: '32px', marginBottom: '16px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Your Score: {score} / {data.questions.length}
                    </h2>
                    <p style={{ color: '#94a3b8' }}>
                        {score === data.questions.length ? "Perfect! You've mastered this topic." : "Good effort. Review the concepts and try again!"}
                    </p>
                </main>
            </div>
        );
    }

    // Ensure options exist for multiple_choice and true_false
    let optionsToRender = currentQ?.options || [];
    if (qType === 'true_false' && optionsToRender.length === 0) {
        optionsToRender = ['True', 'False'];
    }

    return (
        <div className="quiz-container animate-fade-in-up">
            <header className="quiz-header">
                <div className="quiz-badge">Diagnostic Quiz • {qType.replace('_', ' ')}</div>
                <h1>{data.topic}</h1>
                <p>Question {currentQuestionIdx + 1} of {data.questions.length} • <span style={{ textTransform: 'capitalize' }}>{data.difficulty}</span></p>
            </header>

            <main className="quiz-body glass-panel">
                <h2 className="question-text">{currentQ?.question}</h2>
                
                {qType === 'short_answer' ? (
                    <div style={{ marginTop: '20px' }}>
                        <textarea 
                            value={shortAnswer}
                            onChange={(e) => !isSubmitted && setShortAnswer(e.target.value)}
                            disabled={isSubmitted}
                            placeholder="Type your answer here..."
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '16px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#f8fafc',
                                fontFamily: 'inherit',
                                fontSize: '16px',
                                resize: 'vertical'
                            }}
                        />
                    </div>
                ) : (
                    <div className="options-grid">
                        {optionsToRender.map((opt, idx) => {
                            let btnClass = `option-btn`;
                            if (selectedOption === idx) btnClass += ' selected';
                            
                            if (isSubmitted) {
                                if (opt.toLowerCase() === currentQ?.answer.toLowerCase()) {
                                    btnClass += ' correct';
                                } else if (selectedOption === idx) {
                                    btnClass += ' incorrect';
                                }
                            }

                            return (
                                <button
                                    key={idx}
                                    className={btnClass}
                                    onClick={() => !isSubmitted && setSelectedOption(idx)}
                                    disabled={isSubmitted}
                                    style={{
                                        border: isSubmitted && opt.toLowerCase() === currentQ?.answer.toLowerCase() ? '1px solid #10b981' : undefined,
                                        background: isSubmitted && opt.toLowerCase() === currentQ?.answer.toLowerCase() ? 'rgba(16, 185, 129, 0.1)' : undefined,
                                    }}
                                >
                                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                                    <span className="option-text">{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {isSubmitted && (
                    <div className="explanation-box" style={{ marginTop: '24px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', borderRadius: '4px' }}>
                        <h4 style={{ color: '#60a5fa', margin: '0 0 8px 0' }}>Explanation</h4>
                        {qType === 'short_answer' && (
                            <p style={{ color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>Correct Answer: {currentQ?.answer}</p>
                        )}
                        <p style={{ color: '#f1f5f9', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                            {currentQ?.explanation}
                        </p>
                    </div>
                )}
            </main>

            <footer className="quiz-footer">
                {!isSubmitted ? (
                    <button
                        className="btn-primary"
                        disabled={(qType !== 'short_answer' && selectedOption === null) || (qType === 'short_answer' && shortAnswer.trim() === '')}
                        onClick={handleSubmit}
                    >
                        Submit Answer
                    </button>
                ) : (
                    <button
                        className="btn-primary"
                        onClick={handleNext}
                        style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
                    >
                        {currentQuestionIdx === data.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    </button>
                )}
            </footer>
        </div>
    );
}

const QuizContentDynamic = dynamic(() => Promise.resolve(QuizContent), { ssr: false });

export default function QuizPage() {
    return <QuizContentDynamic />;
}
