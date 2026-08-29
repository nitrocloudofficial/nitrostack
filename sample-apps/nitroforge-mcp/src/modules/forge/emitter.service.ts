import { Injectable } from '@nitrostack/core';
import Handlebars from 'handlebars';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, readFile, writeFile, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EndpointGraph, Endpoint } from '../../contracts/endpoint-graph.schema.js';
import type { ToolSurfaceIR, ToolIR, ToolModuleIR } from '../../contracts/ir.schema.js';
import type { GeneratedProject } from '../../contracts/generated-project.schema.js';
import type { EmitPort } from '../../contracts/ports.js';
import { deriveInputSchema, resolvePrimaryEndpoint } from './schema-derivation.js';
import { synthesizeRequestExample, synthesizeResponseExample } from './example-synthesis.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const SKELETON_DIR = join(REPO_ROOT, 'templates', 'skeleton');
// .hbs files aren't compiled/copied by tsc, so always resolve them under
// src/ regardless of whether this class is running from src/ (ts-node/tsx)
// or dist/ (compiled) — __dirname alone would point at dist/.../templates/
// when compiled, which never exists.
const TEMPLATES_DIR = join(REPO_ROOT, 'src', 'modules', 'forge', 'templates');
const SERVERS_DIR = join(REPO_ROOT, '.forge', 'servers');

/**
 * emitter.service.ts — (3) EMIT: ToolSurfaceIR + EndpointGraph -> GeneratedProject.
 *
 * Three rules, non-negotiable (see docs/BUILD-W2.md):
 * 1. Deterministic. No model anywhere below this comment.
 * 2. Input schemas come ONLY from schema-derivation.ts's graph walk -- never
 *    from the IR, which has no inputSchema field by design.
 * 3. Never patch emitted files to fix a verification failure -- fix a
 *    template or reject the IR upstream.
 *
 * SCOPE NOTE, flagged rather than silently narrowed: BUILD-W2's
 * service.hbs guidance says "one method per composed endpoint." This
 * implementation generates one service method PER TOOL, calling that
 * tool's `primaryEndpoint` -- correct for the current demo.ir.json (every
 * tool composes exactly one endpoint, always equal to primaryEndpoint) but
 * not a general multi-endpoint composition. Extending to genuinely
 * multi-endpoint tools is real future work, not attempted here.
 */
@Injectable()
export class EmitterService implements Pick<EmitPort, 'emit'> {
  private readonly templates = new Map<string, HandlebarsTemplateDelegate>();

