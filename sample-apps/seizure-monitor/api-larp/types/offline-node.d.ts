declare module 'node:crypto' { export function createHash(name:string): { update(value:string): any; digest(encoding:'hex'): string }; }
declare module 'node:test' { const test: (name:string, fn:()=>void|Promise<void>)=>void; export default test; }
declare module 'node:assert/strict' { const assert: any; export default assert; }
