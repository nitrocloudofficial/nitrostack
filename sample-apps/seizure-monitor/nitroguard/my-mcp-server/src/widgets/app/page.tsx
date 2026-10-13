'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1e1b4b, #090514)',
      color: '#f8fafc',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '800px',
        width: '100%',
        textAlign: 'center',
        marginBottom: '60px',
        animation: 'fadeIn 0.8s ease-out'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          padding: '6px 16px',
          borderRadius: '9999px',
          fontSize: '14px',
          color: '#818cf8',
          fontWeight: 500,
          marginBottom: '16px'
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            background: '#10b981',
            borderRadius: '50%',
            boxShadow: '0 0 8px #10b981'
          }}></span>
          NitroStack Widget Server
        </div>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 800,
          background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 16px 0',
          letterSpacing: '-0.025em'
        }}>
          Widget Development Server
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#94a3b8',
          margin: 0,
          lineHeight: '1.6'
        }}>
          Welcome to your local widget development environment. Explore registered widgets, view previews, and test integrations below.
        </p>
      </div>

      {/* Widget Grid */}
      <div style={{
        maxWidth: '1000px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '24px'
      }}>
        {/* Calculator Widget */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          padding: '32px',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 600,
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '28px' }}>🧩</span> Calculator Result Widget
          </h2>
          <p style={{
            fontSize: '15px',
            color: '#94a3b8',
            margin: '0 0 24px 0',
            lineHeight: '1.5'
          }}>
            Displays interactive calculator operation details and outputs. Highly compatible with OpenAI ChatGPT and NitroStack Studio.
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '32px'
          }}>
            <span style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#cbd5e1'
            }}>
              Route: <code>/calculator-result</code>
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#cbd5e1'
            }}>
              Port: <code>3001</code>
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px'
          }}>
            <Link href="/calculator-result" style={{
              flex: 1,
              textAlign: 'center',
              background: 'linear-gradient(to right, #4f46e5, #6366f1)',
              color: '#ffffff',
              padding: '14px 24px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '15px',
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
            }}>
              Go to Calculator Widget →
            </Link>
          </div>
        </div>

        {/* Trajectory Viewer Widget */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          padding: '32px',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 600,
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '28px' }}>🤖</span> Trajectory Viewer Widget
          </h2>
          <p style={{
            fontSize: '15px',
            color: '#94a3b8',
            margin: '0 0 24px 0',
            lineHeight: '1.5'
          }}>
            Displays interactive top-down 2D radar and 3D isometric robot safety trajectories with Control Barrier Function deflection vectors.
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '32px'
          }}>
            <span style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#cbd5e1'
            }}>
              Route: <code>/trajectory-viewer</code>
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#cbd5e1'
            }}>
              Port: <code>3001</code>
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px'
          }}>
            <Link href="/trajectory-viewer" style={{
              flex: 1,
              textAlign: 'center',
              background: 'linear-gradient(to right, #4f46e5, #6366f1)',
              color: '#ffffff',
              padding: '14px 24px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '15px',
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
            }}>
              Go to Trajectory Widget →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '60px',
        fontSize: '13px',
        color: '#64748b',
        textAlign: 'center'
      }}>
        <p>© 2026 NitroStack. Custom widgets locally hosted.</p>
      </div>
    </div>
  );
}
