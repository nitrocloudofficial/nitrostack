---
name: nitrostack-tools-resources-prompts
description: Guidelines and patterns for defining Tools, Resources, and Prompts in a NitroStack application with schema validation via Zod, including caching, rate-limiting, and base64 file uploads.
---

## When to Use
Use this skill whenever you are defining, editing, or validating tools, resources, or prompts on a NitroStack MCP server.

## Defining Tools with `@Tool`
An MCP tool exposes a function that an AI client can invoke. Decorate a service or controller method with `@Tool`.

### Key Tool Options:
* `name`: Kebab-case or snake_case unique identifier.
* `description`: Detailed description explaining when and how the client should use it.
* `inputSchema`: A Zod object schema for strict validation of inputs.
* `outputSchema` (optional): Zod schema validating the output structure.

```typescript
import { ToolDecorator as Tool, ControllerDecorator as Controller, InitialTool, z, ExecutionContext } from '@nitrostack/core';

@Controller('weather')
export class WeatherService {
  @Tool({
    name: 'get_current_weather',
    description: 'Get the current weather forecast for a specific city.',
    inputSchema: z.object({
      city: z.string().describe('The name of the city, e.g., San Francisco'),
      unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
    }),
  })
  @InitialTool() // Auto-invoked when the AI client initializes/starts
  async getWeather(
    input: { city: string; unit: 'celsius' | 'fahrenheit' },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Fetching weather for ${input.city}`);
    // implementation
    return {
      city: input.city,
      temp: 22,
      condition: 'Sunny',
    };
  }
}
```

## Defining Resources with `@Resource`
An MCP resource exposes static or dynamic data files/URIs that the AI client can read.

### Key Resource Options:
* `uri`: URI pattern (e.g., `git://{owner}/{repo}/file` or static `app://config`).
* `name`: Unique name of the resource.
* `description`: Explanation of what data this resource provides.
* `mimeType`: Mime type of the response (e.g., `text/plain`, `application/json`).

```typescript
import { Resource, ExecutionContext } from '@nitrostack/core';

export class ConfigResources {
  @Resource({
    uri: 'app://settings',
    name: 'Application Settings',
    description: 'System-wide configuration settings and parameters.',
    mimeType: 'application/json',
  })
  async getSettings(ctx: ExecutionContext) {
    return {
      environment: 'development',
      debugMode: true,
    };
  }
}
```

## Defining Prompts with `@Prompt`
An MCP prompt exposes reusable templates or instruction sets that guide LLMs.

### Key Prompt Options:
* `name`: Name of the prompt.
* `description`: Describes what task this prompt helps accomplish.
* `arguments`: Declares parameters the client can supply to customize the prompt template.

```typescript
import { Prompt, ExecutionContext } from '@nitrostack/core';

export class PromptTemplates {
  @Prompt({
    name: 'code_review',
    description: 'Provide an intensive code review for a given code snippet.',
    arguments: [
      { name: 'language', description: 'The programming language, e.g., TypeScript', required: true },
      { name: 'code', description: 'The code snippet to review', required: true },
    ],
  })
  async getCodeReviewPrompt(
    args: { language: string; code: string },
    ctx: ExecutionContext
  ) {
    return {
      messages: [
        {
          role: 'user',
          content: `You are an expert software engineer. Review this ${args.language} code:\n\n${args.code}`,
        },
      ],
    };
  }
}
```

---

## Tool Policies: Caching (`@Cache`) and Rate Limiting (`@RateLimit`)
You can control tool execution behaviors (such as performance optimization and throttling) using method decorators.

### 1. Caching with `@Cache`
Use `@Cache` to cache tool execution outputs for a specified duration (TTL in seconds). This reduces database or API overhead for frequent identical requests.

#### Options:
* `ttl`: Cache time-to-live in seconds (required).
* `key` (optional): Custom function `(input: any, context?: any) => string` that returns a unique cache key based on inputs. If not defined, a key is auto-generated from serialized input arguments.

#### Example:
```typescript
import { ToolDecorator as Tool, Cache, z } from '@nitrostack/core';

export class StationTools {
  @Tool({
    name: 'get_system_status',
    description: 'Fetch real-time station metrics. Response is cached.',
    inputSchema: z.object({}),
  })
  @Cache({ ttl: 60 }) // Caches status for 60 seconds
  async getSystemStatus() {
    return { temperature: 21.5, oxygen: 0.98 };
  }

  @Tool({
    name: 'get_crew_status',
    description: 'Fetch status of a crew member. Cached by crew ID.',
    inputSchema: z.object({ id: z.string() }),
  })
  @Cache({
    ttl: 300,
    key: (input) => `crew:status:${input.id}`
  })
  async getCrewStatus(input: { id: string }) {
    // ...
  }
}
```

