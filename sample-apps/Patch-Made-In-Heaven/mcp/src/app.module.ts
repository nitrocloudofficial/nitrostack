import { McpApp, Module } from '@nitrostack/core';
import { SearchTools } from './tools/search.tool.js';
import { RetrieveTools } from './tools/retrieve.tool.js';
import { VerifyTools } from './tools/verify.tool.js';
import { SubmitTools } from './tools/submit.tool.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'patch-made-in-heaven-mcp',
    version: '1.0.0',
  },
})
@Module({
  name: 'app',
  // `controllers` (not `providers`) is what @nitrostack/core actually scans
  // for @Tool/@Resource/@Prompt-decorated methods — see DOUBTS.md for the
  // full story of how this was found. VerifyTools/SubmitTools join the
  // registered set in Phase 3, now that the real verify_fix/submit_fix trust
  // chain (Checkpoints 2-4) exists — see DECISIONS.md Decision 009.
  controllers: [SearchTools, RetrieveTools, VerifyTools, SubmitTools],
})
export class AppModule {}
export default AppModule;
