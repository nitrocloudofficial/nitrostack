import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z, UseGuards } from '@nitrostack/core';
import { AdminGuard } from '../../shared/security/admin.guard.js';
import * as path from 'path';
import * as fs from 'fs';
import { ManifestService, type WrittenManifest } from './manifest.service.js';
import { WorkspaceService, describeSource } from '../../shared/services/workspace.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { PdfTextService } from '../../shared/services/pdf-text.service.js';
import { TargetSchema } from '../../shared/schemas/index.js';
import type { IngestedDocument } from '../../shared/services/store.service.js';

/** Chunk size tuned so a chunk is one coherent idea, not a paragraph fragment. */
const CHUNK_CHARS = 900;
const CHUNK_OVERLAP = 120;

@Injectable({ deps: [ManifestService, WorkspaceService, StoreService, PdfTextService] })
export class SynthesisTools {
  constructor(
    private manifest: ManifestService,
    private workspace: WorkspaceService,
    private store: StoreService,
    private pdf: PdfTextService
  ) {}

  @Tool({
    name: 'synthesize_claude_md',
    title: 'Synthesize CLAUDE.md',
    description:
      'Distills the entire knowledge base into the CLAUDE.md manifest and writes it to disk. ' +
      'Generated deterministically with zero LLM calls: same repository in, byte-identical ' +
      'manifest out, every claim carrying its evidence path. Human-resolved conflicts are ' +
      'placed in section 0 where they override everything else. Unresolved conflicts are ' +
      'surfaced as an explicit warning rather than silently guessed at.',
    inputSchema: TargetSchema.extend({
      output_path: z
        .string()
        .optional()
        .describe(
          'Where to write the manifest. Defaults to CLAUDE.md at the root of the analysed ' +
            'repository; for a remote (GitHub URL) target the clone is ephemeral, so the manifest ' +
            'is archived under the state directory and returned in `content` instead.'
        ),
      allow_unresolved: z
        .boolean()
        .default(false)
        .describe('Generate even with open conflicts. They are written in as an explicit warning block.'),
    }),
    examples: {
      request: {},
      response: {
        written: true,
        path: 'CLAUDE.md',
        bytes: 7412,
        sections: 6,
        unresolvedConflicts: 0,
      },
    },
  })
  @Widget('claude-manifest')
  @UseGuards(AdminGuard)
  async synthesizeClaudeMd(
    input: { target?: string; output_path?: string; allow_unresolved?: boolean },
    ctx: ExecutionContext
  ) {
    const facts = this.store.all('knowledge');
    if (!facts.length) {
      throw new Error(
        'The knowledge base is empty — there is nothing to synthesize. ' +
          'Run `run_swarm` first (or the individual reconnaissance tools).'
      );
    }

    const blocking = this.manifest.blockingConflicts();
    if (blocking.length && !input.allow_unresolved) {
      throw new Error(
        `${blocking.length} unresolved conflict(s) would make this manifest untrustworthy: ` +
          `${blocking.map((c) => c.id).join(', ')}. ` +
          `Resolve them with resolve_conflict, or pass allow_unresolved=true to generate anyway ` +
          `with an explicit warning block.`
      );
    }

    const handle = await this.workspace.acquireTarget(input.target);
    let result;
    try {
      result = this.manifest.write(handle, input.output_path);
    } finally {
      await handle.cleanup();
    }

    const run = this.store.latestRun();
    if (run) {
      this.store.upsert('runs', { ...run, manifestPath: result.path });
    }

    ctx.logger.info('Manifest synthesized', {
      path: result.path,
      bytes: result.bytes,
      destination: result.destination,
    });

    return {
      written: true,
      path: this.workspace.rel(this.workspace.projectRoot, result.path),
      absolutePath: result.path,
      // Where it went and why. A remote analysis cannot write into the repo it
      // just cloned, so the agent needs to be told to place `content` itself.
      destination: result.destination,
      source: describeSource(handle),
      placementNote: this.placementNote(result),
      bytes: result.bytes,
      lines: result.content.split('\n').length,
      factsUsed: facts.length,
      skillsDocumented: this.store.all('skills').length,
      resolvedConflicts: this.store.all('conflicts').filter((c) => c.status === 'resolved').length,
      unresolvedConflicts: blocking.length,
      content: result.content,
    };
  }

