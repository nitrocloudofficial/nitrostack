import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesystemTools {
  private resolveSafePath(userPath: string): string {
    const rootDir = process.cwd();
    // Resolve relative path to absolute
    const resolvedPath = path.isAbsolute(userPath) 
      ? path.normalize(userPath) 
      : path.normalize(path.join(rootDir, userPath));

    // Ensure the path is within the workspace directory
    if (!resolvedPath.startsWith(rootDir)) {
      throw new Error(`Access Denied: Path "${userPath}" is outside the project root directory.`);
    }
    return resolvedPath;
  }

  @Tool({
    name: 'read_file',
    description: 'Read the contents of a file in the workspace.',
    inputSchema: z.object({
      path: z.string().describe('The path to the file (relative to project root or absolute)')
    }),
    examples: {
      request: { path: 'package.json' },
      response: { content: '{\n  "name": "medtriage-mcp" ... }' }
    }
  })
  async readFile(input: { path: string }, ctx: ExecutionContext) {
    const safePath = this.resolveSafePath(input.path);
    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${input.path}`);
    }
    const stat = fs.statSync(safePath);
    if (!stat.isFile()) {
      throw new Error(`Path is not a file: ${input.path}`);
    }
    const content = fs.readFileSync(safePath, 'utf-8');
    return { content };
  }

  @Tool({
    name: 'write_file',
    description: 'Write or overwrite contents of a file in the workspace.',
    inputSchema: z.object({
      path: z.string().describe('The path to the file (relative to project root or absolute)'),
      content: z.string().describe('The content to write to the file')
    }),
    examples: {
      request: { path: 'test.txt', content: 'hello world' },
      response: { success: true, path: 'test.txt' }
    }
  })
  async writeFile(input: { path: string; content: string }, ctx: ExecutionContext) {
    const safePath = this.resolveSafePath(input.path);
    // Ensure parent directory exists
    const parentDir = path.dirname(safePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(safePath, input.content, 'utf-8');
    return { success: true, path: input.path };
  }

  @Tool({
    name: 'list_directory',
    description: 'List contents of a directory in the workspace.',
    inputSchema: z.object({
      path: z.string().default('.').describe('The path to the directory (relative to project root or absolute)')
    }),
    examples: {
      request: { path: '.' },
      response: { files: [{ name: 'package.json', type: 'file', size: 919 }] }
    }
  })
  async listDirectory(input: { path: string }, ctx: ExecutionContext) {
    const safePath = this.resolveSafePath(input.path);
    if (!fs.existsSync(safePath)) {
      throw new Error(`Directory not found: ${input.path}`);
    }
    const stat = fs.statSync(safePath);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${input.path}`);
    }
    const rawFiles = fs.readdirSync(safePath);
    const files = rawFiles.map(file => {
      const filePath = path.join(safePath, file);
      const fileStat = fs.statSync(filePath);
      return {
        name: file,
        type: fileStat.isDirectory() ? 'directory' : 'file',
        size: fileStat.isFile() ? fileStat.size : undefined
      };
    });
    return { files };
  }
}
