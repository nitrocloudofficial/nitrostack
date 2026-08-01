import path from "path";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";
import { URL, fileURLToPath } from "node:url";
import is_ip_private from "private-ip";
import { isValidRemoteValue } from "repomix";

export function expandHome(filepath: string): string {
  if (!filepath) return "";
  let cleaned = filepath.trim().replace(/^["']|["']$/g, "");

  if (cleaned.startsWith("file://")) {
    try {
      cleaned = fileURLToPath(cleaned);
    } catch {
      cleaned = cleaned.replace(/^file:\/\/\/?/, "");
      if (process.platform === "win32" && /^\/[a-zA-Z]:/.test(cleaned)) {
        cleaned = cleaned.slice(1);
      }
    }
  }

  if (cleaned.startsWith("~/") || cleaned === "~") {
    cleaned = path.join(os.homedir(), cleaned.slice(1));
  }

  const normalized = path.normalize(cleaned);

  if (fs.existsSync(normalized)) {
    return normalized;
  }

  if (!path.isAbsolute(normalized)) {
    const searchDirs = [
      process.cwd(),
      path.join(os.homedir(), "Downloads"),
      path.join(os.homedir(), "Desktop"),
      path.join(os.homedir(), "Documents"),
      os.homedir(),
    ];

    for (const dir of searchDirs) {
      const candidate = path.join(dir, normalized);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return normalized;
}

export function ensureVenvExists(projectRoot: string): string {
  if (process.env.MARKITDOWN_PATH) return process.env.MARKITDOWN_PATH;
  const isWin = process.platform === "win32";
  const venvBin = path.join(
    projectRoot,
    ".venv",
    isWin ? "Scripts" : "bin",
    `markitdown${isWin ? ".exe" : ""}`,
  );

  if (fs.existsSync(venvBin)) {
    return venvBin;
  }

  const hasSetupScript =
    fs.existsSync(path.join(projectRoot, "setup.bat")) ||
    fs.existsSync(path.join(projectRoot, "setup.sh")) ||
    fs.existsSync(path.join(projectRoot, "package.json"));

  if (hasSetupScript) {
    try {
      const patchScript = path.join(projectRoot, "scripts", "patch-markitdown.js");
      if (isWin) {
        const batScript = path.join(projectRoot, "setup.bat");
        if (fs.existsSync(batScript)) {
          execSync(`cmd.exe /c "${batScript}"`, { cwd: projectRoot, stdio: "pipe", timeout: 60000 });
        }
      } else {
        const shScript = path.join(projectRoot, "setup.sh");
        if (fs.existsSync(shScript)) {
          execSync(`bash "${shScript}"`, { cwd: projectRoot, stdio: "pipe", timeout: 60000 });
        }
      }

      if (fs.existsSync(patchScript)) {
        execSync(`node "${patchScript}"`, { cwd: projectRoot, stdio: "pipe", timeout: 15000 });
      }
    } catch {
      // Fallback
    }

    if (fs.existsSync(venvBin)) {
      return venvBin;
    }
  }

  return "markitdown";
}

export function resolveMarkitdownPath(projectRoot: string): string {
  return ensureVenvExists(projectRoot);
}

export function resolveRepomixPath(projectRoot: string): string {
  if (process.env.REPOMIX_PATH) return process.env.REPOMIX_PATH;
  const local = path.join(projectRoot, "node_modules", ".bin", "repomix");
  if (fs.existsSync(local)) return local;
  return "repomix";
}

export function getAllowedPaths(): string[] | null {
  const raw = process.env.MD_ALLOWED_PATHS ?? process.env.MD_SHARE_DIR;
  if (!raw) return null;
  const dirs = raw
    .split(path.delimiter)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => path.normalize(path.resolve(expandHome(p))));
  return dirs.length > 0 ? dirs : null;
}

export function isWithinDirectory(childPath: string, parentDir: string): boolean {
  const normPath = path.normalize(childPath);
  const normDir = path.normalize(parentDir);
  
  if (process.platform === "win32") {
    return normPath.toLowerCase().startsWith(normDir.toLowerCase());
  }
  return normPath.startsWith(normDir);
}

export function assertPathAllowed(filePath: string): void {
  const allowed = getAllowedPaths();
  if (!allowed) return;
  const resolved = path.normalize(path.resolve(expandHome(filePath)));
  if (!allowed.some((dir) => isWithinDirectory(resolved, dir))) {
    throw new Error(
      `Path "${filePath}" is outside the allowed directories. ` +
        `Set MD_ALLOWED_PATHS to a ${path.delimiter}-separated list that includes a parent directory ` +
        `(currently allowed: ${allowed.join(path.delimiter)}).`,
    );
  }
}

export function validateUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Only http: and https: schemes are allowed. Received: ${parsed.protocol}`,
    );
  }

  const hostname = parsed.hostname;
  if (is_ip_private(hostname) || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    throw new Error(`Access to potentially dangerous IP address or localhost is forbidden: ${hostname}`);
  }
}

export function validateRepoUrl(repoUrl: string): void {
  if (!repoUrl || repoUrl.trim().length === 0) {
    throw new Error("Repository URL is required.");
  }
  if (repoUrl.startsWith("file://") || repoUrl.startsWith("ssh://")) {
    throw new Error("Only http: and https: repository URLs are allowed");
  }
  if (!isValidRemoteValue(repoUrl)) {
    throw new Error(
      `Invalid repository URL or shorthand: "${repoUrl}". Expected format like "owner/repo" or "https://github.com/owner/repo".`,
    );
  }
}

export function isUnconvertedHtml(content: string): boolean {
  const head = content.slice(0, 2000).toLowerCase();
  return (
    head.includes("<!doctype html>") ||
    head.includes("<html") ||
    head.includes("<head") ||
    head.includes("<body")
  );
}

export function inferExtensionFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).slice(1).toLowerCase();
    return ext || "html";
  } catch {
    return "html";
  }
}

export function isMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".md" || ext === ".markdown";
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === "youtu.be" || host.endsWith(".youtu.be") || host.includes("youtube.com");
  } catch {
    return false;
  }
}

export function normalizeYouTubeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      videoId = parsed.pathname.slice(1);
    } else if (host.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2];
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/")[2];
      } else if (parsed.pathname.startsWith("/v/")) {
        videoId = parsed.pathname.split("/")[2];
      } else {
        videoId = parsed.searchParams.get("v");
      }
    }

    if (videoId) {
      const cleanId = videoId.split("&")[0].split("?")[0];
      return `https://www.youtube.com/watch?v=${cleanId}`;
    }
  } catch {
    // Return original
  }
  return url;
}

