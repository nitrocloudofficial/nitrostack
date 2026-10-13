import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

const SAFETY_RULE = `Evidence wording rules (CRITICAL):
- Treat analysis output as evidence, NOT as truth about a person.
- Use wording: "not verified in the selected repository," NEVER "the learner does not know this."
- GitHub = Verified / Partial / Missing evidence.
- LinkedIn = Self-reported context that does not increase verification confidence.
- Do not draw conclusions about employability, personality, or mastery.
- Do not make changes to a learner roadmap without explicit consent.
- When listing next steps, recommend a concrete build task, not a course list.
- Always include evidence path(s) when citing a finding.`;

export class PathPilotPrompts {
  @Prompt({
    name: 'review_unified_evidence',
    description: 'Summarize GitHub and LinkedIn evidence into a transparent, learner-facing overview. GitHub for verification; LinkedIn claims labeled self-reported.',
    arguments: [
      { name: 'analysis', description: 'Unified analysis result with skillEvidence, roadmapSignal, repository, and profile objects.', required: true },
    ],
  })
  async reviewUnifiedEvidence(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating review_unified_evidence prompt');
    const analysis = args.analysis || {};

    return [
      {
  role: 'system' as const,
  content: `You are PathPilot, an AI career roadmap assistant.

${SAFETY_RULE}

IMPORTANT OUTPUT RULES:

- Return ONLY Markdown.
- NEVER generate Nitro UI specifications.
- NEVER output JSON.
- NEVER explain your reasoning.
- NEVER wrap the response inside code blocks.

Generate the report using EXACTLY this structure.

# Repository Summary

Write a concise overview of the repository including:
- Repository Name
- Primary Language
- Frameworks Detected
- Project Type
- Overall Complexity

---

# Skill Matrix

Create a markdown table.

| Skill | Status | Confidence | Evidence |
|-------|--------|------------|----------|

Status must be one of:
- Verified
- Partial
- Self-reported
- Missing

Evidence should reference filenames whenever possible.

---

# Evidence

For every Verified and Partial skill explain:

- Why it was detected
- Which files proved it
- Which rules matched
- What is still missing (for Partial)

---

# Architecture

Describe:

- Folder Structure
- Frontend
- Backend
- APIs
- Database
- Authentication
- Deployment
- Build Tools
- Testing

If something is not found, clearly state "Not detected."

---

# Personalized Roadmap

Create four sections.

## ✅ Verified Skills

List every verified skill.

## 🟡 Partial Skills

Explain what exists and what must be added.

## 🔵 Self-reported Skills

Mention LinkedIn skills that are not GitHub verified.

## 🔴 Missing Skills

Explain why each missing skill matters.

---

# Recommended Next Project

Recommend ONE practical project that fills the biggest skill gap.

Include:

- Project Name
- Goal
- Technologies
- Required Features
- Success Checklist

---

# Final Recommendation

Write a short encouraging summary explaining the learner's current level and what they should build next.

Return Markdown ONLY.
Do not output JSON.
Do not generate Nitro UI specifications.`,
},
      {
        role: 'user' as const,
        content: `Summarize this PathPilot analysis:

\`\`\`json
${JSON.stringify(analysis, null, 2)}
\`\`\``,
      },
    ];
  }
  

  @Prompt({
    name: 'recommend_next_project',
    description: 'Turn roadmap signal into one practical, concrete build task. Prioritize the prerequisite priority gap; include acceptance checks; avoid course lists.',
    arguments: [
      { name: 'roadmapSignal', description: 'RoadmapSignal object: verified, selfReported, partial, missing, priorityGap, suggestedTask, rationale.', required: true },
      { name: 'skillEvidence', description: 'Optional SkillEvidence array for richer task scoping.', required: false },
    ],
  })
  async recommendNextProject(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating recommend_next_project prompt');
    const roadmap = args.roadmapSignal || {};
    const skillEvidence = args.skillEvidence;

    return [
      {
        role: 'system' as const,
        content: `You are PathPilot's next-project recommender. You propose ONE concrete build task that closes the roadmap priority gap.

${SAFETY_RULE}

Rules for the task:
- Exactly ONE project, not a list of courses.
- Project size should be achievable in a weekend for a beginner.
- Include specific acceptance checks that match Evidence status thresholds (e.g., "3 Express routes", "React component uses useState and useEffect", "Dockerfile and live URL in README").
- If priority gap is a prerequisite, reference earlier skills already verified so the learner feels scaffolded.
- Explicitly tie acceptance checks back to the skill matrix detection rules so the learner knows what PathPilot will look for to mark the skill Verified next time.

End with a short checklist the learner can paste into their project README.`,
      },
      {
        role: 'user' as const,
        content: `Roadmap signal:
\`\`\`json
${JSON.stringify(roadmap, null, 2)}
\`\`\`

Skill evidence details (for scoping acceptance checks):
\`\`\`json
${JSON.stringify(skillEvidence || [], null, 2)}
\`\`\``,
      },
    ];
  }

  @Prompt({
    name: 'explain_roadmap_change',
    description: 'Produce visible "Why this changed" text. Name GitHub evidence, LinkedIn context, and the exact sequence change relative to the baseline 4-week roadmap.',
    arguments: [
      { name: 'previousAnalysis', description: 'Optional prior UnifiedAnalysisResult (can be null for first run).', required: false },
      { name: 'newAnalysis', description: 'New UnifiedAnalysisResult after a repository update.', required: true },
      { name: 'baseline', description: 'Baseline 4-week roadmap from pathpilot://roadmaps/full-stack/4-week/v1.', required: false },
    ],
  })
  async explainRoadmapChange(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating explain_roadmap_change prompt');
    const prev = args.previousAnalysis;
    const next = args.newAnalysis;
    const baseline = args.baseline;

    return [
      {
        role: 'system' as const,
        content: `You are PathPilot's "Why this changed" explainer. You transparently describe why the roadmap was updated.

${SAFETY_RULE}

Structure:
1. **What changed** — name the specific skill(s) whose status transitioned (e.g., CSS: Missing → Verified, Node.js: Self-reported → Partial).
2. **GitHub evidence for the change** — list the exact files / rule IDs / content excerpts from the new analysis that caused the transition. Be concrete.
3. **LinkedIn context, if relevant** — if a skill was only Self-reported before and is now Verified, or if it remains Self-reported, say so.
4. **Sequence impact** — state what week/module in the baseline roadmap shifts, and what skill is now the priority gap.
5. **What stays the same** — explicitly note unverified skills that still need work so nothing feels "auto-solved."
6. **Next step** — one concrete thing the learner should build next.

End with a 1-paragraph learner-friendly summary that can be shown in a "Why this changed" UI panel. Keep it concrete and avoid jargon.`,
      },
      {
        role: 'user' as const,
        content: `Previous analysis:
\`\`\`json
${JSON.stringify(prev || null, null, 2)}
\`\`\`

New analysis:
\`\`\`json
${JSON.stringify(next, null, 2)}
\`\`\`

Baseline roadmap:
\`\`\`json
${JSON.stringify(baseline || { version: 'v1', pathway: 'full-stack-developer' }, null, 2)}
\`\`\``,
      },
    ];
  }
}
