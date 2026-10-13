import { Module } from '@nitrostack/core';
import { MarkdownifyTools } from './markdownify.tools.js';
import { MarkdownifyResources } from './markdownify.resources.js';
import { MarkdownifyPrompts } from './markdownify.prompts.js';

@Module({
  name: 'markdownify',
  description: 'Convert document, media, webpage, and git repository content into Markdown',
  controllers: [MarkdownifyTools, MarkdownifyResources, MarkdownifyPrompts],
})
export class MarkdownifyModule {}