export function summarizeMarkdownContent(content: string): string {
  if (!content || content.trim().length === 0) {
    return content;
  }

  const summary = summarizeToMarkdownFormat(content);
  return `${summary}\n\n---\n\n# 📜 Full Transcript & Details\n\n${content}`;
}

export function summarizeShortly(content: string, title?: string): string {
  return summarizeToMarkdownFormat(content, title);
}

export function injectObsidianWikilinks(text: string): string {
  if (!text) return text;

  const domainConcepts = [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'SQL', 'HTML', 'CSS', 'Bash', 'React', 'Node.js',
    'Variables', 'Data Types', 'Strings', 'Integers', 'Booleans', 'Floats', 'Arrays', 'Lists', 'Dictionaries', 'Tuples', 'Sets',
    'Functions', 'Methods', 'Loops', 'For Loops', 'While Loops', 'Conditional Logic', 'Recursion', 'Pointers', 'Memory Management',
    'OOPS', 'Object-Oriented Programming', 'Encapsulation', 'Abstraction', 'Inheritance', 'Polymorphism', 'Classes', 'Objects', 'Interfaces',
    'Data Structures', 'Algorithms', 'Binary Trees', 'Linked Lists', 'Stacks', 'Queues', 'Hash Tables', 'Graphs', 'Sorting', 'Searching',
    'System Design', 'Software Architecture', 'Design Patterns', 'API', 'REST API', 'JSON', 'HTTP', 'Database', 'Cloud Computing', 'DevOps', 'CI/CD', 'Security',
    'Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Neural Networks', 'Large Language Models', 'Data Science', 'Data Analysis',
    'Quantum Computing', 'Physics', 'Mathematics', 'Calculus', 'Linear Algebra', 'Statistics', 'Probability', 'Chemistry', 'Biology',
    'PyCharm', 'VS Code', 'Git', 'GitHub', 'Obsidian', 'Markdown'
  ];

  let result = text;
  const presentConcepts = new Set<string>();

  for (const concept of domainConcepts) {
    const escaped = concept.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?<!\\[\\[|\\w)${escaped}(?!\\]\\]|\\w)`, 'i');
    if (regex.test(result)) {
      result = result.replace(regex, `[[${concept}]]`);
      presentConcepts.add(concept);
    }
  }

  if (!result.includes('Knowledge Graph Links') && presentConcepts.size >= 2) {
    const topLinks = Array.from(presentConcepts).map((c) => `[[${c}]]`).join(' • ');
    const linksHeader = `\n\n## 🕸️ Knowledge Graph Links\n${topLinks}\n`;
    result += linksHeader;
  }

  return result;
}

