/**
 * NitroStack compatibility entry point for the application.
 *
 * NitroStudio may open this project through a Windows junction. With Node 24,
 * the root and nested source files can then be evaluated by different loaders:
 * one uses legacy TypeScript decorators and the other uses the current
 * JavaScript decorator calling convention. NitroStack 1.0.14 expects only the
 * legacy convention and uses module-local Symbols for metadata.
 *
 * This adapter accepts both decorator conventions and mirrors tool metadata to
 * every NitroStack SDK instance loaded in the process.
 */
import 'reflect-metadata';
import * as Core from '@nitrostack/core';

export * from '@nitrostack/core';

/**
 * @nitrostack/core 1.0.14 eagerly registers OAuthModule as a side effect of
 * importing the package barrel. When OAuth is not configured, the container
 * later tries to construct that module without OAUTH_CONFIG and emits a
 * production ERROR even though the MCP server continues to work. NitroCloud
 * counts that startup error against application health.
 *
 * This app intentionally relies on NitroCloud/NitroChat's managed connection
 * and does not enable the SDK OAuth module, so remove only that unconfigured
 * side-effect registration. If OAuth is configured in the future, forRoot()
 * will supply OAUTH_CONFIG and register the module normally.
 */
const nitroContainer = Core.DIContainer.getInstance() as unknown as {
  providers?: Map<unknown, unknown>;
  instances?: Map<unknown, unknown>;
};

if (!Core.OAuthModule.getConfig()) {
  nitroContainer.providers?.delete(Core.OAuthModule);
  nitroContainer.instances?.delete(Core.OAuthModule);
}

type ToolOptions = Parameters<typeof Core.ToolDecorator>[0];
type ToolRecord = {
  methodName: string;
  options: ToolOptions;
};
type ToolMetadataKeyRegistry = Set<symbol>;

const registrySlot = Symbol.for('forgeops:nitrostack-tool-metadata-keys');
const globalRegistry = globalThis as typeof globalThis & {
  [registrySlot]?: ToolMetadataKeyRegistry;
};
const toolMetadataKeys =
  globalRegistry[registrySlot] ??= new Set<symbol>();

class ToolMetadataProbe {
  probe(): void {}
}

Core.ToolDecorator({
  name: '__forgeops_metadata_probe__',
  description: 'Internal metadata compatibility probe',
  inputSchema: Core.z.object({}),
})(
  ToolMetadataProbe.prototype,
  'probe',
  Object.getOwnPropertyDescriptor(ToolMetadataProbe.prototype, 'probe')!,
);

for (const key of Reflect.getMetadataKeys(ToolMetadataProbe)) {
  if (typeof key === 'symbol' && key.description === 'tool:metadata') {
    toolMetadataKeys.add(key);
  }
}

function registerToolMetadata(
  controller: Function,
  methodName: string | symbol,
  options: ToolOptions,
): void {
  const normalizedMethodName = String(methodName);

  for (const key of toolMetadataKeys) {
    const existing = [
      ...(Reflect.getMetadata(key, controller) as ToolRecord[] | undefined ?? []),
    ];

    if (
      existing.some(
        (tool) =>
          tool.methodName === normalizedMethodName &&
          tool.options.name === options.name,
      )
    ) {
      continue;
    }

    existing.push({ methodName: normalizedMethodName, options });
    Reflect.defineMetadata(key, existing, controller);
  }
}

/**
 * Drop-in replacement for NitroStack's method decorator that supports both
 * legacy TypeScript decorators and Node 24's standard decorator protocol.
 */
export function ToolDecorator(options: ToolOptions): any {
  return (
    targetOrMethod: object | Function,
    propertyKeyOrContext:
      | string
      | symbol
      | {
          kind: string;
          name: string | symbol;
          static: boolean;
          addInitializer(initializer: (this: any) => void): void;
        },
    descriptor?: PropertyDescriptor,
  ) => {
    if (
      typeof propertyKeyOrContext === 'object' &&
      propertyKeyOrContext.kind === 'method'
    ) {
      const context = propertyKeyOrContext;
      context.addInitializer(function registerStandardDecoratorMetadata() {
        const controller = context.static
          ? this as Function
          : this.constructor as Function;
        registerToolMetadata(controller, context.name, options);
      });
      return targetOrMethod;
    }

    registerToolMetadata(
      (targetOrMethod as object).constructor,
      propertyKeyOrContext as string | symbol,
      options,
    );
    return descriptor;
  };
}
