# Prompts Guide

## Overview

Prompts provide pre-defined conversation templates that AI models can use to initiate structured interactions. They serve as context-rich starting points for specific tasks, ensuring consistent and effective AI conversations.

This guide covers prompt definition, argument handling, response formatting, dynamic registration, and integration patterns.

## Table of Contents

- [Basic Prompt Definition](#basic-prompt-definition)
- [Prompt Decorator Options](#prompt-decorator-options)
- [Prompt Arguments](#prompt-arguments)
- [Response Format](#response-format)
- [Dynamic Prompts](#dynamic-prompts)
- [Middleware Integration](#middleware-integration)
- [Dependency Injection](#dependency-injection)
- [Dynamic Prompt Registration](#dynamic-prompt-registration)
- [Best Practices](#best-practices)

## Basic Prompt Definition

Prompts are defined using the `@Prompt` decorator on class methods:

```typescript
import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class ProductPrompts {
  constructor(private productService: ProductService) {}

  @Prompt({
    name: 'product_review',
    description: 'Generate a structured product review request',
    arguments: [
      {
        name: 'product_id',
        description: 'The product identifier to review',
        required: true
      }
    ]
  })
  async getReviewPrompt(args: { product_id: string }, context: ExecutionContext) {
    const product = await this.productService.findById(args.product_id);

    if (!product) {
      throw new Error(`Product not found: ${args.product_id}`);
    }

    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please provide a detailed review for: ${product.name}

Product Details:
- Category: ${product.category}
- Price: $${product.price}
- Description: ${product.description}

Review Criteria:
1. Quality and durability
2. Value for money
3. Key features and benefits
4. Potential improvements
5. Overall recommendation`
        }
      }
    ];
  }
}
```

## Prompt Decorator Options

### Options Reference

```typescript
interface PromptOptions {
  /** Unique prompt identifier (required) */
  name: string;

  /** Human-readable display title (optional) */
  title?: string;

  /** Description of the prompt's purpose (required) */
  description: string;

  /** Input parameters for the prompt */
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}
```

### Complete Example

```typescript
@Prompt({
  name: 'code_review',
  title: 'Code Review Assistant',
  description: 'Generate a comprehensive code review checklist with language-specific best practices',
  arguments: [
    {
      name: 'language',
      description: 'Programming language (typescript, python, go, java)',
      required: true
    },
    {
      name: 'code',
      description: 'The code snippet to review',
      required: true
    },
    {
      name: 'focus_areas',
      description: 'Specific areas to focus on (security, performance, readability)',
      required: false
    }
  ]
})
async getCodeReviewPrompt(
  args: { language: string; code: string; focus_areas?: string },
  ctx: ExecutionContext
) {
  const focusAreas = args.focus_areas?.split(',').map(s => s.trim()) || [
    'correctness',
    'readability',
    'performance',
    'security'
  ];

  const checklistItems = this.getLanguageChecklist(args.language, focusAreas);

  return [
    {
      role: 'user' as const,
      content: `Review the following ${args.language} code:

\`\`\`${args.language}
${args.code}
\`\`\`

Focus Areas: ${focusAreas.join(', ')}

Review Checklist:
${checklistItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Provide specific, actionable feedback for each applicable item.`
    }
  ];
}
```

### Title vs Name

The `title` field provides a human-readable display name, while `name` serves as the unique identifier:

```typescript
@Prompt({
  name: 'station_briefing',      // Internal identifier (snake_case)
  title: 'Station Briefing',     // Display name for UI
  description: 'Generate operational briefing for station personnel'
})
```

## Prompt Arguments

### Required vs Optional Arguments

```typescript
@Prompt({
  name: 'data_analysis',
  description: 'Generate a data analysis request with configurable parameters',
  arguments: [
    {
      name: 'dataset',
      description: 'Identifier of the dataset to analyze',
      required: true  // Must be provided
    },
    {
      name: 'analysis_type',
      description: 'Type of analysis (descriptive, predictive, diagnostic)',
      required: false  // Optional with default
    },
    {
      name: 'output_format',
      description: 'Desired output format (summary, detailed, tabular)',
      required: false
    }
  ]
})
async getAnalysisPrompt(
  args: { dataset: string; analysis_type?: string; output_format?: string },
  ctx: ExecutionContext
) {
  const analysisType = args.analysis_type || 'descriptive';
  const outputFormat = args.output_format || 'summary';

  return [
    {
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Perform ${analysisType} analysis on dataset: ${args.dataset}

Output Format: ${outputFormat}

Please include:
- Key findings and insights
- Statistical summaries where applicable
- Visualizations recommendations
- Actionable conclusions`
      }
    }
  ];
}
```

### Argument Validation

```typescript
@Prompt({
  name: 'report_generation',
  description: 'Generate a business report prompt',
  arguments: [
    { name: 'report_type', description: 'Type of report', required: true },
    { name: 'period', description: 'Reporting period', required: true }
  ]
})
async getReportPrompt(
  args: { report_type: string; period: string },
  ctx: ExecutionContext
) {
  // Validate report type
  const validTypes = ['sales', 'inventory', 'financial', 'operational'];
  if (!validTypes.includes(args.report_type)) {
    throw new Error(
      `Invalid report type: ${args.report_type}. Valid types: ${validTypes.join(', ')}`
    );
  }

  // Validate period format
  const periodRegex = /^(Q[1-4]-\d{4}|\d{4}-\d{2}|\d{4})$/;
  if (!periodRegex.test(args.period)) {
    throw new Error(
      `Invalid period format: ${args.period}. Expected: Q1-2024, 2024-01, or 2024`
    );
  }

  return [
    {
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Generate a ${args.report_type} report for period: ${args.period}`
      }
    }
  ];
}
```

## Response Format

### Standard Response Structure

Prompts return an array of message objects. Content can be a plain string or a structured object:

```typescript
// Simple string content (recommended)
return [
  {
    role: 'user' | 'assistant',
    content: string
  }
];

// Or structured content object
return [
  {
    role: 'user' | 'assistant',
    content: {
      type: 'text',
      text: string
    }
  }
];
```

> **Note**: Use plain string content for simplicity. The server automatically wraps it in the proper MCP format.

### Single Message Prompt

```typescript
@Prompt({ 
  name: 'simple_task', 
  title: 'Simple Task',
  description: 'Simple task prompt' 
})
async getSimplePrompt(args: { task: string }) {
  return [
    {
      role: 'user' as const,
      content: `Please help me with: ${args.task}`
    }
  ];
}
```

### Multi-Turn Conversation Prompt

```typescript
@Prompt({
  name: 'interview_prep',
  title: 'Mock Interview',
  description: 'Start a mock interview session',
  arguments: [
    { name: 'role', description: 'Job role being interviewed for', required: true },
    { name: 'difficulty', description: 'Interview difficulty level', required: false }
  ]
})
async getInterviewPrompt(args: { role: string; difficulty?: string }) {
  const difficulty = args.difficulty || 'intermediate';

  return [
    {
      role: 'user' as const,
      content: `I want to practice for a ${args.role} interview. Please act as the interviewer.`
    },
    {
      role: 'assistant' as const,
      content: `I'll conduct a ${difficulty}-level interview for the ${args.role} position. Let's begin with an introduction. Please tell me about your background and why you're interested in this role.`
    },
    {
      role: 'user' as const,
      content: `I'm ready. Please start with the first question.`
    }
  ];
}
```

### Structured Context Prompt

```typescript
@Prompt({
  name: 'bug_investigation',
  title: 'Debug Assistant',
  description: 'Provide debugging assistance with full context',
  arguments: [
    { name: 'error_message', required: true, description: 'The error message' },
    { name: 'stack_trace', required: false, description: 'Stack trace if available' },
    { name: 'environment', required: false, description: 'Runtime environment' }
  ]
})
async getBugPrompt(
  args: { error_message: string; stack_trace?: string; environment?: string }
) {
  let contextSection = `Error Message:
${args.error_message}`;

  if (args.stack_trace) {
    contextSection += `

Stack Trace:
\`\`\`
${args.stack_trace}
\`\`\``;
  }

  if (args.environment) {
    contextSection += `

Environment: ${args.environment}`;
  }

  return [
    {
      role: 'user' as const,
      content: `I'm encountering an error and need help debugging it.

${contextSection}

Please help me:
1. Understand what the error means
2. Identify the likely cause
3. Suggest potential fixes
4. Recommend debugging steps if the cause isn't clear`
    }
  ];
}
```

## Dynamic Prompts

### Data-Driven Prompts

```typescript
@Prompt({
  name: 'order_analysis',
  description: 'Analyze order and suggest optimizations',
  arguments: [
    { name: 'order_id', required: true, description: 'Order to analyze' }
  ]
})
async getOrderAnalysisPrompt(args: { order_id: string }, ctx: ExecutionContext) {
  const order = await this.orderService.findById(args.order_id);

  if (!order) {
    throw new Error(`Order not found: ${args.order_id}`);
  }

  const orderSummary = `
Order ID: ${order.id}
Customer: ${order.customerName}
Date: ${order.createdAt}
Status: ${order.status}

Items:
${order.items.map(item => `- ${item.name} x${item.quantity} @ $${item.price}`).join('\n')}

Subtotal: $${order.subtotal}
Tax: $${order.tax}
Shipping: $${order.shipping}
Total: $${order.total}`;

  return [
    {
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Analyze this order and provide recommendations:

${orderSummary}

Please provide:
1. Order efficiency analysis
2. Cross-sell opportunities
3. Customer retention suggestions
4. Fulfillment optimization tips`
      }
    }
  ];
}
```

### Template-Based Prompts

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class PromptTemplateService {
  private templates = new Map<string, (data: Record<string, unknown>) => string>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.templates.set('email_draft', (data) => `
Draft a professional email:

To: ${data.recipient}
Subject: ${data.subject}
Context: ${data.context}
Tone: ${data.tone || 'professional'}

Requirements:
- Clear and concise
- Appropriate greeting and closing
- Action items if applicable`);

    this.templates.set('document_summary', (data) => `
Summarize the following document:

${data.content}

Summary Requirements:
- Maximum ${data.maxWords || 200} words
- Key points only
- Maintain original intent`);
  }

  render(templateName: string, data: Record<string, unknown>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return template(data);
  }
}

export class CommunicationPrompts {
  constructor(private templateService: PromptTemplateService) {}

  @Prompt({
    name: 'compose_email',
    description: 'Draft a professional email',
    arguments: [
      { name: 'recipient', required: true, description: 'Email recipient' },
      { name: 'subject', required: true, description: 'Email subject' },
      { name: 'context', required: true, description: 'Context for the email' },
      { name: 'tone', required: false, description: 'Desired tone' }
    ]
  })
  async getEmailPrompt(
    args: { recipient: string; subject: string; context: string; tone?: string }
  ) {
    const text = this.templateService.render('email_draft', args);
    return [
      {
        role: 'user' as const,
        content: { type: 'text' as const, text }
      }
    ];
  }
}
```

## Middleware Integration

### Protected Prompts with Guards

```typescript
import { UseGuards } from '@nitrostack/core';
import { JWTGuard } from './guards/jwt.guard.js';

@Prompt({
  name: 'confidential_analysis',
  description: 'Generate analysis for confidential business data'
})
@UseGuards(JWTGuard)
async getConfidentialPrompt(args: { report_id: string }, ctx: ExecutionContext) {
  const userId = ctx.auth?.subject;
  ctx.logger.info('Confidential prompt accessed', { userId, reportId: args.report_id });

  const report = await this.reportService.getConfidential(args.report_id, userId);

  return [
    {
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Analyze this confidential report:\n\n${JSON.stringify(report, null, 2)}`
      }
    }
  ];
}
```

## Dependency Injection

### Injecting Services

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class MetricsService {
  async getPerformanceMetrics(period: string): Promise<PerformanceMetrics> {
    // Load metrics from database
  }
}

@Injectable()
export class InsightService {
  async generateInsights(data: unknown): Promise<string[]> {
    // Generate AI-powered insights
  }
}

export class AnalyticsPrompts {
  constructor(
    private metricsService: MetricsService,
    private insightService: InsightService
  ) {}

  @Prompt({
    name: 'performance_review',
    description: 'Generate performance review analysis prompt',
    arguments: [
      { name: 'period', required: true, description: 'Review period' },
      { name: 'department', required: false, description: 'Department filter' }
    ]
  })
  async getPerformancePrompt(
    args: { period: string; department?: string },
    ctx: ExecutionContext
  ) {
    const metrics = await this.metricsService.getPerformanceMetrics(args.period);
    const preliminaryInsights = await this.insightService.generateInsights(metrics);

    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Review performance metrics for ${args.period}${args.department ? ` (${args.department})` : ''}:

Metrics:
${JSON.stringify(metrics, null, 2)}

Preliminary Insights:
${preliminaryInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

Please provide:
1. Executive summary
2. Key achievements
3. Areas for improvement
4. Recommendations for next period`
        }
      }
    ];
  }
}
```

## Dynamic Prompt Registration

NitroStack supports dynamic prompt registration at runtime, with automatic client notifications.

### Adding Prompts Dynamically

```typescript
import { McpApplicationFactory } from '@nitrostack/core';

const app = await McpApplicationFactory.create(AppModule);
const server = app.getServer();

// After adding new prompts dynamically
server.notifyPromptsListChanged();
```

### List Changed Notifications

When prompts are added or removed at runtime, the server sends a `notifications/prompts/list_changed` notification to all connected clients. This enables:

1. **Dynamic content**: Add prompts based on user context or preferences
2. **A/B testing**: Expose different prompts to different users
3. **Plugin systems**: Load prompts from external modules
4. **Feature flags**: Enable/disable prompts dynamically

## Best Practices

### 1. Write Clear Descriptions

```typescript
// Recommended: Specific, actionable description
@Prompt({
  name: 'refactor_code',
  title: 'Code Refactoring Assistant',
  description: 'Generate refactoring suggestions with focus on clean code principles and design patterns'
})

// Avoid: Vague description
@Prompt({
  name: 'refactor_code',
  description: 'Refactor code'
})
```

### 2. Provide Structured Context

```typescript
// Recommended: Structured prompt with clear sections
return [{
  role: 'user' as const,
  content: {
    type: 'text' as const,
    text: `Task: Review and improve this API endpoint

Code:
\`\`\`typescript
${args.code}
\`\`\`

Review Criteria:
- Error handling completeness
- Input validation
- Security considerations
- Performance implications

Output Format:
- Issue description
- Severity (critical/warning/suggestion)
- Recommended fix
- Code example`
  }
}];

// Avoid: Unstructured prompt
return [{
  role: 'user' as const,
  content: {
    type: 'text' as const,
    text: `Review this: ${args.code}`
  }
}];
```

### 3. Validate Arguments Early

```typescript
@Prompt({ name: 'translate_document', description: 'Translate document content' })
async getTranslationPrompt(args: { text: string; target_language: string }) {
  // Validate early
  if (!args.text || args.text.trim().length === 0) {
    throw new Error('Text content is required for translation');
  }

  const supportedLanguages = ['en', 'es', 'fr', 'de', 'ja', 'zh'];
  if (!supportedLanguages.includes(args.target_language)) {
    throw new Error(
      `Unsupported language: ${args.target_language}. Supported: ${supportedLanguages.join(', ')}`
    );
  }

  // Proceed with validated input
  return [{
    role: 'user' as const,
    content: {
      type: 'text' as const,
      text: `Translate the following to ${args.target_language}:\n\n${args.text}`
    }
  }];
}
```

### 4. Use Consistent Naming

```typescript
// Recommended: snake_case, verb_noun or noun pattern
'generate_report'
'code_review'
'data_analysis'
'document_summary'

// Avoid: Inconsistent naming
'generateReport'    // camelCase
'Review'           // Single word, unclear
'do_stuff'         // Vague
```

### 5. Design for Reusability

```typescript
// Recommended: Parameterized, reusable prompts
@Prompt({
  name: 'document_review',
  arguments: [
    { name: 'document_type', required: true },
    { name: 'content', required: true },
    { name: 'review_focus', required: false }
  ]
})
async getDocumentReviewPrompt(args: DocumentReviewArgs) {
  // Works for contracts, proposals, reports, etc.
}

// Avoid: Overly specific prompts
@Prompt({ name: 'review_q1_2024_sales_report' })  // Too specific
```

## Related Documentation

- [Tools Guide](./04-tools-guide.md) - Creating callable tools
- [Resources Guide](./05-resources-guide.md) - Exposing data resources
- [Middleware Guide](./07-middleware-guide.md) - Request/response pipeline
- [Guards Guide](../../api-reference/guards.md) - Access control
- [Dependency Injection](./12-dependency-injection.md) - Service injection patterns
- [Events Guide](./15-events-guide.md) - Event-driven architecture