export async function fetchTopicInfoFromInternet(topic: string): Promise<string> {
  const cleanTopic = topic.trim();
  let wikiText = '';
  let webSummary = '';

  // 1. Fetch live definition & extract from Wikipedia API (Search + Extract)
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTopic)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as any;
      const firstHit = searchData?.query?.search?.[0];
      if (firstHit?.pageid) {
        const extUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&pageids=${firstHit.pageid}&format=json&origin=*`;
        const extRes = await fetch(extUrl);
        if (extRes.ok) {
          const extData = (await extRes.json()) as any;
          const page = extData?.query?.pages?.[firstHit.pageid];
          if (page?.extract) {
            wikiText = page.extract;
          }
        }
      }
    }
  } catch {
    // Ignore Wikipedia fetch errors
  }

  // 2. Fetch live tutorial & programming details from Web Search
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanTopic + ' programming tutorial overview summary')}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (searchRes.ok) {
      const html = await searchRes.text();
      const rawText = html
        .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
      const snippets = Array.from(
        rawText.matchAll(/([A-Z][^.!?]*?(?:programming|code|language|data|system|concept|function|method|type|variable|object|class)[^.!?]*?[.!?])/g)
      )
        .map((m) => m[1].trim())
        .filter((s) => s.length > 25);
      if (snippets.length > 0) {
        webSummary = Array.from(new Set(snippets)).slice(0, 10).join(' ');
      }
    }
  } catch {
    // Ignore web search errors
  }

  const combinedContent = [wikiText, webSummary].filter(Boolean).join('\n\n');
  return combinedContent.length > 50 ? combinedContent : '';
}

export async function generateTopicNoteMarkdownAsync(topic: string, title?: string): Promise<string> {
  const cleanTitle = title || `${topic} Study Notes`;

  try {
    const internetData = await fetchTopicInfoFromInternet(topic);
    if (internetData && internetData.length > 100) {
      const formattedNote = summarizeToMarkdownFormat(internetData, cleanTitle);
      const noteWithHeader = [
        `# 📌 ${cleanTitle}`,
        ``,
        `> **Live Internet Reference & Study Notes**: Auto-retrieved live data, documentation, and comprehensive breakdown for **${topic}**.`,
        ``,
        formattedNote.replace(/^#\s+.*$/m, ''),
        ``,
        `---`,
        `*Retrieved live from Wikipedia & Internet Knowledge Repositories*`,
      ].join('\n');

      return injectObsidianWikilinks(noteWithHeader);
    }
  } catch {
    // Fallback to offline knowledge engine
  }

  return generateTopicNoteMarkdown(topic, title);
}

