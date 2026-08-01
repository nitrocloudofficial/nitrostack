import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class MarkdownifyPrompts {
  @Prompt({
    name: 'summarize_youtube_video',
    description: 'Instruct the model to fetch a YouTube transcript using youtube-to-markdown and summarize the main points in Markdown',
    arguments: [
      {
        name: 'url',
        description: 'URL of the YouTube video to summarize',
        required: true,
      },
    ],
  })
  async summarizeYouTube(args: { url: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating YouTube summary prompt', { url: args.url });
    return [
      {
        role: 'user' as const,
        content: `Please fetch the transcript for this YouTube video (${args.url}) using the \`youtube-to-markdown\` tool and summarize the main points in clean, structured Markdown format with key takeaways.`,
      },
    ];
  }

  @Prompt({
    name: 'markdownify_help',
    description: 'Get guidance on converting documents, media, or web content into Markdown',
    arguments: [
      {
        name: 'target_type',
        description: 'Type of content to convert (e.g. pdf, docx, youtube, git-repo)',
        required: false,
      },
    ],
  })
  async getHelp(args: { target_type?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating Markdownify help prompt');

    const targetType = args.target_type?.toLowerCase();

    if (targetType) {
      return [
        {
          role: 'user' as const,
          content: `How do I convert ${targetType} content to Markdown using Markdownify?`,
        },
        {
          role: 'assistant' as const,
          content: `To convert ${targetType} content, use the matching tool:
- PDF: pdf-to-markdown(filepath="...")
- DOCX: docx-to-markdown(filepath="...")
- XLSX: xlsx-to-markdown(filepath="...")
- PPTX: pptx-to-markdown(filepath="...")
- Webpages: webpage-to-markdown(url="...")
- YouTube: youtube-to-markdown(url="...")
- Git Repositories: git-repo-to-markdown(url="...")`,
        },
      ];
    }

    return [
      {
        role: 'user' as const,
        content: 'How do I use Markdownify to convert content into Markdown?',
      },
      {
        role: 'assistant' as const,
        content: `Markdownify provides dedicated tools for converting files, web pages, YouTube videos, and git repositories into Markdown:

1. **PDF Documents**: \`pdf-to-markdown\`
2. **Office Files**: \`docx-to-markdown\`, \`xlsx-to-markdown\`, \`pptx-to-markdown\`
3. **Images & Audio**: \`image-to-markdown\`, \`audio-to-markdown\`
4. **Web & Media**: \`webpage-to-markdown\`, \`youtube-to-markdown\`, \`bing-search-to-markdown\`
5. **Git Repositories**: \`git-repo-to-markdown\`
6. **Read Markdown File**: \`get-markdown-file\``,
      },
    ];
  }
}
