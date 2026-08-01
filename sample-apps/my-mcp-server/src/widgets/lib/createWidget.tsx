'use client';

import React from 'react';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export interface WidgetComponentProps<T> {
  data: T;
  theme: 'light' | 'dark' | null;
}

/**
 * Higher-order component factory to create NitroStack UI Widgets using `createWidget`.
 */
export function createWidget<T>(
  Component: React.ComponentType<WidgetComponentProps<T>>
) {
  return function WidgetWrapper() {
    const { isReady, getToolOutput } = useWidgetSDK();
    const theme = useTheme();

    if (!isReady) {
      return (
        <div
          style={{
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            color: '#888',
            textAlign: 'center',
            background: theme === 'dark' ? '#0d1117' : '#f6f8fa',
            borderRadius: '12px',
          }}
        >
          Initializing NitroStack Widget...
        </div>
      );
    }

    const data = getToolOutput<T>();
    if (!data) {
      return (
        <div
          style={{
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            color: '#888',
            textAlign: 'center',
            background: theme === 'dark' ? '#0d1117' : '#f6f8fa',
            borderRadius: '12px',
          }}
        >
          No widget data received.
        </div>
      );
    }

    return <Component data={data} theme={theme} />;
  };
}
