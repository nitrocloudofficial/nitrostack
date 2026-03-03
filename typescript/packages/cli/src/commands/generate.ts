import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {
  createHeader,
  createSuccessBox,
  createErrorBox,
  log,
  spacer,
  nextSteps,
  brand,
  NITRO_BANNER_FULL,
  showFooter
} from '../ui/branding.js';
import { trackEvent, shutdownAnalytics } from '../analytics/posthog.js';

/**
 * Generator templates
 */
const TEMPLATES = {
  middleware: (name: string) => `import { Middleware, MiddlewareInterface, ExecutionContext } from '@nitrostack/core';

/**
 * ${name}
 * 
 * TODO: Add description
 */
@Middleware()
export class ${name} implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>) {
    // Before handler
    console.log(\`[\${context.toolName}] Started\`);
    
    const result = await next();
    
    // After handler
    console.log(\`[\${context.toolName}] Completed\`);
    
    return result;
  }
}
`,

  interceptor: (name: string) => `import { Interceptor, InterceptorInterface, ExecutionContext } from '@nitrostack/core';

/**
 * ${name}
 * 
 * TODO: Add description
 */
@Interceptor()
export class ${name} implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>) {
    const result = await next();
    
    // Transform response
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
`,

  pipe: (name: string) => `import { Pipe, PipeInterface, ArgumentMetadata } from '@nitrostack/core';

/**
 * ${name}
 * 
 * TODO: Add description
 */
@Pipe()
export class ${name} implements PipeInterface {
  transform(value: unknown, metadata: ArgumentMetadata) {
    // Validate
    if (!value) {
      throw new Error('Value is required');
    }
    
    // Transform
    return value;
  }
}
`,

  filter: (name: string) => `import { ExceptionFilter, ExceptionFilterInterface, ExecutionContext } from '@nitrostack/core';

/**
 * ${name}
 * 
 * TODO: Add description
 */
@ExceptionFilter()
export class ${name} implements ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext) {
    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    context.logger.error('Exception caught', {
      tool: context.toolName,
      error: errorMessage,
    });
    
    return {
      error: true,
      message: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }
}
`,

  service: (name: string) => `import { Injectable } from '@nitrostack/core';

/**
 * ${name}
 * 
 * TODO: Add description
 */
@Injectable()
export class ${name} {
  // Add your service methods here
  
  async findOne(id: string): Promise<Record<string, unknown>> {
    // TODO: Implement
    return { id };
  }
  
  async findAll(): Promise<Record<string, unknown>[]> {
    // TODO: Implement
    return [];
  }
  
  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    // TODO: Implement
    return { id: '1', ...data };
  }
  
  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    // TODO: Implement
    return { id, ...data };
  }
  
  async delete(id: string): Promise<void> {
    // TODO: Implement
  }
}
`,

  guard: (name: string) => `import { Guard, ExecutionContext } from '@nitrostack/core';

/**
 * ${name}
 * 
 * TODO: Add description
 */
export class ${name} implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // TODO: Implement your guard logic
    
    // Example: Check if user has required role
    const userRole = context.auth?.role;
    
    if (!userRole) {
      throw new Error('Authentication required');
    }
    
    // Check role
    if (userRole !== 'admin') {
      throw new Error('Insufficient permissions');
    }
    
    return true;
  }
}
`,

  health: (name: string) => `import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';

/**
 * ${name}
 * 
 * TODO: Add description
 */
@HealthCheck({ 
  name: '${name.toLowerCase().replace(/healthcheck$/, '').replace(/health$/, '')}',
  description: 'TODO: Add description',
  interval: 30 // Check every 30 seconds
})
export class ${name} implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    try {
      // TODO: Implement health check logic
      
      return {
        status: 'up',
        message: 'Service is healthy',
      };
    } catch (error: unknown) {
      return {
        status: 'down',
        message: 'Service is down',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
`,

  module: (name: string) => `import { Module } from '@nitrostack/core';
import { ${name}Tools } from './${name.toLowerCase()}.tools.js';
import { ${name}Resources } from './${name.toLowerCase()}.resources.js';
import { ${name}Prompts } from './${name.toLowerCase()}.prompts.js';

@Module({
  name: '${name.toLowerCase()}',
  description: 'TODO: Add description',
  controllers: [${name}Tools, ${name}Resources, ${name}Prompts],
})
export class ${name}Module {}
`,

  tools: (name: string) => `import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';

/**
 * ${name} Tools
 * 
 * TODO: Add description
 */
@Injectable()
export class ${name}Tools {
  @Tool({
    name: '${name.toLowerCase()}_example',
    description: 'TODO: Add description',
    inputSchema: z.object({
      id: z.string().describe('ID parameter'),
    }),
  })
  async exampleTool(input: { id: string }, context: ExecutionContext) {
    // TODO: Implement tool logic
    return { id: input.id, result: 'success' };
  }
}
`,

  resources: (name: string) => `import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * ${name} Resources
 * 
 * TODO: Add description
 */
export class ${name}Resources {
  @Resource({
    uri: '${name.toLowerCase()}://example',
    name: 'Example Resource',
    description: 'TODO: Add description',
    mimeType: 'application/json',
  })
  async exampleResource(context: ExecutionContext) {
    // TODO: Implement resource logic
    return {
      type: 'text' as const,
      text: JSON.stringify({ example: 'data' }, null, 2),
    };
  }
}
`,

  prompts: (name: string) => `import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * ${name} Prompts
 * 
 * TODO: Add description
 */
export class ${name}Prompts {
  @Prompt({
    name: '${name.toLowerCase()}-help',
    description: 'TODO: Add description',
  })
  async helpPrompt(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'TODO: Add prompt content',
        },
      },
    ];
  }
}
`,
};

