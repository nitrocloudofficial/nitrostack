'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './AppShell.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLogin = pathname === '/login' || pathname === '/';

    if (isLogin) {
        return <div className="app-root-login">{children}</div>;
    }

    return (
        <div className="app-shell">
            {/* Sidebar Navigation */}
            <aside className="sidebar glass-panel">
                <div className="sidebar-header">
                    <div className="logo">✦</div>
                    <h2>Memora</h2>
                </div>
                <nav className="sidebar-nav">
                    <Link href="/index" className={`nav-item ${pathname === '/index' ? 'active' : ''}`}>
                        <span className="nav-icon">🏠</span>
                        Dashboard
                    </Link>
                    <Link href="/quiz" className={`nav-item ${pathname === '/quiz' ? 'active' : ''}`}>
                        <span className="nav-icon">🎯</span>
                        Diagnostic Quiz
                    </Link>
                    <Link href="/interview" className={`nav-item ${pathname === '/interview' ? 'active' : ''}`}>
                        <span className="nav-icon">🧠</span>
                        Feynman Evaluator
                    </Link>
                </nav>
                <div className="sidebar-footer">
                    <div className="nav-item">
                        <span className="nav-icon">⚙️</span>
                        Settings
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="main-content-wrapper">
                {/* Top Navbar */}
                <header className="topbar glass-panel">
                    <div className="topbar-search">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Search syllabus, past quizzes..." className="search-input" />
                    </div>
                    <div className="topbar-actions">
                        <button className="icon-btn">🔔</button>
                        <div className="user-profile">
                            <div className="avatar">JD</div>
                            <span className="username">John Doe</span>
                        </div>
                        <Link href="/" className="logout-btn">Log Out</Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