  private async getTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
    const cached = this.templates.get(name);
    if (cached) return cached;
    const source = await readFile(join(TEMPLATES_DIR, `${name}.hbs`), 'utf-8');
    const compiled = Handlebars.compile(source, { noEscape: true });
    this.templates.set(name, compiled);
    return compiled;
  }

  async emit(ir: ToolSurfaceIR, graph: EndpointGraph): Promise<GeneratedProject> {
    if (!existsSync(SKELETON_DIR)) {
      throw new Error(
        `templates/skeleton/ not found at ${SKELETON_DIR} -- build it first (npx @nitrostack/cli init, pre-warm node_modules)`,
      );
    }

    const id = `proj_${randomUUID()}`;
    const rootPath = join(SERVERS_DIR, id);

    // STEP 1 -- copy skeleton (pre-warmed node_modules + root config), then
    // clear the REGENERATED parts of src/. src/widgets/ is deliberately
    // preserved: it's a pre-built static export (npx next build, done once
    // in templates/skeleton/src/widgets/ -- not per generation), not
    // per-tool content. Wiping it here would silently break every
    // @Widget()-decorated tool's boot (confirmed: McpApplicationFactory.
    // create() reads templates/skeleton/src/widgets/out/<route>.html and
    // throws if it's missing).
    await mkdir(dirname(rootPath), { recursive: true });
    await cp(SKELETON_DIR, rootPath, { recursive: true });
    await rm(join(rootPath, 'src', 'modules'), { recursive: true, force: true });
    await rm(join(rootPath, 'src', 'app.module.ts'), { force: true });
    await rm(join(rootPath, 'src', 'index.ts'), { force: true });
    await mkdir(join(rootPath, 'src', 'modules'), { recursive: true });

    const files: Array<{ relPath: string; contents: string }> = [];
    const toolNames: string[] = [];

    // STEP 2+3 -- derive schemas from the graph, render templates, per module.
    const moduleContexts = ir.modules.map((m) => this.buildModuleClassNames(m));

    const appModuleTpl = await this.getTemplate('app.module');
    const appModuleSrc = appModuleTpl({
      serverNameJSON: JSON.stringify(ir.server.name),
      serverVersionJSON: JSON.stringify(ir.server.version),
      serverDescriptionJSON: JSON.stringify(ir.server.description),
      modules: moduleContexts.map((m) => ({ name: m.moduleName, className: m.className })),
    });
    await this.writeFile(rootPath, 'src/app.module.ts', appModuleSrc, files);

    const indexTpl = await this.getTemplate('index');
    await this.writeFile(rootPath, 'src/index.ts', indexTpl({}), files);

    const moduleTpl = await this.getTemplate('module');
    const toolsTpl = await this.getTemplate('tools');
    const serviceTpl = await this.getTemplate('service');

    for (const mod of ir.modules) {
      const names = this.buildModuleClassNames(mod);
      const moduleDir = join('src', 'modules', names.moduleName);

      const toolEntries = mod.tools.map((tool) => this.buildToolContext(tool, graph));
      for (const t of toolEntries) toolNames.push(t.nameRaw);

      const anyWidget = toolEntries.some((t) => t.widgetArchetype);
      const anyCache = toolEntries.some((t) => t.cacheTtl);

      const toolsSrc = toolsTpl({
        serviceClassName: names.serviceClassName,
        serviceParamName: names.serviceParamName,
        toolsClassName: names.toolsClassName,
        moduleName: names.moduleName,
        anyWidget,
        anyCache,
        tools: toolEntries,
      });
      await this.writeFile(rootPath, join(moduleDir, `${names.moduleName}.tools.ts`), toolsSrc, files);

      const authHeaderName = ir.auth.type === 'apiKey' ? ir.auth.name ?? 'X-API-Key' : null;
      const serviceMethods = toolEntries.map((t) => t.serviceMethod);
      const serviceSrc = serviceTpl({
        serviceClassName: names.serviceClassName,
        baseUrlJSON: JSON.stringify(graph.source.url),
        authHeaderName,
        authHeaderNameJSON: JSON.stringify(authHeaderName),
        methods: serviceMethods,
      });
      await this.writeFile(rootPath, join(moduleDir, `${names.moduleName}.service.ts`), serviceSrc, files);

      const moduleSrc = moduleTpl({
        moduleNameJSON: JSON.stringify(names.moduleName),
        moduleDescriptionJSON: JSON.stringify(`${names.moduleName} tools`),
        toolsClassName: names.toolsClassName,
        serviceClassName: names.serviceClassName,
        className: names.className,
        moduleName: names.moduleName,
      });
      await this.writeFile(rootPath, join(moduleDir, `${names.moduleName}.module.ts`), moduleSrc, files);
    }

    // package.json: mutate the skeleton's, don't hand-template JSON --
    // deterministic and avoids hand-escaping JSON inside Handlebars.
    const pkgPath = join(rootPath, 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    pkg.name = this.slugify(ir.server.name);
    pkg.description = ir.server.description;
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    files.push({ relPath: 'package.json', contents: JSON.stringify(pkg, null, 2) + '\n' });

    return {
      id,
      rootPath,
      files,
      entrypoint: 'dist/index.js',
      toolNames,
    };
  }

  private async writeFile(
    rootPath: string,
    relPath: string,
    contents: string,
    files: Array<{ relPath: string; contents: string }>,
  ): Promise<void> {
    const fullPath = join(rootPath, relPath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, contents, 'utf-8');
    // GeneratedProject.files[].relPath is a portable identifier (consumed by
    // tests, the console, etc.), not a raw OS path -- path.join() on Windows
    // produces backslashes, which is wrong here even though the real disk
    // write above correctly used the OS-native separator via `fullPath`.
    files.push({ relPath: relPath.split('\\').join('/'), contents });
  }

  private buildModuleClassNames(mod: ToolModuleIR) {
    const pascal = this.toPascal(mod.name);
    return {
      moduleName: mod.name,
      className: `${pascal}Module`,
      toolsClassName: `${pascal}Tools`,
      serviceClassName: `${pascal}Service`,
      serviceParamName: this.toCamel(mod.name) + 'Service',
    };
  }

  private buildToolContext(tool: ToolIR, graph: EndpointGraph) {
    const derived = deriveInputSchema(graph, tool.composes);
    const primaryEndpoint = resolvePrimaryEndpoint(graph, tool.primaryEndpoint);
    const methodName = this.toCamel(tool.name);

    const requestExample = tool.examples?.request ?? synthesizeRequestExample(derived.fields);
    const responseExample = tool.examples?.response ?? synthesizeResponseExample(primaryEndpoint.responseSchema);

    return {
      nameRaw: tool.name,
      nameJSON: JSON.stringify(tool.name),
      descriptionJSON: JSON.stringify(tool.description),
      inputSchemaSource: derived.source,
      invokingJSON: JSON.stringify(this.toInvoking(tool.name)),
      invokedJSON: JSON.stringify(this.toInvoked(tool.name)),
      requestExampleJSON: JSON.stringify(requestExample),
      responseExampleJSON: JSON.stringify(responseExample),
      widgetArchetype: tool.widget?.archetype ?? null,
      widgetArchetypeJSON: tool.widget ? JSON.stringify(tool.widget.archetype) : null,
      cacheTtl: tool.cache?.ttl ?? null,
      methodName,
      serviceMethod: this.buildServiceMethod(methodName, primaryEndpoint, derived.fields),
    };
  }

  private buildServiceMethod(
    methodName: string,
    endpoint: Endpoint,
    fields: ReturnType<typeof deriveInputSchema>['fields'],
  ) {
    const pathTemplate = endpoint.path.replace(/\{(\w+)\}/g, '${input.$1}');
    const queryParams = endpoint.queryParams.map((p) => p.name);
    const isWrite = endpoint.method === 'post' || endpoint.method === 'put' || endpoint.method === 'patch';
    const bodyFields = isWrite ? fields.filter((f) => f.location === 'body').map((f) => f.name) : [];

    return {
      methodName,
      pathTemplate,
      httpMethodJSON: JSON.stringify(endpoint.method.toUpperCase()),
      queryParams,
      hasBody: bodyFields.length > 0,
      bodyFields,
    };
  }

  private toInvoking(toolName: string): string {
    return `${this.toTitleWords(toolName)}...`;
  }
  private toInvoked(toolName: string): string {
    return `${this.toTitleWords(toolName)} done`;
  }
  private toTitleWords(snake: string): string {
    return snake
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  private toCamel(snake: string): string {
    return snake.replace(/_([a-z0-9])/g, (_m, c) => c.toUpperCase());
  }
  private toPascal(snake: string): string {
    const camel = this.toCamel(snake);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }
  private slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  }
}