export function generateTopicNoteMarkdown(topic: string, title?: string): string {
  const cleanTitle = title || `${topic} Study Notes`;
  const lowerTopic = topic.toLowerCase().trim();

  if (lowerTopic.includes('encapsulation')) {
    const raw = [
      `# 📌 Encapsulation Study Guide`,
      ``,
      `> **Executive Summary**: Encapsulation is a core pillar of Object-Oriented Programming (OOPS). It bundles data attributes and methods operating on that data within a single class while restricting direct access to internal object state.`,
      ``,
      `### 🏛️ Core Principles of Encapsulation`,
      `- **Data Hiding**: Prevents external code from corrupting internal state by marking fields private or protected.`,
      `- **Controlled Access**: Uses explicit Getter and Setter methods to inspect or safely update private state.`,
      `- **Flexibility & Maintainability**: Allows internal class refactoring without breaking external caller contracts.`,
      ``,
      `### 💻 Code Implementation (Python & Java)`,
      `\`\`\`python`,
      `class BankAccount:`,
      `    def __init__(self, owner: str, balance: float):`,
      `        self.owner = owner`,
      `        self.__balance = balance # Private attribute (__ prefix)`,
      ``,
      `    def deposit(self, amount: float) -> bool:`,
      `        if amount > 0:`,
      `            self.__balance += amount`,
      `            return True`,
      `        return False`,
      ``,
      `    def get_balance(self) -> float: # Controlled Getter`,
      `        return self.__balance`,
      `\`\`\``,
      ``,
      `### 🔑 Key Takeaways`,
      `- Enforces clear boundaries between public APIs and private state.`,
      `- Related concepts: [[OOPS]], [[Abstraction]], [[Classes]], [[Objects]], [[Python]], [[Java]].`,
    ].join('\n');
    return injectObsidianWikilinks(raw);
  }

  if (lowerTopic.includes('abstraction')) {
    const raw = [
      `# 📌 Abstraction Study Guide`,
      ``,
      `> **Executive Summary**: Abstraction hides complex internal implementation mechanics and exposes only essential interfaces to the user, reducing cognitive complexity.`,
      ``,
      `### 💡 Key Pillars & Mechanisms`,
      `- **Interfaces & Abstract Classes**: Defines contracts (what to do) without specifying concrete code (how to do it).`,
      `- **Complexity Reduction**: Hides low-level algorithm steps, network protocols, or database queries.`,
      ``,
      `### 💻 Code Implementation (Python)`,
      `\`\`\`python`,
      `from abc import ABC, abstractmethod`,
      ``,
      `class PaymentGateway(ABC):`,
      `    @abstractmethod`,
      `    def process_payment(self, amount: float) -> bool:`,
      `        pass`,
      ``,
      `class StripePayment(PaymentGateway):`,
      `    def process_payment(self, amount: float) -> bool:`,
      `        print(f"Processing Stripe payment: \\\${amount}")`,
      `        return True`,
      `\`\`\``,
      ``,
      `### 🔑 Abstraction vs Encapsulation`,
      `- **Abstraction**: Solves design-level complexity (Hiding how things work).`,
      `- **Encapsulation**: Solves implementation-level privacy (Hiding internal data state).`,
    ].join('\n');
    return injectObsidianWikilinks(raw);
  }

  if (lowerTopic.includes('inheritance')) {
    const raw = [
      `# 📌 Inheritance Study Guide`,
      ``,
      `> **Executive Summary**: Inheritance allows a child (derived) class to acquire properties, fields, and methods from a parent (base) class, maximizing code reuse.`,
      ``,
      `### 📦 Types of Inheritance`,
      `- **Single Inheritance**: One child class inherits from one parent class.`,
      `- **Multilevel Inheritance**: A class inherits from a derived class.`,
      `- **Multiple Inheritance**: A class inherits from multiple parents (supported in Python, C++).`,
      ``,
      `### 💻 Code Implementation (Python)`,
      `\`\`\`python`,
      `class Vehicle:`,
      `    def __init__(self, brand: str):`,
      `        self.brand = brand`,
      `    def start(self) -> str:`,
      `        return f"{self.brand} engine started."`,
      ``,
      `class Car(Vehicle): # Inherits from Vehicle`,
      `    def __init__(self, brand: str, model: str):`,
      `        super().__init__(brand) # Calls parent constructor`,
      `        self.model = model`,
      `\`\`\``,
    ].join('\n');
    return injectObsidianWikilinks(raw);
  }

  if (lowerTopic.includes('polymorphism')) {
    const raw = [
      `# 📌 Polymorphism Study Guide`,
      ``,
      `> **Executive Summary**: Polymorphism ("many forms") enables objects of different classes to respond to the same method call in their own specific ways.`,
      ``,
      `### 🔀 Types of Polymorphism`,
      `- **Method Overriding (Runtime)**: Child class provides a specific implementation of a parent method.`,
      `- **Method Overloading (Compile-time)**: Defining methods with the same name but different signatures.`,
      ``,
      `### 💻 Code Implementation (Python)`,
      `\`\`\`python`,
      `class Shape:`,
      `    def area(self) -> float:`,
      `        return 0.0`,
      ``,
      `class Circle(Shape):`,
      `    def __init__(self, radius: float):`,
      `        self.radius = radius`,
      `    def area(self) -> float: # Overrides parent method`,
      `        return 3.14159 * (self.radius ** 2)`,
      `\`\`\``,
    ].join('\n');
    return injectObsidianWikilinks(raw);
  }

  if (lowerTopic.includes('variable') || lowerTopic.includes('data type')) {
    const raw = [
      `# 📌 Variables & Data Types Guide`,
      ``,
      `> **Executive Summary**: Variables store data in named memory locations. Data types dictate the size, layout, and operations applicable to stored values.`,
      ``,
      `### 📦 Primitive & Complex Data Types`,
      `- **Integers**: Whole numbers without decimals (e.g. \`42\`).`,
      `- **Floating-Point**: Decimal numbers (e.g. \`3.14\`).`,
      `- **Strings**: Text character sequences (e.g. \`"Hello"\`).`,
      `- **Booleans**: Logical \`True\` or \`False\`.`,
      `- **Collections**: [[Lists]], [[Arrays]], [[Tuples]], [[Dictionaries]], [[Sets]].`,
      ``,
      `### 💻 Code Implementation (Python & Java)`,
      `\`\`\`python`,
      `age: int = 25`,
      `price: float = 19.99`,
      `name: str = "Alice"`,
      `is_active: bool = True`,
      `\`\`\``,
    ].join('\n');
    return injectObsidianWikilinks(raw);
  }

  if (lowerTopic.includes('function') || lowerTopic.includes('method')) {
    const raw = [
      `# 📌 Functions & Methods Guide`,
      ``,
      `> **Executive Summary**: Functions are reusable blocks of code designed to perform a specific task, promoting modularity and clean structure.`,
      ``,
      `### ⚡ Core Concepts`,
      `- **Parameters & Arguments**: Inputs passed into functions.`,
      `- **Return Values**: Computed output returned to callers.`,
      `- **Scope**: Local stack frame vs global scope.`,
      ``,
      `### 💻 Code Implementation (Python)`,
      `\`\`\`python`,
      `def calculate_total(prices: list[float], tax_rate: float = 0.05) -> float:`,
      `    subtotal = sum(prices)`,
      `    return subtotal * (1 + tax_rate)`,
      ``,
      `print(calculate_total([10.0, 20.0]))`,
      `\`\`\``,
    ].join('\n');
    return injectObsidianWikilinks(raw);
  }

  if (lowerTopic.includes('loop') || lowerTopic.includes('control flow')) {
    const raw = [
      `# 📌 Loops & Control Flow Guide`,
      ``,
      `> **Executive Summary**: Loops execute code blocks repeatedly based on iteration sequences or conditional evaluations.`,
      ``,
      `### 🔁 Loop Structures`,
      `- **For Loop**: Iterates over ranges, arrays, or collections.`,
      `- **While Loop**: Continues execution while a boolean condition remains \`True\`.`,
      `- **Keywords**: \`break\` (exit loop), \`continue\` (skip iteration).`,
      ``,
      `### 💻 Code Implementation (Python)`,
      `\`\`\`python`,
      `for i in range(5):`,
      `    print(f"Iteration: {i}")`,
      `\`\`\``,
    ].join('\n');
    return injectObsidianWikilinks(raw);
  }

  if (lowerTopic.includes('pointer')) {
    const raw = [
      `# 📌 Pointers & Memory Management`,
      ``,
      `> **Executive Summary**: A pointer is a variable holding the memory address of another variable, offering direct RAM inspection and dynamic allocation.`,
      ``,
      `### 🧠 Core Concepts`,
      `- **Address-of (\`&\`)**: Obtains memory location.`,
      `- **Dereference (\`*\`)**: Accesses value at location.`,
      `- **Memory Stack vs Heap**: Stack stores local frames; Heap handles dynamic allocation.`,
      ``,
      `### 💻 Code Implementation (C)`,
      `\`\`\`c`,
      `#include <stdio.h>`,
      `int main() {`,
      `    int val = 42;`,
      `    int *ptr = &val;`,
      `    printf("Value: %d, Address: %p\\n", *ptr, (void*)ptr);`,
      `    return 0;`,
      `}`,
      `\`\`\``,
    ].join('\n');
    return injectObsidianWikilinks(raw);
  }

  if (lowerTopic.includes('oops') || lowerTopic.includes('object oriented')) {
    const oopsNote = [
      `# 📌 ${cleanTitle}`,
      ``,
      `> **Executive Summary**: Comprehensive study guide on Object-Oriented Programming (OOPS) concepts, fundamental pillars, design patterns, and code implementations across languages like Python and Java.`,
      ``,
      `### 🏛️ Core Pillars of OOPS`,
      `- **[[Encapsulation]]**: Bundling data (attributes) and methods that operate on the data into a single unit (class), hiding internal object state.`,
      `- **[[Abstraction]]**: Hiding complex implementation details and exposing only essential interface features to the user.`,
      `- **[[Inheritance]]**: Mechanism where a child class inherits properties and behaviors from a parent class for code reusability.`,
      `- **[[Polymorphism]]**: Ability of an object or method to take on multiple forms (Method Overriding & Method Overloading).`,
      ``,
      `### 📦 Key Concepts: Classes & Objects`,
      `- **[[Classes]]**: Blueprints or user-defined data types containing attribute fields and functions.`,
      `- **[[Objects]]**: Instantiated instances of a class with real values assigned to fields.`,
      ``,
      `### 💻 Code Implementation (Python & Java)`,
      `\`\`\`python`,
      `class Animal:`,
      `    def __init__(self, name):`,
      `        self.name = name`,
      `    def speak(self):`,
      `        pass`,
      ``,
      `class Dog(Animal): # Inheritance`,
      `    def speak(self): # Polymorphism`,
      `        return f"{self.name} says Woof!"`,
      `\`\`\``,
      ``,
      `### 🔑 Best Practices & Design Principles`,
      `- **SOLID Principles**: Maintain Single Responsibility (SRP) and Open-Closed Principle (OCP).`,
      `- **Composition Over Inheritance**: Prefer combining decoupled objects over deep class inheritance hierarchies.`,
      ``,
      `---`,
      `*Generated by OmniContext MCP Knowledge Engine*`,
    ].join('\n');

    return injectObsidianWikilinks(oopsNote);
  }

  // Universal Fallback Generator with rich multi-section content
  const genericNote = [
    `# 📌 ${cleanTitle}`,
    ``,
    `> **Executive Summary**: Structured reference guide and detailed study notes on ${topic}, covering core mechanics, practical use cases, and design considerations.`,
    ``,
    `### 💡 Fundamentals of ${topic}`,
    `- Foundational pillars and terminology defining ${topic}.`,
    `- Execution flow, architectural patterns, and operational mechanics.`,
    `- Practical use cases in real-world software systems and data engineering.`,
    ``,
    `### 💻 Practical Implementation & Usage`,
    `\`\`\`text`,
    `// Standard workflow for ${topic}`,
    `1. Initialize environment and configure parameters`,
    `2. Process input datasets or execute core routines`,
    `3. Validate outputs and handle runtime edge cases`,
    `\`\`\``,
    ``,
    `### 🛠️ Key Takeaways & Best Practices`,
    `- Keep implementation modular, clean, and well-documented.`,
    `- Combine with related concepts like [[Variables]], [[Functions]], and [[Error Handling]].`,
    ``,
    `---`,
    `*Generated by OmniContext MCP Knowledge Engine*`,
  ].join('\n');

  return injectObsidianWikilinks(genericNote);
}

