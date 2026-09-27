"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate a brief authentication delay for the demo feel
    setTimeout(() => {
      // Regardless of credentials, route to the dashboard for the demo
      router.push("/dashboard");
    }, 800);
  };

  return (
    <>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-1" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-3" aria-hidden="true" />

      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-header">
            <div className="login-logo" aria-hidden="true">⚡</div>
            <h1 className="login-title">NitroSignal</h1>
            <p className="login-subtitle">Multi-Agent Market Intelligence</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label htmlFor="email" className="input-label">Email Address</label>
              <input
                id="email"
                type="email"
                className="login-input"
                placeholder="demo@nitrosignal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="password" className="input-label">Password</label>
              <input
                id="password"
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="run-btn-spinner" aria-hidden="true" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="login-footer">
            Demo Environment • No password required
          </div>
        </div>
      </div>
    </>
  );
}
