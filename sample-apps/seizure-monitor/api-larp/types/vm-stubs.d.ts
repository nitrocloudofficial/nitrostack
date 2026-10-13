declare var process: any;
declare var Buffer: { from(input: string, encoding?: string): { toString(encoding?: string): string } };
declare module 'dotenv/config' {}
declare module 'node:crypto' { export function createHash(name:string): any; export function randomUUID(): string; }
declare module 'node:fs/promises' { export const readFile:any; export const writeFile:any; export const cp:any; export const mkdir:any; }
declare module 'node:path' { const path:any; export default path; }
declare module '@nitrostack/core' {
  export const z:any; export type ExecutionContext=any;
  export function McpApp(o:any):ClassDecorator; export function Module(o:any):ClassDecorator; export function Injectable(o?:any):ClassDecorator;
  export function ToolDecorator(o:any):MethodDecorator; export function ResourceDecorator(o:any):MethodDecorator; export function PromptDecorator(o:any):MethodDecorator;
  export function Widget(n:string):MethodDecorator; export function HealthCheck(n:string):MethodDecorator;
  export const McpApplicationFactory:any;
}
declare module 'zod' { export const z:any; }
declare module 'node:test' { const test:any; export default test; }
declare module 'node:assert/strict' { const assert:any; export default assert; }
