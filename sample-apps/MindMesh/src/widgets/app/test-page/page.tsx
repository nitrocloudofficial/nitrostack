'use client';

import React from 'react';
import { useTheme, useWidgetSDK, useWidgetState, useMaxHeight } from '@nitrostack/widgets';

export default function TestPage() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const sdk = useWidgetSDK();
  const [state, setState] = useWidgetState<{value: number}>(() => ({ value: 0 }));

  return (
    <div style={{ padding: 20 }}>
      <h1>Test Page Works!</h1>
      <p>Theme: {theme}</p>
      <p>Max Height: {maxHeight}px</p>
      <p>State: {state.value}</p>
    </div>
  );
}
