declare namespace JSX {
  interface IntrinsicElements { [elementName: string]: any; }
}

declare module 'react' {
  export type ReactNode = any;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useState<T>(initial: T): [T, (value: T | ((current: T) => T)) => void];
}

declare module '@nitrostack/widgets' {
  export interface WidgetSdk {
    isReady: boolean;
    getToolOutput<T = unknown>(): T | null;
    callTool(name: string, input: Record<string, unknown>): Promise<unknown>;
    sendFollowUpMessage(message: string): Promise<unknown>;
  }
  export function useWidgetSDK(): WidgetSdk;
}

declare module '*.css' {}
