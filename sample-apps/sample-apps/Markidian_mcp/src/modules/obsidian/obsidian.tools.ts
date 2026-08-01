import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { ObsidianService } from './obsidian.service.js';
import { Markdownify } from '../../Markdownify.js';
import { summarizeMarkdownContent, summarizeShortly, generateTopicNoteMarkdown, generateTopicNoteMarkdownAsync } from '../../utils.js';

export class ObsidianTools {
  private obsidianService = new ObsidianService();

  @Tool({
    name: 'obsidian-generate-quiz',
    title: 'Generate Practice Quiz & Exam from Obsidian Vault Notes',
    description: 'DIRECTLY scan your Obsidian Vault notes on any topic (e.g. "programming", "python", "oops", "java", or all notes), analyze key concepts, syntax, and definitions, and generate an interactive Practice Exam/Quiz with MCQs, code prediction questions, answer keys, and source note Wikilinks saved straight to your vault!',
    inputSchema: z.object({
      topic: z.string().optional().describe('Topic or keyword to filter notes (e.g. "programming", "oops", "python", or leave empty for all notes)'),
      numQuestions: z.number().optional().default(5).describe('Number of practice questions to generate (default: 5)'),
      title: z.string().optional().describe('Optional custom title for the quiz note (e.g. "Programming Knowledge Practice Exam")'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  @Widget('markdownify-result')
  async generateQuiz(
    input: {
      topic?: string;
      numQuestions?: number;
      title?: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Generating practice quiz from Obsidian Vault notes', { topic: input.topic });
    const quiz = await this.obsidianService.generateQuizFromVault(input.topic, input.numQuestions, input.title);
    return {
      success: true,
      title: input.title || 'Practice Exam',
      savedPath: quiz.savedPath,
      sourceNotesCount: quiz.sourceNotes.length,
      text: quiz.text,
    };
  }

  @Tool({
    name: 'obsidian-show-graph',
    title: 'Show Full Obsidian Vault Knowledge Graph',
    description: 'DIRECTLY render your full Obsidian Vault Knowledge Graph interactively inside the MCP Client UI widget! Shows all vault notes, concept links, and inter-note connections without creating or converting any new notes.',
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async showGraph(
    _input: Record<string, never>,
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Rendering full Obsidian Vault Knowledge Graph');
    const graph = await this.obsidianService.getFullVaultGraph();
    return {
      success: true,
      type: 'obsidian-graph',
      title: 'Obsidian Vault Graph View',
      text: graph.text,
      noteCount: graph.noteCount,
      linkCount: graph.linkCount,
    };
  }

  @Tool({
    name: 'obsidian-convert-and-save',
    title: 'Convert & Save Directly to Obsidian Vault as Short Summary',
    description: 'DIRECTLY convert OR summarize any PDF, YouTube video, Audio transcript, Webpage, or Office file into Markdown AND save it straight into your Obsidian Vault as a neat, short note with key points! Defaults to mode="summary_only" for concise structured summaries.',
    inputSchema: z.object({
      title: z.string().describe('Name of the note to create in Obsidian (e.g. "AI Research Lecture" or "Project Specs")'),
      filepath: z.string().optional().describe('Filename or path of local file to convert/transcribe (e.g. sample_audio.mp3, gg.pdf)'),
      url: z.string().optional().describe('URL of YouTube video or webpage to convert'),
      mode: z.enum(['summary_only', 'summary_and_full', 'full_transcript']).optional().default('summary_only').describe('Output mode: "summary_only" (short neat summary with key points), "summary_and_full" (summary + transcript), or "full_transcript" (raw transcript). Default: "summary_only"'),
      tags: z.array(z.string()).optional().describe('Optional tags for Obsidian (e.g. ["youtube", "summary"])'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  @Widget('markdownify-result')
  async convertAndSave(
    input: {
      title: string;
      filepath?: string;
      url?: string;
      mode?: 'summary_only' | 'summary_and_full' | 'full_transcript';
      tags?: string[];
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Converting and saving directly to Obsidian Vault', {
      title: input.title,
      filepath: input.filepath,
      url: input.url,
      mode: input.mode,
    });

    const conversion = await Markdownify.toMarkdown({
      filePath: input.filepath,
      url: input.url,
    });

    const outputMode = input.mode || 'summary_only';
    let finalContent = conversion.text;

    if (outputMode === 'summary_only') {
      finalContent = summarizeShortly(conversion.text, input.title);
    } else if (outputMode === 'summary_and_full') {
      finalContent = summarizeMarkdownContent(conversion.text);
    }

    const savedPath = await this.obsidianService.saveNote(input.title, finalContent, input.tags);

    return {
      success: true,
      title: input.title,
      mode: outputMode,
      savedPath,
      text: finalContent,
    };
  }

  @Tool({
    name: 'obsidian-generate-topic-note',
    title: 'Generate Topic Study Note Directly in Obsidian Vault',
    description: 'DIRECTLY generate comprehensive, structured Markdown study notes on ANY topic (e.g. "OOPS Concept", "System Design", "Data Structures", "Quantum Computing") AND save it straight into your Obsidian Vault with code examples, key pillars, executive summary, and automatic Knowledge Graph Wikilinks!',
    inputSchema: z.object({
      topic: z.string().describe('Topic or subject name (e.g. "OOPS Concept", "REST API Design", "Data Structures")'),
      title: z.string().optional().describe('Optional custom title for the note (defaults to topic name)'),
      tags: z.array(z.string()).optional().describe('Optional tags for Obsidian (e.g. ["oops", "programming", "notes"])'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  @Widget('markdownify-result')
  async generateTopicNote(
    input: {
      topic: string;
      title?: string;
      tags?: string[];
    },
    ctx: ExecutionContext,
  ) {
    const noteTitle = input.title || input.topic;
    ctx.logger.info('Generating topic study note for Obsidian Vault', {
      topic: input.topic,
      title: noteTitle,
    });

    const noteMarkdown = await generateTopicNoteMarkdownAsync(input.topic, noteTitle);
    const savedPath = await this.obsidianService.saveNote(
      noteTitle,
      noteMarkdown,
      input.tags || [input.topic.toLowerCase().replace(/\s+/g, '-')],
    );

    return {
      success: true,
      filename: noteTitle,
      savedPath,
      text: noteMarkdown,
    };
  }

  @Tool({
    name: 'obsidian-fill-uncreated-links',
    title: 'Auto-Fill Uncreated Linked Notes in Obsidian Vault',
    description: 'Find all uncreated/empty [[Wikilinks]] inside an existing Obsidian note and automatically generate structured study notes for each ghost link, expanding your Knowledge Graph!',
    inputSchema: z.object({
      filename: z.string().describe('Filename of the note containing [[Wikilinks]] to populate (e.g. "OOPS Concepts Study Guide.md")'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  async fillUncreatedLinks(
    input: {
      filename: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Auto-filling uncreated linked notes in Obsidian Vault', { filename: input.filename });
    const content = await this.obsidianService.getNote(input.filename);
    const createdNotes = await this.obsidianService.fillUncreatedLinkedFiles(content, input.filename);
    return {
      success: true,
      parentNote: input.filename,
      createdNotesCount: createdNotes.length,
      createdNotes,
    };
  }

  @Tool({
    name: 'obsidian-save-note',
    title: 'Save Note to Obsidian Vault',
    description: 'Save or update a Markdown note directly inside your local Obsidian Vault or via Local REST API.',
    inputSchema: z.object({
      filename: z.string().describe('Filename or relative path in vault (e.g. "My Note.md" or "Projects/Specs.md")'),
      content: z.string().describe('Markdown content of the note'),
      tags: z.array(z.string()).optional().describe('Optional array of tags to prepend to the note'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  @Widget('markdownify-result')
  async saveNote(
    input: {
      filename: string;
      content: string;
      tags?: string[];
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Saving note to Obsidian Vault', { filename: input.filename });
    const savedPath = await this.obsidianService.saveNote(input.filename, input.content, input.tags);
    return {
      success: true,
      filename: input.filename,
      savedPath,
      text: input.content,
    };
  }

  @Tool({
    name: 'obsidian-list-notes',
    title: 'List Notes in Obsidian Vault',
    description: 'List all Markdown notes and directories inside your local Obsidian Vault.',
    inputSchema: z.object({
      dirPath: z.string().optional().default('').describe('Optional subdirectory relative to vault root'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  async listNotes(
    input: {
      dirPath?: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Listing notes in Obsidian Vault', { dirPath: input.dirPath });
    const files = await this.obsidianService.listFiles(input.dirPath || '');
    return {
      success: true,
      vaultPath: this.obsidianService.getVaultPath(),
      files,
    };
  }

  @Tool({
    name: 'obsidian-get-note',
    title: 'Get Note from Obsidian Vault',
    description: 'Read the Markdown content of an existing note from your Obsidian Vault.',
    inputSchema: z.object({
      filename: z.string().describe('Filename or relative path in vault (e.g. "My Note.md")'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async getNote(
    input: {
      filename: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Fetching note from Obsidian Vault', { filename: input.filename });
    const content = await this.obsidianService.getNote(input.filename);
    return {
      success: true,
      filename: input.filename,
      text: content,
    };
  }

  @Tool({
    name: 'obsidian-append-note',
    title: 'Append Content to Obsidian Note',
    description: 'Append new Markdown text or section to the end of an existing note in your Obsidian Vault.',
    inputSchema: z.object({
      filename: z.string().describe('Filename or relative path in vault'),
      contentToAppend: z.string().describe('Markdown text to append'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  async appendNote(
    input: {
      filename: string;
      contentToAppend: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Appending to Obsidian note', { filename: input.filename });
    const savedPath = await this.obsidianService.appendNote(input.filename, input.contentToAppend);
    return {
      success: true,
      filename: input.filename,
      savedPath,
    };
  }

  @Tool({
    name: 'obsidian-patch-note',
    title: 'Patch Section in Obsidian Note',
    description: 'Insert or update content under a specific heading inside an existing Obsidian note.',
    inputSchema: z.object({
      filename: z.string().describe('Filename or relative path in vault'),
      heading: z.string().describe('Heading under which to insert content (e.g. "Tasks" or "Key Points")'),
      contentToInsert: z.string().describe('Markdown text to insert under the heading'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  async patchNote(
    input: {
      filename: string;
      heading: string;
      contentToInsert: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Patching Obsidian note', { filename: input.filename, heading: input.heading });
    const savedPath = await this.obsidianService.patchNote(input.filename, input.heading, input.contentToInsert);
    return {
      success: true,
      filename: input.filename,
      heading: input.heading,
      savedPath,
    };
  }

  @Tool({
    name: 'obsidian-search-notes',
    title: 'Search Obsidian Vault Notes',
    description: 'Search for notes in your Obsidian Vault matching a query keyword or phrase.',
    inputSchema: z.object({
      query: z.string().describe('Search query string'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  async searchNotes(
    input: {
      query: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Searching Obsidian notes', { query: input.query });
    const results = await this.obsidianService.searchNotes(input.query);
    return {
      success: true,
      query: input.query,
      results,
    };
  }

  @Tool({
    name: 'obsidian-delete-note',
    title: 'Delete Note from Obsidian Vault',
    description: 'Delete a note from your local Obsidian Vault.',
    inputSchema: z.object({
      filename: z.string().describe('Filename or relative path to delete'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  async deleteNote(
    input: {
      filename: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Deleting note from Obsidian Vault', { filename: input.filename });
    await this.obsidianService.deleteNote(input.filename);
    return {
      success: true,
      filename: input.filename,
      message: `Note "${input.filename}" deleted successfully`,
    };
  }
}