  /** Tell the calling agent what, if anything, it still has to do with the manifest. */
  private placementNote(result: WrittenManifest): string {
    switch (result.destination) {
      case 'analyzed-repo':
        return `Written to CLAUDE.md in the analysed repository. Nothing further to do.`;
      case 'clone-archive':
        return (
          `The target was a remote repository, cloned to a temp directory that has now been deleted, ` +
          `so the manifest could not be written into it. A copy is archived at ${result.path}; ` +
          `write the returned \`content\` to CLAUDE.md at the root of your checkout of that repository.`
        );
      case 'fallback':
        return (
          `The analysed directory was not writable, so the manifest was written to ${result.path}. ` +
          `Copy the returned \`content\` into the repository yourself.`
        );
      default:
        return `Written to the path you requested.`;
    }
  }

  @Tool({
    name: 'ingest_manual_document',
    title: 'Ingest a document',
    description:
      'Adds context the automated swarm could not reach — an architecture decision record in ' +
      'a wiki, a PDF the team never checked in, a Slack thread pasted as text. The document is ' +
      'chunked, embedded into the same vector space the rest of the knowledge base uses, and ' +
      'becomes searchable via query_knowledge and included in the next manifest. Accepts ' +
      'inline text, a file path, or a base64 upload from the dashboard dropzone. PDFs are ' +
      'parsed for their text layer, so an ADR that only ever existed as a PDF can be ingested ' +
      'directly.',
    inputSchema: z
      .object({
        name: z.string().min(1).describe('A short title for the document'),
        text: z.string().optional().describe('The document content as plain text'),
        file_path: z
          .string()
          .optional()
          .describe('Absolute path to a text, markdown or PDF file to read instead'),
        file_base64: z
          .string()
          .optional()
          .describe(
            'Base64-encoded file contents, as uploaded from the dashboard dropzone. PDF, text ' +
              'and markdown are supported. A `data:` URL prefix is accepted and stripped.'
          ),
        category_hint: z
          .enum(['architecture', 'testing', 'cicd', 'agile', 'consensus', 'design-system', 'manual'])
          .default('manual')
          .describe('Which section of the manifest this belongs in'),
      })
      .refine((v) => !!(v.text?.trim() || v.file_path?.trim() || v.file_base64?.trim()), {
        message: 'Provide one of `text`, `file_path` or `file_base64`.',
      }),
    examples: {
      request: { name: 'ADR-014 caching decision', text: 'Redis was rejected because…' },
      response: { ingested: true, chunks: 3, totalDocuments: 1 },
    },
  })
  @Widget('claude-manifest')
  @UseGuards(AdminGuard)
  async ingestManualDocument(
    input: {
      name: string;
      text?: string;
      file_path?: string;
      file_base64?: string;
      category_hint?: string;
    },
    ctx: ExecutionContext
  ) {
    let content = input.text?.trim() ?? '';
    let mimeType = 'text/plain';
    const warnings: string[] = [];
    let pdfPages: number | undefined;

    // A base64 upload is the dashboard path: the browser cannot hand us a server
    // filesystem path, so the dropzone posts the bytes.
    if (!content && input.file_base64) {
      const payload = input.file_base64.replace(/^data:[^;,]*;base64,/, '').trim();
      const buffer = Buffer.from(payload, 'base64');
      if (!buffer.length) {
        throw new Error('`file_base64` did not decode to any bytes.');
      }
      const decoded = this.decodeUpload(buffer, input.name);
      content = decoded.text;
      mimeType = decoded.mimeType;
      pdfPages = decoded.pages;
      warnings.push(...decoded.warnings);
    }

    if (!content && input.file_path) {
      const resolved = path.resolve(input.file_path);
      let buffer: Buffer;
      try {
        buffer = fs.readFileSync(resolved);
      } catch {
        throw new Error(
          `Could not read ${resolved}. Provide a text, markdown or PDF file, or paste the ` +
            `content into the \`text\` parameter instead.`
        );
      }
      const decoded = this.decodeUpload(buffer, resolved);
      content = decoded.text;
      mimeType = decoded.mimeType;
      pdfPages = decoded.pages;
      warnings.push(...decoded.warnings);
    }

    if (!content) {
      throw new Error(
        pdfPages !== undefined
          ? 'The PDF carried no extractable text layer — it is almost certainly a scan and ' +
            'needs OCR before the bridge can index it.'
          : 'Document is empty — nothing to ingest.'
      );
    }

    const chunks = this.chunk(content).map((text, i) => ({ id: `chunk-${i + 1}`, text }));
    const doc: IngestedDocument = {
      id: `doc-${this.slug(input.name)}`,
      name: input.name,
      mimeType,
      chars: content.length,
      chunks,
      ingestedAt: new Date().toISOString(),
    };

    const existing = this.store.all('documents').filter((d) => d.id !== doc.id);
    this.store.replace('documents', [...existing, doc]);

    // Each chunk becomes a searchable fact in the same space as everything else.
    this.store.addFacts(
      chunks.map((c) => ({
        id: `manual:${doc.id}:${c.id}`,
        agent: 'administrator',
        category: (input.category_hint ?? 'manual') as never,
        title: `${input.name} (${c.id})`,
        detail: c.text,
        evidence: [input.file_path ?? input.name],
        weight: 6, // manually injected context is trusted above parsed inference
      }))
    );

    ctx.logger.info('Document ingested', { name: input.name, chunks: chunks.length });

    return {
      ingested: true,
      document: { id: doc.id, name: doc.name, chars: doc.chars, mimeType },
      chunks: chunks.length,
      ...(pdfPages !== undefined ? { pdfPages } : {}),
      ...(warnings.length ? { warnings } : {}),
      totalDocuments: this.store.all('documents').length,
      nextStep: 'Re-run synthesize_claude_md to fold this into the manifest.',
    };
  }

