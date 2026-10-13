import React from 'react'
import { PagePlaceholder } from '../components/ui/PagePlaceholder'
import { Settings as SettingsIcon } from 'lucide-react'

export function Settings() {
  return (
    <PagePlaceholder
      title="Settings"
      description="Configure API keys, API endpoints, LLM model preferences, and UI themes."
      icon={<SettingsIcon />}
      phaseBadge="Phase 3"
      modules={[
        {
          label: 'LLM Configuration',
          description: 'Toggle between OpenAI (GPT-4o), Anthropic (Claude 3.5), and local models (Ollama). Set context lengths.',
          phase: 'Phase 3'
        },
        {
          label: 'API Integrations',
          description: 'Manage keys for OpenAlex, Semantic Scholar, Neo4j, and external literature databases.',
          phase: 'Phase 3'
        },
        {
          label: 'Workspace Preferences',
          description: 'Customize layout defaults, auto-start behaviors, and notification preferences.',
          phase: 'Phase 3'
        }
      ]}
    />
  )
}
