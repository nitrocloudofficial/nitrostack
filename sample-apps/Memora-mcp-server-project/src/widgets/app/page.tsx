'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import './login.css';

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false);

    const toggleMode = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsSignUp(!isSignUp);
    };

    return (
        <div className="login-container">
            <div className="login-card glass-panel animate-fade-in-up">
                <div className="login-header">
                    <div className="login-logo">✦</div>
                    <h1>{isSignUp ? 'Create an Account' : 'Welcome to Memora'}</h1>
                    <p>{isSignUp ? 'Join the Autonomous Study Platform' : 'The Autonomous Study Platform'}</p>
                </div>
                
                <div className="login-body">
                    <form className="login-form">
                        {isSignUp && (
                            <div className="input-group">
                                <label>Full Name</label>
                                <input type="text" placeholder="John Doe" />
                            </div>
                        )}
                        <div className="input-group">
                            <label>Email</label>
                            <input type="email" placeholder="you@university.edu" />
                        </div>
                        <div className="input-group">
                            <label>Password</label>
                            <input type="password" placeholder="••••••••" />
                        </div>
                        <Link href="/index" className="login-submit btn-primary">
                            {isSignUp ? 'Sign Up' : 'Sign In'}
                        </Link>
                    </form>

                    <div className="auth-switch">
                        <p>
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <a href="#" onClick={toggleMode} className="auth-link">
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </a>
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="login-footer">
                <p>Memora uses advanced agentic models (Llama-3.3 70B) to autonomously generate study material.</p>
                <div className="badges">
                    <span className="badge">NitroStack MCP</span>
                    <span className="badge">Groq</span>
                    <span className="badge">Supabase pgvector</span>
                </div>
            </div>
        </div>
    );
}
