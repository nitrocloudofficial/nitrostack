import { ToolDecorator as Tool, ControllerDecorator as Controller, z, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Controller()
export class SourceControlTools {
    @Tool({
        name: 'diff_recent_commits',
        description: 'Compares recent git commits to find code that matches the error stack trace.',
        inputSchema: z.object({
            file_path: z.string().min(5).regex(/\.js|\.ts|\.json$/, 'File path must end with .js, .ts, or .json').describe('The specific file mentioned in the stack trace'),
            error_message: z.string().optional().describe('The error signature to search for')
        })
    })
    async diffCommits(input: { file_path: string, error_message?: string }, ctx: ExecutionContext) {
        ctx.logger.info(`Searching Git history for changes in ${input.file_path}`);
        const schema = z.object({
            file_path: z.string().min(5).regex(/\.js|\.ts|\.json$/, 'File path must end with .js, .ts, or .json'),
            error_message: z.string().optional()
        });
        const parseResult = schema.safeParse(input);
        if (!parseResult.success) {
            return {
                success: false,
                error: `Validation failed: ${parseResult.error.errors.map(e => e.message).join(', ')}`
            };
        }

        try {
            const dataPath = path.resolve(__dirname, '../../src/data/mock-infrastructure.json');
            let fileContent;
            
            try {
                fileContent = fs.readFileSync(dataPath, 'utf-8');
            } catch (fsError: any) {
                if (fsError.code === 'ENOENT') {
                    return { success: false, error: 'mock-infrastructure.json not found in src/data directory.' };
                }
                throw fsError;
            }

            const mockData = JSON.parse(fileContent);
            
            // Just matching the basename for mock purposes
            const baseName = path.basename(input.file_path);
            const commitData = mockData.commits?.[baseName];

            if (!commitData) {
                return { success: false, error: `No recent commits found matching the criteria in ${input.file_path}.` };
            }

            return {
                success: true,
                ...commitData
            };
        } catch (error: any) {
            ctx.logger.error(`Error in diffCommits: ${error.message}`);
            return {
                success: false,
                error: `Internal tool error: ${error.message}`
            };
        }
    }
}