export function summarizeToMarkdownFormat(content: string, title?: string): string {
  if (!content || content.trim().length === 0) {
    return content;
  }

  const textWithoutHeaders = content
    .split('\n')
    .filter(
      (line) =>
        !line.trim().startsWith('#') &&
        !line.trim().startsWith('---') &&
        !line.trim().startsWith('Title:') &&
        !line.trim().startsWith('URL:') &&
        !line.trim().startsWith('Thumbnail:') &&
        !line.trim().startsWith('Keywords:') &&
        !line.trim().startsWith('- **Keywords:'),
    )
    .join(' ');

  const rawSentences = textWithoutHeaders
    .split(/(?<=[.?!])\s+|(?<=\b(?:so|next|then|finally|moving on|now|also)\b)\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const fillerRegex = /^(what is up guys|in this video|i'm going to be|let's get started|with that being said|have a wonderful day|i'll see you|check those out|so to create|and also a|let's go ahead|and you'll notice|next we have|okay next|moving on to|pretend we want|you're going to notice)/i;

  const cleanSentences: string[] = [];
  const seen = new Set<string>();

  for (const s of rawSentences) {
    let clean = s.replace(fillerRegex, '').trim();
    clean = clean.replace(/^(and|so|also|then|now|well)\s+/i, '');
    clean = clean.replace(/\s+(so|and|then|or|but|because)$/i, '').trim();
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    if (clean.length > 18 && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      cleanSentences.push(clean);
    }
  }

  const topics: { [key: string]: string[] } = {
    '🛠️ Environment & Setup': [],
    '📦 Variables & Data Types': [],
    '🔢 Math & Operations': [],
    '🔀 Conditional Logic': [],
    '🔁 Loops & Control Flow': [],
    '⚡ Functions & Reusability': [],
    '🛡️ Exception & Error Handling': [],
    '📌 Key Highlights': [],
  };

  for (const sentence of cleanSentences) {
    const lower = sentence.toLowerCase();
    if (lower.includes('download') || lower.includes('pycharm') || lower.includes('python 3') || lower.includes('editor')) {
      topics['🛠️ Environment & Setup'].push(sentence);
    } else if (lower.includes('variable') || lower.includes('string') || lower.includes('integer') || lower.includes('boolean') || lower.includes('list') || lower.includes('convert') || lower.includes('type')) {
      topics['📦 Variables & Data Types'].push(sentence);
    } else if (lower.includes('math') || lower.includes('add') || lower.includes('multiply') || lower.includes('power') || lower.includes('calculate')) {
      topics['🔢 Math & Operations'].push(sentence);
    } else if (lower.includes('if') || lower.includes('else') || lower.includes('elif') || lower.includes('statement')) {
      topics['🔀 Conditional Logic'].push(sentence);
    } else if (lower.includes('loop') || lower.includes('range') || lower.includes('while') || lower.includes('for') || lower.includes('break')) {
      topics['🔁 Loops & Control Flow'].push(sentence);
    } else if (lower.includes('function') || lower.includes('def') || lower.includes('pass') || lower.includes('reuse')) {
      topics['⚡ Functions & Reusability'].push(sentence);
    } else if (lower.includes('try') || lower.includes('except') || lower.includes('error') || lower.includes('exception')) {
      topics['🛡️ Exception & Error Handling'].push(sentence);
    } else {
      if (topics['📌 Key Highlights'].length < 5) {
        topics['📌 Key Highlights'].push(sentence);
      }
    }
  }

  const cleanTitle = title || 'Structured Executive Summary';
  const markdownBlocks: string[] = [
    `# 📌 ${cleanTitle}`,
    ``,
    `> **Executive Summary**: A neat, structured breakdown of key takeaways and essential points extracted from the content.`,
    ``,
  ];

  let totalPoints = 0;
  for (const [category, points] of Object.entries(topics)) {
    if (points.length > 0) {
      markdownBlocks.push(`### ${category}`);
      for (const p of points.slice(0, 12)) {
        markdownBlocks.push(`- ${p}`);
        totalPoints++;
      }
      markdownBlocks.push(``);
    }
  }

  if (cleanSentences.length > 0) {
    markdownBlocks.push(`### 🔑 Detailed Concept Breakdown & Comprehensive Notes`);
    for (const s of cleanSentences.slice(0, 20)) {
      markdownBlocks.push(`- ${s}`);
    }
    markdownBlocks.push(``);
  }

  markdownBlocks.push(`---`);
  markdownBlocks.push(`*Neat summary generated by OmniContext MCP*`);

  const rawMarkdown = markdownBlocks.join('\n');
  return injectObsidianWikilinks(rawMarkdown);
}