  /**
   * Turn uploaded bytes into text.
   *
   * Detection is by magic bytes rather than by extension: the dashboard dropzone
   * reports whatever name the operating system gave the file, and an ADR saved
   * as `decision.doc` that is really a PDF should still be readable.
   */
  private decodeUpload(
    buffer: Buffer,
    nameOrPath: string
  ): { text: string; mimeType: string; pages?: number; warnings: string[] } {
    if (PdfTextService.isPdf(buffer)) {
      const extracted = this.pdf.extract(buffer);
      return {
        text: extracted.text,
        mimeType: 'application/pdf',
        pages: extracted.pages,
        warnings: extracted.warnings,
      };
    }

    const text = buffer.toString('utf8');
    // A NUL byte is the reliable tell that this is a binary format we have no
    // extractor for; better to say so than to embed mojibake into the manifest.
    if (text.includes('\u0000')) {
      throw new Error(
        `${nameOrPath} is a binary file the bridge cannot read. Supported uploads are PDF, ` +
          `plain text and markdown — export it, or paste the text into the \`text\` parameter.`
      );
    }
    return {
      text,
      mimeType: /\.mdx?$/i.test(nameOrPath) ? 'text/markdown' : 'text/plain',
      warnings: [],
    };
  }

  @Tool({
    name: 'reset_bridge',
    title: 'Reset bridge state',
    description:
      'Clears all derived state — knowledge base, runs, conflicts, pipelines, generated skill ' +
      'registry and ingested documents — so the next swarm run starts from nothing. Generated ' +
      'skill SOURCE files in src/skills/ are left on disk; delete them manually if you want a ' +
      'truly clean slate. Useful for rehearsing the demo.',
    inputSchema: z.object({
      confirm: z.boolean().describe('Must be true. Guards against an accidental wipe mid-demo.'),
    }),
    examples: { request: { confirm: true }, response: { reset: true } },
  })
  @UseGuards(AdminGuard)
  async resetBridge(input: { confirm: boolean }, ctx: ExecutionContext) {
    if (!input.confirm) {
      return { reset: false, message: 'No changes made. Pass confirm=true to actually reset.' };
    }
    this.store.reset();
    ctx.logger.warn('Bridge state reset');
    return {
      reset: true,
      message: 'All derived state cleared. Run run_swarm to rebuild.',
      note: `Generated skill sources remain in ${this.workspace.rel(this.workspace.projectRoot, this.workspace.skillsRoot)}.`,
    };
  }

  /** Split on paragraph boundaries, packing up to CHUNK_CHARS with a small overlap. */
  private chunk(text: string): string[] {
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const chunks: string[] = [];
    let current = '';

    for (const para of paragraphs) {
      if (current.length + para.length + 2 <= CHUNK_CHARS) {
        current = current ? `${current}\n\n${para}` : para;
        continue;
      }
      if (current) chunks.push(current);
      if (para.length <= CHUNK_CHARS) {
        current = para;
      } else {
        // A single oversized paragraph: hard-split with overlap so a sentence
        // spanning the boundary is still retrievable from one of the chunks.
        for (let i = 0; i < para.length; i += CHUNK_CHARS - CHUNK_OVERLAP) {
          chunks.push(para.slice(i, i + CHUNK_CHARS));
        }
        current = '';
      }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [text.slice(0, CHUNK_CHARS)];
  }

  private slug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'doc';
  }
}
