'use client';

import React, { useState, useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { useSearchParams } from 'next/navigation';
import './cheatsheet.css';

interface CheatsheetData {
    topic: string;
    markdown: string;
    success: boolean;
    course_name?: string;
}
import dynamic from 'next/dynamic';

function CheatsheetContent() {
    const { isReady, getToolOutput, callTool } = useWidgetSDK();
    const widgetData = getToolOutput<CheatsheetData>();
    const searchParams = useSearchParams();
    const courseParam = searchParams.get('course');
    const topicParam = searchParams.get('topic');
    
    const [standaloneData, setStandaloneData] = useState<CheatsheetData | null>(null);
    const data = widgetData || standaloneData;

    useEffect(() => {
        if (!widgetData && courseParam && topicParam && isReady && !standaloneData) {
            callTool('study_cheatsheet_generate', { course_name: courseParam, topic: topicParam }).then((rawResponse: any) => {
                if (rawResponse.content) {
                    const textBlock = rawResponse.content.find((c: any) => c.type === 'text');
                    if (textBlock && textBlock.text) {
                        setStandaloneData(JSON.parse(textBlock.text));
                    }
                }
            }).catch(e => console.error(e));
        }
    }, [widgetData, courseParam, topicParam, isReady, callTool, standaloneData]);

    if (!isReady || !data) {
        return (
            <div className="cheatsheet-container animate-fade-in">
                <div className="markdown-content" style={{ textAlign: 'center' }}>
                    <p style={{ color: '#94a3b8' }}>Synthesizing cheatsheet...</p>
                </div>
            </div>
        );
    }

    if (!data.markdown) {
        return (
            <div className="cheatsheet-container animate-fade-in">
                <div className="markdown-content" style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#ef4444' }}>Error</h3>
                    <p style={{ color: '#94a3b8' }}>Failed to generate cheatsheet.</p>
                </div>
            </div>
        );
    }

    // A very simple Markdown to React Element parser for Hackathon purposes
    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let inList = false;
        let listItems: React.ReactNode[] = [];
        
        const flushList = () => {
            if (inList && listItems.length > 0) {
                elements.push(<ul key={`ul-${elements.length}`}>{listItems}</ul>);
                listItems = [];
                inList = false;
            }
        };

        lines.forEach((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) {
                flushList();
                return;
            }

            // Headers
            if (trimmed.startsWith('### ')) {
                flushList();
                elements.push(<h3 key={i}>{parseInlineFormatting(trimmed.substring(4))}</h3>);
            } else if (trimmed.startsWith('## ')) {
                flushList();
                elements.push(<h2 key={i}>{parseInlineFormatting(trimmed.substring(3))}</h2>);
            } else if (trimmed.startsWith('# ')) {
                flushList();
                elements.push(<h1 key={i}>{parseInlineFormatting(trimmed.substring(2))}</h1>);
            } 
            // Lists
            else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                inList = true;
                listItems.push(<li key={i}>{parseInlineFormatting(trimmed.substring(2))}</li>);
            } 
            // Paragraphs
            else {
                flushList();
                elements.push(<p key={i}>{parseInlineFormatting(trimmed)}</p>);
            }
        });
        
        flushList();
        return elements;
    };

    const parseInlineFormatting = (text: string) => {
        // Simple bold parsing: **text**
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={idx}>{part.substring(2, part.length - 2)}</strong>;
            }
            
            // Simple code parsing: `code`
            const codeParts = part.split(/(`.*?`)/g);
            return codeParts.map((cPart, cIdx) => {
                if (cPart.startsWith('`') && cPart.endsWith('`')) {
                    return <code key={`${idx}-${cIdx}`}>{cPart.substring(1, cPart.length - 1)}</code>;
                }
                return cPart;
            });
        });
    };

    return (
        <div className="cheatsheet-container animate-fade-in">
            <header className="cheatsheet-header">
                <h1>{data.topic} Cheatsheet</h1>
                <p>{data.course_name ? `${data.course_name} • ` : ''}Optimized for fast revision</p>
            </header>

            <main className="markdown-content">
                {renderMarkdown(data.markdown)}
            </main>
        </div>
    );
}

const CheatsheetContentDynamic = dynamic(() => Promise.resolve(CheatsheetContent), { ssr: false });

export default function CheatsheetPage() {
    return <CheatsheetContentDynamic />;
}