### 2. Rate Limiting with `@RateLimit`
Use `@RateLimit` to restrict the number of tool invocations within a specified time window to prevent client abuse.

#### Options:
* `requests`: Number of allowed requests in the window (required).
* `window`: Throttling duration window (required). Supports formats like `'1s'`, `'1m'`, `'1h'`.
* `key` (optional): Custom function `(context: ExecutionContext) => string` to group rate limits. Useful for rate-limiting per user role or API key.

#### Example:
```typescript
import { ToolDecorator as Tool, RateLimit, z, ExecutionContext } from '@nitrostack/core';

export class DiagnosticTools {
  @Tool({
    name: 'run_deep_diagnostic',
    description: 'Run intensive diagnostics. Rate limited.',
    inputSchema: z.object({}),
  })
  @RateLimit({ requests: 3, window: '1m' }) // Max 3 requests per minute globally
  async runDeepDiagnostic() {
    return { diagnosticReport: 'All systems operational.' };
  }

  @Tool({
    name: 'request_supply_drop',
    description: 'Request inventory supplies. Rate limited per user.',
    inputSchema: z.object({ item: z.string() }),
  })
  @RateLimit({
    requests: 5,
    window: '1h',
    key: (ctx: ExecutionContext) => ctx.auth?.subject || 'anonymous'
  })
  async requestSupply(input: { item: string }, ctx: ExecutionContext) {
    // ...
  }
}
```

---

## Handling File Uploads in Tools
NitroStack supports file uploads from MCP clients (like NitroStudio) by passing the file as a base64-encoded string inside a tool's input parameters.

### 1. Declaring Input Schema for File Uploads
To accept an uploaded file, define three Zod fields in your tool's `inputSchema`:
* `file_name`: The name of the file (e.g. `report.csv`).
* `file_type`: The MIME type (e.g. `text/csv`).
* `file_content`: The base64-encoded string containing the file data.

```typescript
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class FileTools {
  @Tool({
    name: 'upload_document',
    description: 'Upload a text document or image.',
    inputSchema: z.object({
      file_name: z.string().describe('Name of the uploaded file'),
      file_type: z.string().describe('MIME type of the uploaded file'),
      file_content: z.string().describe('Base64 encoded file content'),
    })
  })
  async uploadDocument(input: any, ctx: ExecutionContext) {
    // Processing logic
  }
}
```

### 2. Decoding Base64 Payloads
File uploads can arrive in two formats depending on the client:
1. **Data URL format**: `data:image/png;base64,iVBORw0KGgo...`
2. **Raw Base64 format**: `iVBORw0KGgo...`

Use the following universal decoder pattern to parse either format into a Node `Buffer`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

function decodeBase64File(content: string): Buffer {
  const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (matches && matches.length === 3) {
    // Data URL format - decode matches[2]
    return Buffer.from(matches[2], 'base64');
  } else {
    // Raw base64 format - decode input directly
    return Buffer.from(content, 'base64');
  }
}
```

### 3. Secure File Saving Example
Always validate the directory paths to prevent directory traversal attacks when saving files to disk.

```typescript
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export class SecureUploadTools {
  @Tool({
    name: 'save_uploaded_file',
    description: 'Decodes and saves an uploaded file securely.',
    inputSchema: z.object({
      file_name: z.string().describe('Name of the uploaded file'),
      file_type: z.string().describe('MIME type of the uploaded file'),
      file_content: z.string().describe('Base64 encoded file content'),
    })
  })
  async saveFile(input: any, ctx: ExecutionContext) {
    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Secure destination path to prevent path traversal
    const safeName = path.basename(input.file_name);
    const filePath = path.join(UPLOAD_DIR, safeName);
    if (!filePath.startsWith(UPLOAD_DIR)) {
      throw new Error('Invalid file path detected (path traversal).');
    }

    // Decode and write to disk
    const buffer = decodeBase64File(input.file_content);
    fs.writeFileSync(filePath, buffer);

    ctx.logger.info(`Successfully saved file: ${safeName}`);
    return { success: true, path: filePath };
  }
}
```
