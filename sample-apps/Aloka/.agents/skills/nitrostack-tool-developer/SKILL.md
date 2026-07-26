---
name: nitrostack-tool-developer
description: NitroStack Server Development Standard
---
# NitroStack Server Development Standard
When writing or modifying any MCP server in `packages/mcp-servers/`:
1. Use `@nitrostack/core` decorators exclusively (@Module, @Tool, @Resource, @Injectable).
2. NEVER write raw JSON-RPC handlers manually. All tools must be class methods decorated with `@Tool`.
3. Validate ALL inputs using Zod schemas (`z.object({...})`).
4. Keep logic in `@Injectable()` service classes injected via constructor, not inside the `@Tool` method.
5. Limit payload output size to maximum 4KB by trimming logs/trace spans prior to returning.
6. Pass all output through `Sanitizer.scrub()` to prevent leaking API keys or secrets.
