import { ToolDecorator as Tool, ControllerDecorator as Controller, z, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Controller()
export class ObservabilityTools {
    @Tool({
        name: 'fetch_recent_errors',
        description: 'Fetches the latest error stack traces from the production service.',
        inputSchema: z.object({
            service_name: z.string().min(3).regex(/^[a-zA-Z0-9_-]+$/, 'Service name must only contain alphanumeric characters, dashes, and underscores').describe('The name of the service to check (e.g. payment_gateway)'),
        })
    })
    async fetchErrors(input: { service_name: string }, ctx: ExecutionContext) {
        ctx.logger.info(`Agent requested logs for ${input.service_name}`);
        const schema = z.object({
            service_name: z.string().min(3).regex(/^[a-zA-Z0-9_-]+$/, 'Service name must only contain alphanumeric characters, dashes, and underscores')
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
            const serviceLogs = mockData.logs?.[input.service_name] || mockData.services?.[input.service_name]?.log;

            if (!serviceLogs) {
                return { success: false, error: `No logs found for service: ${input.service_name}` };
            }

            return {
                success: true,
                logs: serviceLogs,
                status: 'found_errors'
            };
        } catch (error: any) {
            ctx.logger.error(`Error in fetchErrors: ${error.message}`);
            return {
                success: false,
                error: `Internal tool error: ${error.message}`
            };
        }
    }
}
