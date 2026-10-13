export interface PromptTemplate {
  name: string;
  description: string;
  arguments: { name: string; description: string; required: boolean }[];
  template: string;
}

export const PRIORITY_CLASSIFICATION_PROMPT: PromptTemplate = {
  name: 'PriorityClassification',
  description: 'Prompt template for AI agent scoring message urgency and sender authority',
  arguments: [
    { name: 'sender', description: 'Sender email or name', required: true },
    { name: 'content', description: 'Raw message body', required: true }
  ],
  template: 'Classify urgency (0.00 to 1.00) and priority level for message from {{sender}}: "{{content}}"'
};

export const CONVERSATION_SUMMARISATION_PROMPT: PromptTemplate = {
  name: 'ConversationSummarisation',
  description: 'Prompt template for AI agent thread executive summarization',
  arguments: [
    { name: 'thread', description: 'Conversation thread history', required: true }
  ],
  template: 'Provide a 3-bullet executive summary and key takeaways for conversation thread: {{thread}}'
};

export const TASK_EXTRACTION_PROMPT: PromptTemplate = {
  name: 'TaskExtraction',
  description: 'Prompt template for NLP action item and deliverable extraction',
  arguments: [
    { name: 'content', description: 'Message body or conversation snippet', required: true }
  ],
  template: 'Extract tasks, action items, assigned owners, and due dates from text: {{content}}'
};

export const REPLY_GENERATION_PROMPT: PromptTemplate = {
  name: 'ReplyGeneration',
  description: 'Prompt template for multi-tone context-aware smart response generation',
  arguments: [
    { name: 'tone', description: 'Target tone: Professional, Friendly, Formal, Short, Detailed', required: true },
    { name: 'message', description: 'Original message text', required: true }
  ],
  template: 'Draft a context-aware reply in {{tone}} tone to message: "{{message}}"'
};

export const DAILY_BRIEFING_PROMPT: PromptTemplate = {
  name: 'DailyBriefing',
  description: 'Prompt template for AI executive morning briefing synthesis',
  arguments: [
    { name: 'userName', description: 'User name', required: true }
  ],
  template: 'Synthesize a morning productivity briefing for {{userName}} based on inbox, tasks, and calendar agenda.'
};