/**
 * Get file path for generated file
 */
function getFilePath(type: string, name: string, module?: string): string {
  const basePath = process.cwd();

  if (module) {
    return path.join(basePath, 'src', 'modules', module, `${module}.${type}.ts`);
  }

  const dirMap: Record<string, string> = {
    middleware: 'middleware',
    interceptor: 'interceptors',
    pipe: 'pipes',
    filter: 'filters',
    service: 'services',
    guard: 'guards',
    health: 'health',
  };

  const dir = dirMap[type] || type;
  const fileName = name.toLowerCase().replace(/\s+/g, '-') + '.ts';

  return path.join(basePath, 'src', dir, fileName);
}

interface GenerateOptions {
  module?: string;
  output?: string;
  force?: boolean;
  skipRelated?: boolean;
}

/**
 * Generate command
 */
export async function generate(type: string, name: string, options: GenerateOptions = {}): Promise<void> {
  console.log(NITRO_BANNER_FULL);

  trackEvent('cli_command_invoked', {
    command: 'generate',
    options: Object.keys(options).filter(k => options[k as keyof GenerateOptions] !== undefined),
  });

  // Special case for types generation
  if (type === 'types') {
    const { generateTypes } = await import('./generate-types.js');
    await generateTypes(options);
    return;
  }

  console.log(createHeader('Generate', `Creating ${type}: ${name}`));

  // Validate type
  const validTypes = Object.keys(TEMPLATES);
  if (!validTypes.includes(type)) {
    spacer();
    console.log(createErrorBox('Invalid Type', `Valid types: ${validTypes.join(', ')}, types`));
    trackEvent('cli_generate_failed', { component_type: type, error: 'Invalid type' });
    await shutdownAnalytics();
    process.exit(1);
  }

  // Get template
  const template = TEMPLATES[type as keyof typeof TEMPLATES](name);
  const generatedFiles: string[] = [];

  // Determine file path
  let filePath: string;

  if (type === 'module' || type === 'tools' || type === 'resources' || type === 'prompts') {
    const moduleName = options.module || name.toLowerCase();
    filePath = getFilePath(type, name, moduleName);

    // Create module directory if it doesn't exist
    const moduleDir = path.dirname(filePath);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }
  } else {
    filePath = getFilePath(type, name);

    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Check if file already exists
  if (fs.existsSync(filePath) && !options.force) {
    spacer();
    console.log(createErrorBox('File Exists', 'Use --force to overwrite if you want to replace the existing file.'));
    log(`Path: ${path.relative(process.cwd(), filePath)}`, 'dim');
    trackEvent('cli_generate_failed', { component_type: type, error: 'File exists' });
    await shutdownAnalytics();
    process.exit(1);
  }

  // Write file
  fs.writeFileSync(filePath, template, 'utf-8');
  generatedFiles.push(path.relative(process.cwd(), filePath));
  log(`Created ${type}: ${chalk.cyan(path.relative(process.cwd(), filePath))}`, 'success');

  // If generating a module, create all related files
  if (type === 'module' && !options.skipRelated) {
    const moduleName = name;
    const moduleDir = path.dirname(filePath);

    const toolsPath = path.join(moduleDir, `${name.toLowerCase()}.tools.ts`);
    const resourcesPath = path.join(moduleDir, `${name.toLowerCase()}.resources.ts`);
    const promptsPath = path.join(moduleDir, `${name.toLowerCase()}.prompts.ts`);

    if (!fs.existsSync(toolsPath)) {
      fs.writeFileSync(toolsPath, TEMPLATES.tools(moduleName), 'utf-8');
      generatedFiles.push(path.relative(process.cwd(), toolsPath));
      log(`Created tools: ${chalk.cyan(path.relative(process.cwd(), toolsPath))}`, 'success');
    }

    if (!fs.existsSync(resourcesPath)) {
      fs.writeFileSync(resourcesPath, TEMPLATES.resources(moduleName), 'utf-8');
      generatedFiles.push(path.relative(process.cwd(), resourcesPath));
      log(`Created resources: ${chalk.cyan(path.relative(process.cwd(), resourcesPath))}`, 'success');
    }

    if (!fs.existsSync(promptsPath)) {
      fs.writeFileSync(promptsPath, TEMPLATES.prompts(moduleName), 'utf-8');
      generatedFiles.push(path.relative(process.cwd(), promptsPath));
      log(`Created prompts: ${chalk.cyan(path.relative(process.cwd(), promptsPath))}`, 'success');
    }
  }

  // Summary
  spacer();
  console.log(createSuccessBox('Generation Complete', [
    ...generatedFiles,
    '',
    chalk.dim(`Type: ${type}`),
    chalk.dim(`Name: ${name}`)
  ]));

  nextSteps([
    'Open the generated file and implement the TODOs',
    'Register the component in your module',
    'Build and test your changes',
  ]);

  showFooter();

  trackEvent('cli_generate_completed', {
    component_type: type,
    has_module_flag: !!options.module,
    files_generated: generatedFiles.length,
    used_force: !!options.force,
  });
  await shutdownAnalytics();
}
