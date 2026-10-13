import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class MarkdownifyResources {
  @Resource({
    uri: 'markdownify://formats',
    name: 'Supported Markdownify Formats',
    description: 'List of supported file formats and media types that can be converted to Markdown',
    mimeType: 'application/json',
  })
  async getSupportedFormats(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching supported Markdownify formats');

    const formats = [
      { type: 'pdf', description: 'PDF documents', tool: 'pdf-to-markdown' },
      { type: 'docx', description: 'Microsoft Word documents', tool: 'docx-to-markdown' },
      { type: 'xlsx', description: 'Microsoft Excel spreadsheets', tool: 'xlsx-to-markdown' },
      { type: 'pptx', description: 'Microsoft PowerPoint presentations', tool: 'pptx-to-markdown' },
      { type: 'image', description: 'Images (JPG, PNG, etc.)', tool: 'image-to-markdown' },
      { type: 'audio', description: 'Audio files (MP3, WAV, etc.)', tool: 'audio-to-markdown' },
      { type: 'webpage', description: 'Webpages / HTML URLs', tool: 'webpage-to-markdown' },
      { type: 'youtube', description: 'YouTube video transcripts', tool: 'youtube-to-markdown' },
      { type: 'bing-search', description: 'Bing search result pages', tool: 'bing-search-to-markdown' },
      { type: 'git-repo', description: 'Git repositories / GitHub URLs', tool: 'git-repo-to-markdown' },
      { type: 'markdown', description: 'Raw Markdown files', tool: 'get-markdown-file' },
    ];

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ formats }, null, 2),
        },
      ],
    };
  }
}
