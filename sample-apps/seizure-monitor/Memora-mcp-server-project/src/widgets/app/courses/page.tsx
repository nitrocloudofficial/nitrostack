'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import './courses.css';

interface Course {
    id: string;
    name: string;
    created_at: string;
}

interface CoursesData {
    success: boolean;
    courses: Course[];
}

export default function CoursesPage() {
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<CoursesData>();

    if (!isReady || !data) {
        return (
            <div className="courses-container animate-fade-in">
                <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '40px' }}>Loading courses...</p>
            </div>
        );
    }

    if (!data.courses || data.courses.length === 0) {
        return (
            <div className="courses-container animate-fade-in">
                <header className="courses-header">
                    <h1>Your Courses</h1>
                </header>
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <p style={{ color: '#94a3b8' }}>You haven't created any courses yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="courses-container animate-fade-in">
            <header className="courses-header">
                <h1>Your Courses</h1>
                <p>Select a course ID to use in your other tools.</p>
            </header>

            <main className="courses-grid">
                {data.courses.map((course) => (
                    <div key={course.id} className="course-card">
                        <h3 className="course-name">{course.name}</h3>
                        <p className="course-id">{course.id}</p>
                        <p className="course-date">Created on {course.created_at.substring(0, 10)}</p>
                    </div>
                ))}
            </main>
        </div>
    );
}
