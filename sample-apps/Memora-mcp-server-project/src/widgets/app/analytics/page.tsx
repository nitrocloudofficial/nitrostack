'use client';

import React, { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { useSearchParams } from 'next/navigation';
import './analytics.css';

interface TopicData {
    topic_name: string;
    total_marks: number;
    appearance_count: number;
}

interface AnalyticsData {
    success: boolean;
    course_name: string;
    topics: TopicData[];
}

import dynamic from 'next/dynamic';

function AnalyticsContent() {
    const { isReady, getToolOutput, callTool } = useWidgetSDK();
    const widgetData = getToolOutput<AnalyticsData>();
    const searchParams = useSearchParams();
    const courseParam = searchParams.get('course');
    
    const [standaloneData, setStandaloneData] = useState<AnalyticsData | null>(null);
    const data = widgetData || standaloneData;
    
    const [animatedWidths, setAnimatedWidths] = useState<number[]>([]);

    useEffect(() => {
        if (!widgetData && courseParam && isReady && !standaloneData) {
            callTool('analytics_course', { course_name: courseParam }).then((rawResponse: any) => {
                if (rawResponse.content) {
                    const textBlock = rawResponse.content.find((c: any) => c.type === 'text');
                    if (textBlock && textBlock.text) {
                        setStandaloneData(JSON.parse(textBlock.text));
                    }
                }
            }).catch(e => console.error(e));
        }
    }, [widgetData, courseParam, isReady, callTool, standaloneData]);

    useEffect(() => {
        if (data?.topics && data.topics.length > 0) {
            // Calculate max value (marks if present, otherwise count) for relative bar width
            const hasMarks = data.topics.some(t => t.total_marks > 0);
            const maxVal = Math.max(...data.topics.map(t => hasMarks ? t.total_marks : t.appearance_count));
            
            // Trigger animation after a short delay
            setTimeout(() => {
                setAnimatedWidths(data.topics.map(t => {
                    const val = hasMarks ? t.total_marks : t.appearance_count;
                    return (val / (maxVal || 1)) * 100;
                }));
            }, 100);
        }
    }, [data]);

    if (!isReady) {
        return (
            <div className="analytics-container animate-fade-in">
                <div className="chart-container" style={{ alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                    <p style={{ color: '#94a3b8' }}>Loading analytics engine...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    if (!data.topics || data.topics.length === 0) {
        return (
            <div className="analytics-container animate-fade-in">
                <header className="analytics-header">
                    <h1>Course Analytics</h1>
                    <p>{data.course_name}</p>
                </header>
                <div className="chart-container">
                    <div className="empty-state">
                        <h3>No PYQ Data Found</h3>
                        <p>Upload a Past Year Question (PYQ) PDF to populate analytics.</p>
                    </div>
                </div>
            </div>
        );
    }

    const hasMarks = data.topics.some(t => t.total_marks > 0);

    return (
        <div className="analytics-container animate-fade-in">
            <header className="analytics-header">
                <h1>Pareto 80/20 Topic Weightage</h1>
                <p>Based on Past Year Questions for {data.course_name}</p>
            </header>

            <main className="chart-container">
                {data.topics.map((topic, idx) => (
                    <div key={idx} className="bar-row">
                        <div className="bar-label-container">
                            <span className="bar-label">{topic.topic_name}</span>
                            <span className="bar-stats">
                                {hasMarks 
                                    ? `${topic.total_marks} marks (${topic.appearance_count}x)`
                                    : `${topic.appearance_count} appearances`}
                            </span>
                        </div>
                        <div className="bar-track">
                            <div 
                                className="bar-fill" 
                                style={{ width: `${animatedWidths[idx] || 0}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}

const AnalyticsContentDynamic = dynamic(() => Promise.resolve(AnalyticsContent), { ssr: false });

export default function AnalyticsPage() {
    return <AnalyticsContentDynamic />;
}
