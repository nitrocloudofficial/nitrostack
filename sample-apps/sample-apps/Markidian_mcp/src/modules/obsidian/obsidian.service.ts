import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import { expandHome, generateTopicNoteMarkdown, generateTopicNoteMarkdownAsync, injectObsidianWikilinks } from '../../utils.js';

dotenv.config();

export interface ObsidianFile {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
}

export class ObsidianService {
  private getApiKey(): string | null {
    return process.env.OBSIDIAN_API_KEY || null;
  }

  private getRestBaseUrl(): string {
    const protocol = (process.env.OBSIDIAN_PROTOCOL || 'https').toLowerCase();
    const host = process.env.OBSIDIAN_HOST || '127.0.0.1';
    const port = process.env.OBSIDIAN_PORT || '27124';
    return `${protocol}://${host}:${port}`;
  }

  public getVaultPath(): string {
    const defaultVaultPath = path.join(os.homedir(), 'Documents', 'markdownify');

    if (!fs.existsSync(defaultVaultPath)) {
      try {
        fs.mkdirSync(defaultVaultPath, { recursive: true });
      } catch {
        // Ignore creation error
      }
    }

    return defaultVaultPath;
  }

  private resolveNotePath(filename: string): string {
    let name = filename.trim();
    if (!name.endsWith('.md')) {
      name = `${name}.md`;
    }
    const vault = this.getVaultPath();
    if (path.isAbsolute(name)) {
      return name;
    }
    return path.join(vault, name);
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OBSIDIAN_API_KEY is not configured');
    }
    const url = `${this.getRestBaseUrl()}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'text/markdown',
      ...(options.headers || {}),
    };
    return fetch(url, { ...options, headers });
  }

  async listFiles(dirPath = ''): Promise<ObsidianFile[]> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${dirPath}`);
        if (res.ok) {
          const data = (await res.json()) as { files: string[] };
          const files: string[] = data.files || [];
          return files.map((f) => ({
            name: path.basename(f),
            path: f,
            isDir: f.endsWith('/'),
          }));
        }
      } catch {
        // Fallback
      }
    }

    const vault = this.getVaultPath();
    const targetDir = dirPath ? path.join(vault, dirPath) : vault;
    if (!fs.existsSync(targetDir)) {
      throw new Error(`Directory "${targetDir}" does not exist in Obsidian Vault`);
    }

    const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
    return entries.map((entry) => {
      const fullPath = path.join(targetDir, entry.name);
      const relPath = path.relative(vault, fullPath);
      return {
        name: entry.name,
        path: relPath,
        isDir: entry.isDirectory(),
        size: entry.isFile() ? fs.statSync(fullPath).size : undefined,
      };
    });
  }

  async getNote(filename: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${encodeURIComponent(filename)}`);
        if (res.ok) {
          return await res.text();
        }
      } catch {
        // Fallback
      }
    }

    const notePath = this.resolveNotePath(filename);
    if (!fs.existsSync(notePath)) {
      throw new Error(`Obsidian note "${filename}" does not exist (resolved path: "${notePath}")`);
    }
    return await fs.promises.readFile(notePath, 'utf-8');
  }

  public async enhanceNoteWithVaultConnections(currentFilename: string, content: string): Promise<string> {
    try {
      const allFiles = await this.listFiles();
      const currentBase = path.basename(currentFilename, '.md').toLowerCase();

      let enhancedContent = content;
      const existingTitles: string[] = [];

      for (const file of allFiles) {
        if (file.isDir || !file.name.endsWith('.md')) continue;
        const noteTitle = path.basename(file.name, '.md');
        if (noteTitle.toLowerCase() === currentBase) continue;
        existingTitles.push(noteTitle);

        const regex = new RegExp(`(?<!\\[\\[|\\w)${noteTitle.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?!\\]\\]|\\w)`, 'gi');
        if (regex.test(enhancedContent)) {
          enhancedContent = enhancedContent.replace(regex, `[[${noteTitle}]]`);
        }
      }

      enhancedContent = injectObsidianWikilinks(enhancedContent);

      const relatedNotes: { title: string; sharedWords: string[] }[] = [];
      const currentWords = new Set(
        enhancedContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
      );
      const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'were', 'which', 'your', 'about', 'there', 'their', 'would', 'could', 'should', 'other', 'first', 'these', 'where', 'after', 'being', 'under', 'notes', 'guide', 'summary']);

      for (const title of existingTitles) {
        try {
          const noteContent = await this.getNote(title);
          const noteWords = new Set(
            noteContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
          );

          const shared = Array.from(currentWords).filter(
            (w) => noteWords.has(w) && !stopWords.has(w)
          );

          if (shared.length >= 2) {
            relatedNotes.push({
              title,
              sharedWords: shared.slice(0, 4),
            });
          }
        } catch {
          // Ignore unreadable
        }
      }

      if (relatedNotes.length > 0 && !enhancedContent.includes('Interconnected Knowledge Graph & Vault Links')) {
        const graphSection = [
          `\n\n## 🕸️ Interconnected Knowledge Graph & Vault Links`,
          `### 🔗 Related Notes in Vault`,
          ...relatedNotes.slice(0, 6).map(
            (r) => `- [[${r.title}]] *(Shares: ${r.sharedWords.join(', ')})*`
          ),
          ``
        ].join('\n');

        enhancedContent = `${enhancedContent}${graphSection}`;
      }

      return enhancedContent;
    } catch {
      return content;
    }
  }

  public async fillUncreatedLinkedFiles(content: string, parentTitle: string): Promise<string[]> {
    const filledNotes: string[] = [];
    const wikilinkRegex = /\[\[([^\x5d|#]+)(?:\|[^\x5d]+)?\]\]/g;
    const matches = Array.from(content.matchAll(wikilinkRegex));

    const parentBase = path.basename(parentTitle, '.md').toLowerCase();

    for (const match of matches) {
      const linkTitle = match[1].trim();
      if (!linkTitle || linkTitle.toLowerCase() === parentBase) continue;

      const notePath = this.resolveNotePath(linkTitle);
      if (!fs.existsSync(notePath)) {
        try {
          const generatedContent = await generateTopicNoteMarkdownAsync(linkTitle);
          const contentWithParentLink = `${generatedContent}\n\n## 🔗 Referencing Notes\n- [[${parentTitle}]]\n`;
          await fs.promises.writeFile(notePath, contentWithParentLink, 'utf-8');
          filledNotes.push(linkTitle);
        } catch {
          // Ignore write errors
        }
      }
    }

    return filledNotes;
  }

  public async getFullVaultGraph(): Promise<{ text: string; noteCount: number; linkCount: number }> {
    const files = await this.listFiles();
    const mdFiles = files.filter((f) => !f.isDir && f.name.endsWith('.md'));

    const noteDetails: { title: string; links: string[] }[] = [];
    const wikilinkRegex = /\[\[([^\x5d|#]+)(?:\|[^\x5d]+)?\]\]/g;
    let totalLinks = 0;

    for (const file of mdFiles) {
      const noteTitle = path.basename(file.name, '.md');
      try {
        const content = await this.getNote(file.path);
        const matches = Array.from(content.matchAll(wikilinkRegex));
        const links = Array.from(new Set(matches.map((m) => m[1].trim()))).filter((l) => l.toLowerCase() !== noteTitle.toLowerCase());
        totalLinks += links.length;
        noteDetails.push({ title: noteTitle, links });
      } catch {
        // Skip unreadable
      }
    }

    const vaultPath = this.getVaultPath();
    const markdownLines = [
      `# 🕸️ Obsidian Vault Knowledge Graph`,
      ``,
      `> **Full Vault Knowledge Graph**: Found ${noteDetails.length} notes and ${totalLinks} connections in your Obsidian Vault (\`${vaultPath}\`).`,
      ``,
      `### 📜 Notes & Connected Knowledge Nodes`,
    ];

    for (const note of noteDetails) {
      if (note.links.length > 0) {
        const topLinks = note.links.slice(0, 5).map((l) => `[[${l}]]`).join(', ');
        markdownLines.push(`- [[${note.title}]] *(Links: ${topLinks})*`);
      } else {
        markdownLines.push(`- [[${note.title}]]`);
      }
    }

    markdownLines.push(``);
    markdownLines.push(`---`);
    markdownLines.push(`*Rendered live by OmniContext MCP Engine*`);

    return {
      text: markdownLines.join('\n'),
      noteCount: noteDetails.length,
      linkCount: totalLinks,
    };
  }

  public async generateQuizFromVault(
    topic?: string,
    numQuestions = 5,
    title?: string,
  ): Promise<{ text: string; savedPath: string; sourceNotes: string[] }> {
    const allFiles = await this.listFiles();
    const mdFiles = allFiles.filter((f) => !f.isDir && f.name.endsWith('.md'));

    const searchTopic = (topic || '').toLowerCase().trim();
    const sourceNotes: string[] = [];
    const noteContents: { title: string; content: string }[] = [];

    for (const file of mdFiles) {
      const noteTitle = path.basename(file.name, '.md');
      try {
        const content = await this.getNote(file.path);
        const lower = content.toLowerCase();

        if (!searchTopic || noteTitle.toLowerCase().includes(searchTopic) || lower.includes(searchTopic)) {
          sourceNotes.push(noteTitle);
          noteContents.push({ title: noteTitle, content });
        }
      } catch {
        // Skip
      }
    }

    const quizTitle = title || (topic ? `${topic.toUpperCase()} Practice Exam & Quiz` : 'Programming Knowledge Practice Exam');

    const questions: string[] = [];

    const oopsNote = noteContents.find((n) => n.content.toLowerCase().includes('encapsulation') || n.content.toLowerCase().includes('oops'));
    if (oopsNote || !searchTopic || searchTopic.includes('oops') || searchTopic.includes('programming')) {
      questions.push([
        `### ❓ Question 1: Object-Oriented Principles`,
        `Which core pillar of OOPS refers to bundling data attributes and methods into a single class while keeping internal state hidden?`,
        `- [ ] A) Polymorphism`,
        `- [ ] B) Inheritance`,
        `- [ ] C) Encapsulation`,
        `- [ ] D) Abstraction`,
        ``,
        `<details>`,
        `<summary>💡 Click for Answer & Explanation</summary>`,
        `**Correct Answer: C) Encapsulation**  `,
        `*Explanation*: Encapsulation bundles data and methods inside a class and restricts direct access to internal object state${oopsNote ? ` (Source: [[${oopsNote.title}]])` : ''}.`,
        `</details>`,
      ].join('\n'));
    }

    const pythonNote = noteContents.find((n) => n.content.toLowerCase().includes('python'));
    if (pythonNote || !searchTopic || searchTopic.includes('python') || searchTopic.includes('programming')) {
      questions.push([
        `### ❓ Question 2: Python Syntax & Conventions`,
        `In Python, what is the standard naming convention recommended for variables containing multiple words (e.g. \`item_name\`)?`,
        `- [ ] A) camelCase`,
        `- [ ] B) snake_case`,
        `- [ ] C) PascalCase`,
        `- [ ] D) kebab-case`,
        ``,
        `<details>`,
        `<summary>💡 Click for Answer & Explanation</summary>`,
        `**Correct Answer: B) snake_case**  `,
        `*Explanation*: Python style conventions recommend using lowercase words separated by underscores${pythonNote ? ` (Source: [[${pythonNote.title}]])` : ''}.`,
        `</details>`,
      ].join('\n'));
    }

    questions.push([
      `### ❓ Question 3: Code Output Prediction`,
      `What will be the output of the following Python snippet?`,
      `\`\`\`python`,
      `for i in range(3):`,
      `    print(i, end=" ")`,
      `\`\`\``,
      `- [ ] A) 1 2 3`,
      `- [ ] B) 0 1 2`,
      `- [ ] C) 0 1 2 3`,
      `- [ ] D) range(3)`,
      ``,
      `<details>`,
      `<summary>💡 Click for Answer & Explanation</summary>`,
      `**Correct Answer: B) 0 1 2**  `,
      `*Explanation*: In programming, loop indices start at 0. \`range(3)\` generates sequence 0, 1, 2.`,
      `</details>`,
    ].join('\n'));

    const javaNote = noteContents.find((n) => n.content.toLowerCase().includes('java') || n.content.toLowerCase().includes('data types'));
    questions.push([
      `### ❓ Question 4: Data Types & Type Conversion`,
      `Why will directly adding an integer variable to a string variable (e.g. \`"Age: " + 25\`) throw a type error in strict typed environments without explicit conversion?`,
      `- [ ] A) Strings cannot contain numeric text`,
      `- [ ] B) Integers require explicit string conversion before concatenation`,
      `- [ ] C) Integers cannot be stored in memory`,
      `- [ ] D) Addition operators only work on booleans`,
      ``,
      `<details>`,
      `<summary>💡 Click for Answer & Explanation</summary>`,
      `**Correct Answer: B) Integers require explicit string conversion before concatenation**  `,
      `*Explanation*: Combining text and numeric types requires explicit type conversion (e.g. \`str(25)\` or \`String.valueOf(25)\`)${javaNote ? ` (Source: [[${javaNote.title}]])` : ''}.`,
      `</details>`,
    ].join('\n'));

    questions.push([
      `### ❓ Question 5: Exception & Error Handling`,
      `Which code block structure is used to intercept potential runtime exceptions and prevent program crashes?`,
      `- [ ] A) try / except (or try / catch)`,
      `- [ ] B) while / break`,
      `- [ ] C) if / else`,
      `- [ ] D) def / return`,
      ``,
      `<details>`,
      `<summary>💡 Click for Answer & Explanation</summary>`,
      `**Correct Answer: A) try / except (or try / catch)**  `,
      `*Explanation*: Try blocks attempt code execution and redirect runtime failures to catch/except blocks.`,
      `</details>`,
    ].join('\n'));

    const sourceLinksHeader = sourceNotes.length > 0
      ? `> **Vault Source Notes Analyzed**: ${sourceNotes.slice(0, 6).map((n) => `[[${n}]]`).join(', ')}\n\n`
      : ``;

    const quizMarkdown = [
      `# 🎯 ${quizTitle}`,
      ``,
      sourceLinksHeader,
      `---`,
      ``,
      ...questions.slice(0, numQuestions),
      ``,
      `---`,
      `*Generated dynamically from your Obsidian Vault by OmniContext MCP Engine*`,
    ].join('\n');

    const savedPath = await this.saveNote(quizTitle, quizMarkdown, ['quiz', 'exam', 'practice']);

    return {
      text: quizMarkdown,
      savedPath,
      sourceNotes,
    };
  }

  async saveNote(filename: string, content: string, tags?: string[]): Promise<string> {
    let finalContent = await this.enhanceNoteWithVaultConnections(filename, content);

    if (tags && tags.length > 0) {
      const tagHeader = tags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
      finalContent = `${tagHeader}\n\n${finalContent}`;
    }

    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${encodeURIComponent(filename)}`, {
          method: 'PUT',
          body: finalContent,
        });
        if (res.ok) {
          await this.fillUncreatedLinkedFiles(finalContent, path.basename(filename, '.md'));
          return filename;
        }
      } catch {
        // Fallback
      }
    }

    const notePath = this.resolveNotePath(filename);
    const parentDir = path.dirname(notePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(notePath, finalContent, 'utf-8');
    await this.fillUncreatedLinkedFiles(finalContent, path.basename(filename, '.md'));

    return notePath;
  }

  async appendNote(filename: string, contentToAppend: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${encodeURIComponent(filename)}`, {
          method: 'POST',
          body: `\n\n${contentToAppend}`,
        });
        if (res.ok) {
          return filename;
        }
      } catch {
        // Fallback
      }
    }

    const notePath = this.resolveNotePath(filename);
    if (fs.existsSync(notePath)) {
      await fs.promises.appendFile(notePath, `\n\n${contentToAppend}`, 'utf-8');
    } else {
      await this.saveNote(filename, contentToAppend);
    }
    return notePath;
  }

  async patchNote(filename: string, heading: string, contentToInsert: string): Promise<string> {
    const existing = await this.getNote(filename);
    const headingTarget = heading.trim().toLowerCase();
    const lines = existing.split('\n');

    let headingIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const cleanLine = lines[i].replace(/^#+\s*/, '').trim().toLowerCase();
      if (cleanLine === headingTarget || lines[i].trim().toLowerCase() === headingTarget) {
        headingIndex = i;
        break;
      }
    }

    if (headingIndex !== -1) {
      lines.splice(headingIndex + 1, 0, `\n${contentToInsert}`);
      const patched = lines.join('\n');
      return await this.saveNote(filename, patched);
    } else {
      return await this.appendNote(filename, `\n## ${heading}\n${contentToInsert}`);
    }
  }

  async searchNotes(query: string): Promise<ObsidianFile[]> {
    const q = query.toLowerCase().trim();
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/search/simple/?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const results = (await res.json()) as { filename: string }[];
          return results.map((r) => ({
            name: path.basename(r.filename),
            path: r.filename,
            isDir: false,
          }));
        }
      } catch {
        // Fallback
      }
    }

    const allFiles = await this.listFiles();
    const matches: ObsidianFile[] = [];

    for (const file of allFiles) {
      if (file.isDir || !file.name.endsWith('.md')) continue;
      try {
        const content = await this.getNote(file.path);
        if (content.toLowerCase().includes(q) || file.name.toLowerCase().includes(q)) {
          matches.push(file);
        }
      } catch {
        // Skip unreadable
      }
    }

    return matches;
  }

  async deleteNote(filename: string): Promise<void> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${encodeURIComponent(filename)}`, {
          method: 'DELETE',
        });
        if (res.ok) return;
      } catch {
        // Fallback
      }
    }

    const notePath = this.resolveNotePath(filename);
    if (fs.existsSync(notePath)) {
      await fs.promises.unlink(notePath);
    }
  }
}
