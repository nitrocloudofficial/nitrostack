import { ToolDecorator as Tool, Widget, UseMiddleware, UsePipes, ExecutionContext, z } from '@nitrostack/core';
import { LoggingMiddleware, ValidationPipe } from '../middleware/logger.middleware.js';

/**
 * README Generator
 *
 * Formats a project description, feature list, tech stack, and install
 * steps into a clean GitHub-flavored README.md document.
 */

function defaultInstallSteps(techStack: string[]): string[] {
  const hasNode = techStack.some((t) => /node|react|next|typescript|javascript|npm/i.test(t));
  const hasPython = techStack.some((t) => /python|django|flask/i.test(t));

  const steps: string[] = ['Clone the repository', 'Navigate into the project directory'];
  if (hasNode) steps.push('Run `npm install` to install dependencies', 'Run `npm run dev` to start the app');
  else if (hasPython) steps.push('Run `pip install -r requirements.txt` to install dependencies', 'Run `python main.py` to start the app');
  else steps.push('Install project dependencies', 'Run the project following your platform\'s standard start command');

  return steps;
}

export class ReadmeTools {
  @Tool({
    name: 'generate_readme',
    description: 'Formats project description, features, tech stack, and installation steps into a clean GitHub README.md document.',
    inputSchema: z.object({
      project_name: z.string().describe('Name of the project'),
      description: z.string().describe('One or two sentence project description'),
      features: z.array(z.string()).min(1).describe('List of key features'),
      tech_stack: z.array(z.string()).min(1).describe('Technologies/frameworks/languages used'),
      installation_steps: z.array(z.string()).optional().describe('Custom install steps; auto-generated from tech_stack if omitted'),
      usage: z.string().optional().describe('Short usage example or instructions'),
      license: z.string().optional().describe('License name, defaults to MIT'),
      author: z.string().optional().describe('Author or team name')
    }),
    examples: {
      request: {
        project_name: 'Campus Event Finder',
        description: 'Helps students discover and RSVP to campus events.',
        features: ['Event search', 'RSVP tracking'],
        tech_stack: ['React', 'Node.js']
      },
      response: {
        markdown: '# Campus Event Finder\n\n...'
      }
    }
  })
  @Widget('readme-preview')
  @UseMiddleware(LoggingMiddleware)
  @UsePipes(ValidationPipe)
  async generateReadme(input: any, ctx: ExecutionContext) {
    const license = input.license || 'MIT';
    const installSteps: string[] = input.installation_steps?.length
      ? input.installation_steps
      : defaultInstallSteps(input.tech_stack);

    const sections: string[] = [];

    sections.push(`# ${input.project_name}`);
    sections.push(input.description);

    if (input.author) {
      sections.push(`_Built by ${input.author}_`);
    }

    sections.push('## ✨ Features', input.features.map((f: string) => `- ${f}`).join('\n'));

    sections.push('## 🛠 Tech Stack', input.tech_stack.map((t: string) => `- ${t}`).join('\n'));

    sections.push(
      '## 🚀 Installation',
      installSteps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n')
    );

    if (input.usage) {
      sections.push('## 📖 Usage', input.usage);
    }

    sections.push('## 📄 License', `This project is licensed under the ${license} License.`);

    const markdown = sections.join('\n\n') + '\n';

    ctx.logger.info('Generated README', {
      project: input.project_name,
      features: input.features.length,
      techStack: input.tech_stack.length
    });

    return {
      project_name: input.project_name,
      markdown,
      sections: {
        features: input.features,
        tech_stack: input.tech_stack,
        installation_steps: installSteps,
        usage: input.usage ?? null,
        license
      }
    };
  }
}
