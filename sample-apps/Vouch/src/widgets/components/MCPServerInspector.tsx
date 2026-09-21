'use client';

import React, { useState } from 'react';
import { Card, Button, Badge, colors } from './DesignSystem';

export const MCPServerInspector: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState('reviews');
  const [activeViewMode, setActiveViewMode] = useState<'execute' | 'source'>('execute');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const mcpModules = [
    {
      id: 'reviews',
      name: 'ReviewsModule',
      file: 'src/modules/reviews/reviews.tools.ts',
      tools: [
        {
          name: 'reviews_submit',
          desc: 'Submit a new review for a business with evidence proof files',
          schema: 'z.object({ business_id: z.string().uuid(), user_id: z.string().uuid(), rating: z.number().min(1).max(5), text: z.string().min(10), evidence_urls: z.array(z.string()).optional() })',
          widgetRoute: '/review-card',
          sampleResult: {
            success: true,
            review: { id: 'REV-8942', business_id: 'BIZ-101', user_id: 'USR-902', rating: 5, trust_score: 94, verification_status: 'verified' },
            message: 'Review submitted successfully',
          },
          code: `@Tool({
  name: 'reviews_submit',
  description: 'Submit a new review for a business',
  inputSchema: z.object({
    business_id: z.string().uuid().describe('Business ID'),
    user_id: z.string().uuid().describe('User ID (reviewer)'),
    rating: z.number().int().min(1).max(5).describe('Rating (1-5 stars)'),
    text: z.string().min(10).describe('Review text (minimum 10 characters)'),
    evidence_urls: z.array(z.string().url()).optional().describe('Optional evidence file URLs'),
  }),
})
@Widget('review-card')
async submitReview(input, ctx) {
  ctx.logger.info('Review submission', { business_id: input.business_id });
  const review = await this.db.queryOne(\`INSERT INTO reviews (business_id, user_id, rating, text) VALUES ($1, $2, $3, $4) RETURNING *\`, [input.business_id, input.user_id, input.rating, input.text]);
  if (input.evidence_urls?.length) {
    await this.db.query(\`UPDATE reviews SET verification_status = 'verified' WHERE id = $1\`, [review.id]);
  }
  return { success: true, review };
}`,
        },
        {
          name: 'reviews_get',
          desc: 'Get review audit details, multi-signal score breakdown, and evidence files',
          schema: 'z.object({ review_id: z.string().uuid() })',
          widgetRoute: '/review-card',
          sampleResult: {
            success: true,
            review: { id: 'REV-8942', author: 'Alex Chen', trust_score: 94, evidence: [{ file_url: 'https://vouch.mcp/proof.jpg', file_type: 'photo', verified: true }] },
          },
          code: `@Tool({
  name: 'reviews_get',
  description: 'Get a review by ID with attached proof & trust history',
  inputSchema: z.object({ review_id: z.string().uuid() }),
})
async getReview(input: { review_id: string }, ctx: ExecutionContext) {
  const review = await this.db.queryOne(\`SELECT * FROM reviews WHERE id = $1\`, [input.review_id]);
  const evidence = await this.db.queryAll(\`SELECT * FROM evidence WHERE review_id = $1\`, [input.review_id]);
  return { success: true, review: { ...review, evidence } };
}`,
        },
      ],
    },
    {
      id: 'trustengine',
      name: 'TrustEngineModule',
      file: 'src/modules/trustengine/trustengine.tools.ts',
      tools: [
        {
          name: 'trust_compute_score',
          desc: 'Compute and save multi-signal trust score (0-100) for a review',
          schema: 'z.object({ review_id: z.string().uuid() })',
          widgetRoute: '/trust-breakdown',
          sampleResult: {
            success: true,
            review_id: 'REV-8942',
            score: 94,
            verified: true,
            breakdown: { evidence_score: 30, reputation_score: 20, originality_score: 18, account_age_score: 14, community_score: 12 },
          },
          code: `@Tool({
  name: 'trust_compute_score',
  description: 'Compute and save trust score for a review',
  inputSchema: z.object({ review_id: z.string().uuid() }),
})
@Widget('trust-breakdown')
async computeScore(input: { review_id: string }, ctx: ExecutionContext) {
  const result = await this.trustEngine.computeTrustScore(input.review_id);
  await this.trustEngine.saveTrustScore(input.review_id, result);
  return { success: true, review_id: input.review_id, score: result.score, breakdown: result.breakdown };
}`,
        },
      ],
    },
    {
      id: 'ai',
      name: 'AIModule',
      file: 'src/modules/ai/ai.tools.ts',
      tools: [
        {
          name: 'ai_detect_fraud',
          desc: 'Run NLP Jaccard text similarity scan, duplicate cluster detection, and rating mismatch check',
          schema: 'z.object({ review_text: z.string(), rating: z.number().int().min(1).max(5) })',
          widgetRoute: '/ai-risk-report',
          sampleResult: {
            success: true,
            risk_level: 'LOW',
            jaccard_similarity: '0.4%',
            sentiment_match: true,
            fraud_flags: [],
          },
          code: `@Tool({
  name: 'ai_detect_fraud',
  description: 'Run Jaccard similarity scan and rating-sentiment mismatch audit',
  inputSchema: z.object({ review_text: z.string(), rating: z.number().int() }),
})
@Widget('ai-risk-report')
async detectFraud(input, ctx) {
  const jaccard = await this.ai.calculateJaccardSimilarity(input.review_text);
  const sentiment = await this.ai.analyzeSentiment(input.review_text);
  const flags = [];
  if (jaccard > 0.7) flags.push('Duplicate text cluster detected');
  if (input.rating === 5 && sentiment.score < -0.5) flags.push('Rating/Sentiment divergence');
  return { success: true, risk_level: flags.length ? 'HIGH' : 'LOW', fraud_flags: flags };
}`,
        },
      ],
    },
    {
      id: 'business',
      name: 'BusinessModule',
      file: 'src/modules/business/business.tools.ts',
      tools: [
        {
          name: 'business_get_analytics',
          desc: 'Retrieve merchant trust analytics, rating distribution, and fraud history',
          schema: 'z.object({ business_id: z.string().uuid() })',
          widgetRoute: '/business-dashboard',
          sampleResult: {
            success: true,
            business: { name: 'Apex Electronics', avg_trust_score: 94, total_reviews: 142, fraud_risk: 'LOW', claimed: true },
          },
          code: `@Tool({
  name: 'business_get_analytics',
  description: 'Retrieve business analytics and trust distribution',
  inputSchema: z.object({ business_id: z.string().uuid() }),
})
@Widget('business-dashboard')
async getAnalytics(input, ctx) {
  const biz = await this.db.queryOne(\`SELECT * FROM businesses WHERE id = $1\`, [input.business_id]);
  const stats = await this.db.queryOne(\`SELECT AVG(trust_score) as avg_score, COUNT(*) as count FROM reviews WHERE business_id = $1\`, [input.business_id]);
  return { success: true, business: { ...biz, avg_trust_score: stats.avg_score, total_reviews: stats.count } };
}`,
        },
      ],
    },
    {
      id: 'reputation',
      name: 'ReputationModule',
      file: 'src/modules/reputation/reputation.tools.ts',
      tools: [
        {
          name: 'reputation_get_badge',
          desc: 'Calculate reviewer badge tier progression and points history',
          schema: 'z.object({ user_id: z.string().uuid() })',
          widgetRoute: '/reputation-card',
          sampleResult: {
            success: true,
            user_id: 'USR-902',
            tier: 'Truth Keeper',
            level: 6,
            points: 1420,
          },
          code: `@Tool({
  name: 'reputation_get_badge',
  description: 'Get reviewer badge level and reputation track',
  inputSchema: z.object({ user_id: z.string().uuid() }),
})
@Widget('reputation-card')
async getBadge(input, ctx) {
  const rep = await this.db.queryOne(\`SELECT reputation_points FROM users WHERE id = $1\`, [input.user_id]);
  let tier = 'New Reviewer';
  if (rep.reputation_points > 1000) tier = 'Truth Keeper';
  return { success: true, tier, points: rep.reputation_points };
}`,
        },
      ],
    },
  ];

  const currentMod = mcpModules.find((m) => m.id === selectedModule) || mcpModules[0];

  const handleTestTool = (tool: any) => {
    setIsExecuting(true);
    setTestOutput(`Executing MCP Tool JSON-RPC call: ${tool.name}...`);

    setTimeout(() => {
      setIsExecuting(false);
      setTestOutput(JSON.stringify({
        jsonrpc: '2.0',
        result: tool.sampleResult,
        id: 1,
      }, null, 2));
    }, 1000);
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '28px' }}>⚡</span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFF', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              Vouch NitroStack MCP Server & Tool Inspector
            </h1>
            <Badge variant="emerald" size="sm">✓ Server Running (Port 3000)</Badge>
          </div>
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>
            Inspect TypeScript source code, Zod input schemas, and test JSON-RPC tool calls live.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveViewMode('execute')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeViewMode === 'execute' ? '1px solid #4F46E5' : '1px solid rgba(255,255,255,0.08)',
              background: activeViewMode === 'execute' ? '#4F46E5' : 'rgba(255,255,255,0.03)',
              color: '#FFF',
              cursor: 'pointer',
            }}
          >
            ▶️ Test Tool Executions
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('source')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeViewMode === 'source' ? '1px solid #4F46E5' : '1px solid rgba(255,255,255,0.08)',
              background: activeViewMode === 'source' ? '#4F46E5' : 'rgba(255,255,255,0.03)',
              color: '#FFF',
              cursor: 'pointer',
            }}
          >
            📖 View TypeScript Code
          </button>
        </div>
      </div>

      {/* Module Selector Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {mcpModules.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedModule(m.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              border: selectedModule === m.id ? '1px solid #4F46E5' : '1px solid rgba(255,255,255,0.08)',
              background: selectedModule === m.id ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)' : 'rgba(255,255,255,0.03)',
              color: selectedModule === m.id ? '#FFFFFF' : '#94A3B8',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ⚡ {m.name} ({m.tools.length} Tools)
          </button>
        ))}
      </div>

      {/* Main Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Tool Details & Source Code */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>
            Source File: <code style={{ color: '#38BDF8' }}>{currentMod.file}</code>
          </div>

          {currentMod.tools.map((tool, idx) => (
            <Card key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code style={{ fontSize: '15px', fontWeight: 800, color: '#818CF8', background: 'rgba(79, 70, 229, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                      {tool.name}
                    </code>
                    <Badge variant="cyan" size="sm">@Widget({tool.widgetRoute})</Badge>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#CBD5E1' }}>{tool.desc}</p>
                </div>

                <Button variant="primary" size="sm" onClick={() => handleTestTool(tool)} loading={isExecuting}>
                  ▶️ Execute Tool
                </Button>
              </div>

              {/* View Mode: Zod Schema vs TypeScript Code */}
              {activeViewMode === 'execute' ? (
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Zod Input Validation Schema</span>
                  <code style={{ fontSize: '12px', color: '#38BDF8', wordBreak: 'break-all' }}>{tool.schema}</code>
                </div>
              ) : (
                <div style={{ background: '#090D16', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>TypeScript Implementation Source Code</div>
                  <pre style={{ margin: 0, color: '#F8FAFC', fontSize: '12px', lineHeight: '1.6', overflowX: 'auto', fontFamily: "'Courier New', monospace" }}>
                    {tool.code}
                  </pre>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Right Column: Console JSON-RPC Output */}
        <Card style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💻</span> MCP JSON-RPC Response Console
          </h3>

          {testOutput ? (
            <pre style={{
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#34D399',
              fontSize: '12px',
              lineHeight: '1.5',
              overflowX: 'auto',
              fontFamily: "'Courier New', monospace",
            }}>
              {testOutput}
            </pre>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B', fontSize: '13px' }}>
              Click <strong>"▶️ Execute Tool"</strong> on any MCP tool to view live JSON-RPC responses.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
