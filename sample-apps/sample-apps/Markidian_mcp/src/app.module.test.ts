import { expect, test, describe } from 'vitest';
import { McpApplicationFactory, extractTools } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { MarkdownifyTools } from './modules/markdownify/markdownify.tools.js';
import { ObsidianTools } from './modules/obsidian/obsidian.tools.js';

describe('AppModule NitroStack Server', () => {
  test('extracts all expected tools from MarkdownifyTools controller', () => {
    const tools = extractTools(MarkdownifyTools);
    const toolNames = tools.map((t) => t.options.name);
    
    expect(toolNames).toContain('youtube-to-markdown');
    expect(toolNames).toContain('pdf-to-markdown');
    expect(toolNames).toContain('bing-search-to-markdown');
    expect(toolNames).toContain('webpage-to-markdown');
    expect(toolNames).toContain('image-to-markdown');
    expect(toolNames).toContain('audio-to-markdown');
    expect(toolNames).toContain('docx-to-markdown');
    expect(toolNames).toContain('xlsx-to-markdown');
    expect(toolNames).toContain('pptx-to-markdown');
    expect(toolNames).toContain('git-repo-to-markdown');
    expect(toolNames).toContain('get-markdown-file');
    expect(tools.length).toBe(11);
  });

  test('extracts all expected tools from ObsidianTools controller', () => {
    const tools = extractTools(ObsidianTools);
    const toolNames = tools.map((t) => t.options.name);

    expect(toolNames).toContain('obsidian-generate-quiz');
    expect(toolNames).toContain('obsidian-show-graph');
    expect(toolNames).toContain('obsidian-convert-and-save');
    expect(toolNames).toContain('obsidian-generate-topic-note');
    expect(toolNames).toContain('obsidian-fill-uncreated-links');
    expect(toolNames).toContain('obsidian-save-note');
    expect(toolNames).toContain('obsidian-list-notes');
    expect(toolNames).toContain('obsidian-get-note');
    expect(toolNames).toContain('obsidian-append-note');
    expect(toolNames).toContain('obsidian-patch-note');
    expect(toolNames).toContain('obsidian-search-notes');
    expect(toolNames).toContain('obsidian-delete-note');
    expect(tools.length).toBe(12);
  });

  test('creates McpApplicationFactory instance without error', async () => {
    const server = await McpApplicationFactory.create(AppModule);
    expect(server).toBeDefined();
  });
});
