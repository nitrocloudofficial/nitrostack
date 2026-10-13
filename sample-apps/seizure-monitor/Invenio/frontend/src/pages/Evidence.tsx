/**
 * Evidence — Evidence Chains and Citations
 *
 * Phase 1: Professional placeholder layout.
 *
 * Phase 2+ Responsibilities:
 * - Display structured evidence extracted by the Nitro Evidence agent
 * - Evidence chains: claim → supporting entities → confidence score
 * - Filter by entity type, confidence threshold, and domain
 * - Contradiction detection: highlight conflicting evidence
 * - Evidence export for report generation
 *
 * @see docs/AGENTS.md — "Evidence Agent" specification
 */

import { BookOpenCheck } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/PagePlaceholder'

export function Evidence() {
  return (
    <PagePlaceholder
      title="Evidence"
      description="Structured evidence chains extracted from research entities with confidence scoring."
      icon={<BookOpenCheck className="w-5 h-5" />}
      phaseBadge="Phase 3"
      modules={[
        {
          label: 'Evidence Feed',
          description: 'Chronological feed of extracted evidence claims with supporting entities.',
          phase: 'Phase 3',
        },
        {
          label: 'Confidence Filter',
          description: 'Filter evidence by confidence score threshold (0–100%).',
          phase: 'Phase 3',
        },
        {
          label: 'Claim Inspector',
          description: 'Expand any claim to see the full evidence chain and source entities.',
          phase: 'Phase 3',
        },
        {
          label: 'Contradiction Detector',
          description: 'Highlight and investigate conflicting evidence across the knowledge graph.',
          phase: 'Phase 4',
        },
        {
          label: 'Entity Links',
          description: 'Navigate from any evidence item directly to its source paper, dataset, or repo.',
          phase: 'Phase 3',
        },
        {
          label: 'Report Export',
          description: 'Push selected evidence items into a report via the Reports module.',
          phase: 'Phase 3',
        },
      ]}
    />
  )
}
