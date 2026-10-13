'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import './page.css';

interface Course {
    id: string;
    name: string;
    created_at: string;
}

import dynamic from 'next/dynamic';

function DashboardContent() {
    const { callTool, isReady, sendFollowUpMessage } = useWidgetSDK();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [commandInput, setCommandInput] = useState('');
    const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadCourses = useCallback(async () => {
        if (!isReady) return;
        try {
            const rawResponse: any = await callTool('courses_list', {});
            let responseData = rawResponse;
            if (rawResponse.content && Array.isArray(rawResponse.content)) {
                const textBlock = rawResponse.content.find((c: any) => c.type === 'text');
                if (textBlock && textBlock.text) {
                    responseData = JSON.parse(textBlock.text);
                }
            }
            if (responseData && responseData.success) {
                setCourses(responseData.courses || []);
            } else {
                setCourses([]);
            }
        } catch (e) {
            console.error("Failed to load courses:", e);
        }
    }, [isReady, callTool]);

    useEffect(() => {
        loadCourses();
    }, [loadCourses]);

    const handleFileUpload = useCallback(async (file: File) => {
        if (!file || !file.name.endsWith('.pdf')) return;
        setIsUploading(true);
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                if (isReady) {
                    await callTool('llama-parse_upload_document', {
                        file_name: file.name,
                        file_type: file.type,
                        file_content: reader.result as string,
                    });
                    // Reload courses after upload
                    loadCourses();
                }
                setUploadComplete(true);
                setTimeout(() => setUploadComplete(false), 3000);
            } catch (err) {
                console.error(err);
            } finally {
                setIsUploading(false);
            }
        };
    }, [callTool, isReady, loadCourses]);

    const handleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReady && commandInput.trim()) {
            sendFollowUpMessage(commandInput.trim());
        }
        setCommandInput('');
    };

    const handleRename = async (e: React.MouseEvent, courseId: string, oldName: string) => {
        e.stopPropagation();
        const newName = prompt("Enter new course name:", oldName);
        if (newName && newName !== oldName && isReady) {
            try {
                await callTool('course_rename', { id: courseId, new_name: newName });
                loadCourses();
            } catch (err) {
                console.error("Failed to rename:", err);
            }
        }
    };

    const handleDelete = async (e: React.MouseEvent, courseId: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this course and all its documents? This cannot be undone.") && isReady) {
            try {
                await callTool('course_delete', { id: courseId });
                loadCourses();
            } catch (err) {
                console.error("Failed to delete:", err);
            }
        }
    };

    const navigateTo = (path: string, courseName: string) => {
        if (isReady) {
            sendFollowUpMessage(`Show me ${path.replace('/', '')} for ${courseName}`);
        } else {
            window.location.href = `${path}?course=${encodeURIComponent(courseName)}&topic=${encodeURIComponent(courseName)}`;
        }
    };

    return (
        <div className="memora-app">
            <header className="hero animate-fade-in-up">
                <div className="hero-badge">✦ Autonomous Study Platform</div>
                <h1 className="hero-title">Memora</h1>
                <p className="hero-subtitle">Upload your syllabus or PYQs. Memora automatically links them to courses and generates active-recall study modalities.</p>
            </header>

            <section
                className={`upload-zone glass-panel animate-fade-in-up ${uploadComplete ? 'upload-complete' : ''}`}
                onClick={() => fileInputRef.current?.click()}
            >
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }} style={{ display: 'none' }} />
                
                {isUploading ? (
                    <div className="upload-loading">
                        <div className="spinner" />
                        <h2>Analyzing document...</h2>
                    </div>
                ) : uploadComplete ? (
                    <div className="upload-success">
                        <div className="upload-icon">✓</div>
                        <h2>Indexed Successfully!</h2>
                    </div>
                ) : (
                    <>
                        <div className="upload-icon-container">📄</div>
                        <h2>Drop your syllabus or PYQ PDF to automatically create a course</h2>
                    </>
                )}
            </section>

            <section className="roadmap-section animate-fade-in-up">
                <div className="section-header">
                    <h2>Your Courses</h2>
                </div>
                {courses.length === 0 ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: '#94a3b8' }}>No courses yet. Upload a PDF above to get started!</p>
                    </div>
                ) : (
                    <div className="topics-grid stagger-children">
                        {courses.map((course) => (
                            <div key={course.id} className="topic-card glass-panel animate-fade-in-up" 
                                style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                                onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}>
                                
                                <div className="topic-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{course.name}</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={(e) => handleRename(e, course.id, course.name)} className="icon-btn" style={{ fontSize: '16px', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7 }}>✏️</button>
                                        <button onClick={(e) => handleDelete(e, course.id)} className="icon-btn" style={{ fontSize: '16px', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7 }}>🗑️</button>
                                    </div>
                                </div>
                                
                                {expandedCourseId === course.id && (
                                    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                                        <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); navigateTo('/analytics', course.name); }} style={{ padding: '8px', fontSize: '0.9rem' }}>📊 Pareto Analytics</button>
                                        <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); navigateTo('/quiz', course.name); }} style={{ padding: '8px', fontSize: '0.9rem' }}>🎯 MCQ Quiz</button>
                                        <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); navigateTo('/flashcards', course.name); }} style={{ padding: '8px', fontSize: '0.9rem' }}>🃏 Flashcards</button>
                                        <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); navigateTo('/cheatsheet', course.name); }} style={{ padding: '8px', fontSize: '0.9rem' }}>📝 Cheatsheet</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div className="command-center" style={{ marginTop: '40px' }}>
                <form className="command-bar glass-panel" onSubmit={handleCommand}>
                    <input
                        type="text"
                        className="command-input"
                        placeholder="Ask Memora AI anything..."
                        value={commandInput}
                        onChange={(e) => setCommandInput(e.target.value)}
                        disabled={!isReady}
                    />
                    <button type="submit" className="btn-primary command-submit" disabled={!isReady}>Send</button>
                </form>
            </div>
        </div>
    );
}

const DashboardContentDynamic = dynamic(() => Promise.resolve(DashboardContent), { ssr: false });

export default function DashboardPage() {
    return <DashboardContentDynamic />;
}
