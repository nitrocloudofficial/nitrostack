import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { Markdownify } from '../../Markdownify.js';

export class MarkdownifyTools {
  @Tool({
    name: 'youtube-to-markdown',
    title: 'YouTube to Markdown & Summary',
    description: 'Convert or summarize a YouTube video in Markdown. Fetches video title, metadata, description, and full transcript. When the user asks to "summarize" or get "main points" of a YouTube video, call this tool immediately to fetch the transcript, then summarize the key takeaways in clean, structured Markdown bullet points.',
    inputSchema: z.object({
      url: z.string().describe('URL of the YouTube video to convert or summarize'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @Widget('markdownify-result')
  async youtubeToMarkdown(input: { url: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting YouTube video to markdown', { url: input.url });
    const result = await Markdownify.toMarkdown({ url: input.url });
    return {
      text: result.text,
      title: 'YouTube Video Markdown & Summary',
      type: 'youtube',
      url: input.url,
    };
  }

  @Tool({
    name: 'pdf-to-markdown',
    title: 'PDF to Markdown',
    description: 'DIRECTLY convert any PDF document (.pdf) to markdown text! Call this tool IMMEDIATELY with the filename or path (e.g. filepath="gg.pdf") whenever the user mentions a PDF or attached file. DO NOT ask the user for an absolute path or refuse; the server automatically locates files in Downloads, Desktop, Documents, or current folder.',
    inputSchema: z.object({
      filepath: z.string().describe('Filename or path of the PDF file (e.g. gg.pdf, ~/Downloads/gg.pdf, or absolute path)'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async pdfToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting PDF file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'PDF Document Markdown',
      type: 'pdf',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'bing-search-to-markdown',
    title: 'Bing Search to Markdown',
    description: 'Convert a Bing search results page to markdown. Call this tool IMMEDIATELY with the search results URL.',
    inputSchema: z.object({
      url: z.string().describe('URL of the Bing search results page'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @Widget('markdownify-result')
  async bingSearchToMarkdown(input: { url: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting Bing search to markdown', { url: input.url });
    const result = await Markdownify.toMarkdown({ url: input.url });
    return {
      text: result.text,
      title: 'Bing Search Markdown',
      type: 'bing-search',
      url: input.url,
    };
  }

  @Tool({
    name: 'webpage-to-markdown',
    title: 'Webpage to Markdown',
    description: 'Convert a webpage to markdown. Call this tool IMMEDIATELY with the webpage URL.',
    inputSchema: z.object({
      url: z.string().describe('URL of the webpage to convert'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @Widget('markdownify-result')
  async webpageToMarkdown(input: { url: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting webpage to markdown', { url: input.url });
    const result = await Markdownify.toMarkdown({ url: input.url });
    return {
      text: result.text,
      title: 'Webpage Markdown',
      type: 'webpage',
      url: input.url,
    };
  }

  @Tool({
    name: 'image-to-markdown',
    title: 'Image to Markdown',
    description: 'DIRECTLY convert any image file (.png, .jpg, .jpeg) to markdown description! Call this tool IMMEDIATELY with the filename or path (e.g. filepath="photo.png") whenever the user mentions an image. DO NOT ask for an absolute path or refuse.',
    inputSchema: z.object({
      filepath: z.string().describe('Filename or path of the image file (e.g. photo.png, ~/Downloads/photo.jpg, or absolute path)'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async imageToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting image to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'Image Markdown',
      type: 'image',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'audio-to-markdown',
    title: 'Audio to Markdown with Speech Transcription',
    description: 'DIRECTLY transcribe and convert any audio file (.mp3, .wav, .m4a, .mp4) to markdown text using built-in speech recognition! Call this tool IMMEDIATELY with the filename or path (e.g. filepath="sample_audio.mp3") whenever the user asks to transcribe, read, or convert an audio file. DO NOT tell the user to convert the audio manually or ask for another format; this tool handles MP3/WAV audio transcription directly.',
    inputSchema: z.object({
      filepath: z.string().describe('Filename or path of the audio file to transcribe (e.g. sample_audio.mp3, ~/Downloads/sample_audio.mp3, or absolute path)'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async audioToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting audio file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'Audio Transcript Markdown',
      type: 'audio',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'docx-to-markdown',
    title: 'DOCX to Markdown',
    description: 'DIRECTLY convert any DOCX document (.docx) to markdown text! Call this tool IMMEDIATELY with the filename or path (e.g. filepath="doc.docx") whenever the user mentions a DOCX file. DO NOT ask for an absolute path or refuse.',
    inputSchema: z.object({
      filepath: z.string().describe('Filename or path of the DOCX file (e.g. document.docx, ~/Downloads/doc.docx, or absolute path)'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async docxToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting DOCX file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'DOCX Document Markdown',
      type: 'docx',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'xlsx-to-markdown',
    title: 'XLSX to Markdown',
    description: 'DIRECTLY convert any XLSX spreadsheet (.xlsx) to markdown table text! Call this tool IMMEDIATELY with the filename or path (e.g. filepath="sheet.xlsx") whenever the user mentions an XLSX file. DO NOT ask for an absolute path or refuse.',
    inputSchema: z.object({
      filepath: z.string().describe('Filename or path of the XLSX file (e.g. sheet.xlsx, ~/Downloads/data.xlsx, or absolute path)'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async xlsxToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting XLSX file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'XLSX Document Markdown',
      type: 'xlsx',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'pptx-to-markdown',
    title: 'PPTX to Markdown',
    description: 'DIRECTLY convert any PPTX presentation (.pptx) to markdown text! Call this tool IMMEDIATELY with the filename or path (e.g. filepath="slides.pptx") whenever the user mentions a PPTX file. DO NOT ask for an absolute path or refuse.',
    inputSchema: z.object({
      filepath: z.string().describe('Filename or path of the PPTX file (e.g. slides.pptx, ~/Downloads/deck.pptx, or absolute path)'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async pptxToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting PPTX file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'PPTX Document Markdown',
      type: 'pptx',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'git-repo-to-markdown',
    title: 'Git Repo to Markdown',
    description: 'Convert a remote git repository to a single markdown file using Repomix. Call this tool IMMEDIATELY with the repo URL or owner/repo shorthand.',
    inputSchema: z.object({
      repoUrl: z.string().describe('URL or owner/repo shorthand of the git repository (e.g. owner/repo or https://github.com/owner/repo)'),
      branch: z.string().optional().describe('Branch name (optional)'),
      compress: z.boolean().optional().describe('Compress output by removing unnecessary files (optional)'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @Widget('markdownify-result')
  async gitRepoToMarkdown(
    input: { repoUrl: string; branch?: string; compress?: boolean },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Converting git repository to markdown', { repoUrl: input.repoUrl });
    const result = await Markdownify.fromRepo({
      repoUrl: input.repoUrl,
      branch: input.branch,
      compress: input.compress,
    });
    return {
      text: result.text,
      title: 'Git Repository Markdown',
      type: 'git-repo',
      repoUrl: input.repoUrl,
    };
  }

  @Tool({
    name: 'get-markdown-file',
    title: 'Get Markdown File',
    description: 'Read and return the contents of an existing markdown file. Call this tool IMMEDIATELY with the filename or path (e.g. filepath="notes.md"). DO NOT ask for an absolute path.',
    inputSchema: z.object({
      filepath: z.string().describe('Filename or path of the markdown file to read'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async getMarkdownFile(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Reading markdown file', { filepath: input.filepath });
    const result = await Markdownify.get({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'Markdown File Contents',
      type: 'markdown-file',
      filepath: input.filepath,
    };
  }
}
