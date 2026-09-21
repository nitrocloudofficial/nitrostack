'use client';

import React, { useState, useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import './flashcards.css';

interface Flashcard {
    front: string;
    back: string;
}

interface FlashcardsData {
    success: boolean;
    course_name?: string;
    topic: string;
    cards: Flashcard[];
}

function FlashcardsContent() {
    const { isReady, getToolOutput, callTool } = useWidgetSDK();
    const widgetData = getToolOutput<FlashcardsData>();
    const searchParams = useSearchParams();
    const courseParam = searchParams.get('course');
    
    const [standaloneData, setStandaloneData] = useState<FlashcardsData | null>(null);
    const data = widgetData || standaloneData;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        if (!widgetData && courseParam && isReady && !standaloneData) {
            callTool('study_quiz_start', { course_name: courseParam }).then((rawResponse: any) => {
                if (rawResponse.content) {
                    const textBlock = rawResponse.content.find((c: any) => c.type === 'text');
                    if (textBlock && textBlock.text) {
                        const parsed = JSON.parse(textBlock.text);
                        const mappedCards = parsed.questions?.map((q: any) => ({
                            front: q.question,
                            back: q.explanation || q.options[q.correct_option_index]
                        })) || [];
                        setStandaloneData({ success: true, course_name: parsed.course_name, cards: mappedCards, topic: '' });
                    }
                }
            }).catch(e => console.error(e));
        }
    }, [widgetData, courseParam, isReady, callTool, standaloneData]);

    if (!isReady || !data) {
        return (
            <div className="flashcards-container animate-fade-in">
                <div className="scene" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#94a3b8' }}>Loading flashcards...</p>
                </div>
            </div>
        );
    }

    if (!data.cards || data.cards.length === 0) {
        return (
            <div className="flashcards-container animate-fade-in">
                <div className="scene" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <h3 style={{ color: '#ef4444', margin: 0 }}>No Flashcards</h3>
                    <p style={{ color: '#f87171' }}>Upload a document to generate flashcards.</p>
                </div>
            </div>
        );
    }

    const currentCard = data.cards[currentIndex];

    const handleNext = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % data.cards.length);
        }, 150);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex(prev => (prev - 1 + data.cards.length) % data.cards.length);
        }, 150);
    };

    return (
        <div className="flashcards-container animate-fade-in">
            <header className="flashcards-header">
                <h1>{data.topic} Flashcards</h1>
                <p>{data.course_name ? `${data.course_name} • ` : ''}Card {currentIndex + 1} of {data.cards.length}</p>
            </header>

            <div className="scene" onClick={() => setIsFlipped(!isFlipped)}>
                <div className={`card ${isFlipped ? 'is-flipped' : ''}`}>
                    <div className="card-face card-face--front">
                        <h3>{currentCard.front}</h3>
                        <span className="hint">Click to flip</span>
                    </div>
                    <div className="card-face card-face--back">
                        <p>{currentCard.back}</p>
                    </div>
                </div>
            </div>

            <div className="flashcards-controls">
                <button 
                    className="btn-nav" 
                    onClick={handlePrev} 
                    disabled={currentIndex === 0}
                >
                    Prev
                </button>
                <span className="progress-text">
                    {currentIndex + 1} / {data.cards.length}
                </span>
                <button 
                    className="btn-nav" 
                    onClick={handleNext} 
                    disabled={currentIndex === data.cards.length - 1}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

const FlashcardsContentDynamic = dynamic(() => Promise.resolve(FlashcardsContent), { ssr: false });

export default function FlashcardsPage() {
    return <FlashcardsContentDynamic />;
}
