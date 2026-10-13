'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

interface AnalyzeIdeaData {
  opportunity_score: number;
  uniqueness_score: number;
  problem_validation: string;
  market_potential: string;
  risks: string[];
  recommendations: string[];
  timestamp: string;
}

export default function AnalyzeIdeaWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  
  const [formData, setFormData] = useState({
    startup_idea: '',
    industry: '',
    target_audience: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const data = getToolOutput<AnalyzeIdeaData>();

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitted(true);
    
    try {
      await callTool('analyze-idea', formData);
    } catch (error) {
      console.error('Error calling analyze-idea:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const inputBg = isDark ? '#2d2d2d' : '#f9fafb';
  const accentColor = '#3b82f6';

  // Loading state
  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: textColor,
      }}>
        Initializing...
      </div>
    );
  }

  // Results view
  if (submitted && data) {
    const scores = [
      { label: 'Opportunity Score', value: data.opportunity_score, max: 10, color: '#10b981' },
      { label: 'Uniqueness Score', value: data.uniqueness_score, max: 10, color: '#f59e0b' }
    ];

    return (
      <div style={{
        padding: '24px',
        background: bgColor,
        color: textColor,
        borderRadius: '12px',
        maxWidth: '800px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 'bold' }}>
          🚀 Venture Analysis Results
        </h2>

        {/* Scores */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {scores.map((score, idx) => (
            <div key={idx} style={{
              padding: '16px',
              background: isDark ? '#2d2d2d' : '#f3f4f6',
              borderRadius: '8px',
              border: `1px solid ${borderColor}`
            }}>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
                {score.label}
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: score.color,
                marginBottom: '8px'
              }}>
                {score.value.toFixed(1)}/{score.max}
              </div>
              <div style={{
                height: '4px',
                background: isDark ? '#444' : '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(score.value / score.max) * 100}%`,
                  background: score.color,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Problem Validation */}
        <div style={{
          padding: '16px',
          background: isDark ? '#2d2d2d' : '#f3f4f6',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
            ✓ Problem Validation
          </h3>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            {data.problem_validation}
          </p>
        </div>

        {/* Market Potential */}
        <div style={{
          padding: '16px',
          background: isDark ? '#2d2d2d' : '#f3f4f6',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
            📊 Market Potential
          </h3>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            {data.market_potential}
          </p>
        </div>

        {/* Risks */}
        <div style={{
          padding: '16px',
          background: isDark ? '#2d2d2d' : '#f3f4f6',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
            ⚠️ Key Risks
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
            {(data.risks ?? []).map((risk, idx) => (
              <li key={idx} style={{ marginBottom: '6px', opacity: 0.9 }}>
                {risk}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div style={{
          padding: '16px',
          background: isDark ? '#2d2d2d' : '#f3f4f6',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
            💡 Recommendations
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
            {(data.recommendations ?? []).map((rec, idx) => (
              <li key={idx} style={{ marginBottom: '6px', opacity: 0.9 }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({ startup_idea: '', industry: '', target_audience: '' });
          }}
          style={{
            width: '100%',
            padding: '12px',
            background: accentColor,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            marginTop: '16px',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Analyze Another Idea
        </button>
      </div>
    );
  }

  // Form view
  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      borderRadius: '12px',
      maxWidth: '600px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
        🚀 IGNITE AI
      </h2>
      <p style={{ margin: '0 0 24px 0', fontSize: '14px', opacity: 0.7 }}>
        Your AI Startup Co-Founder — Analyze your startup idea and get venture intelligence
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Startup Idea */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 'bold',
            marginBottom: '6px',
            opacity: 0.9
          }}>
            💡 Startup Idea
          </label>
          <textarea
            name="startup_idea"
            value={formData.startup_idea}
            onChange={handleInputChange}
            placeholder="Describe your startup idea, product, or business concept..."
            style={{
              width: '100%',
              padding: '12px',
              background: inputBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              color: textColor,
              fontSize: '14px',
              fontFamily: 'inherit',
              minHeight: '100px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        {/* Industry */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 'bold',
            marginBottom: '6px',
            opacity: 0.9
          }}>
            🏢 Industry
          </label>
          <input
            type="text"
            name="industry"
            value={formData.industry}
            onChange={handleInputChange}
            placeholder="e.g., FinTech, HealthTech, SaaS, EdTech..."
            style={{
              width: '100%',
              padding: '12px',
              background: inputBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              color: textColor,
              fontSize: '14px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        {/* Target Audience */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 'bold',
            marginBottom: '6px',
            opacity: 0.9
          }}>
            👥 Target Audience
          </label>
          <input
            type="text"
            name="target_audience"
            value={formData.target_audience}
            onChange={handleInputChange}
            placeholder="e.g., Health-conscious millennials, Enterprise CFOs..."
            style={{
              width: '100%',
              padding: '12px',
              background: inputBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              color: textColor,
              fontSize: '14px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !formData.startup_idea || !formData.industry || !formData.target_audience}
          style={{
            padding: '12px',
            background: isLoading ? '#9ca3af' : accentColor,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            opacity: isLoading ? 0.7 : 1
          }}
          onMouseOver={(e) => !isLoading && (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={(e) => !isLoading && (e.currentTarget.style.opacity = '1')}
        >
          {isLoading ? '⏳ Analyzing...' : '🔍 Analyze Idea'}
        </button>
      </form>

      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: isDark ? '#2d2d2d' : '#f3f4f6',
        borderRadius: '8px',
        fontSize: '12px',
        opacity: 0.7,
        textAlign: 'center'
      }}>
        Get venture intelligence: opportunity scores, market analysis, risks, and actionable recommendations
      </div>
    </div>
  );
}
