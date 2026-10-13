'use client';

import { useEffect, useState } from 'react';
import manifest from '../widget-manifest.json';

/**
 * Development preview.
 *
 * A widget normally renders from tool output handed to it by the host, so opening one directly in
 * a browser shows an empty state. Adding `?preview=1` falls back to the example data in
 * widget-manifest.json — the same examples NitroStudio uses — so layout and styling can be checked
 * without a running agent.
 *
 *   http://localhost:3001/portfolio-dashboard?preview=1
 *   http://localhost:3001/intervention-modal?preview=1&theme=dark
 *
 * Opt-in by query param only, so a real host render is never affected. Read after mount rather
 * than during render, so server and client markup agree.
 */

/** Bumped whenever this file changes, so a stale browser cache is obvious rather than mysterious. */
export const PREVIEW_BUILD = 'preview-v2';

export interface PreviewState<T> {
  /** Did the URL ask for preview mode? */
  requested: boolean;
  /** Has the client mounted? False means we are still rendering server markup. */
  mounted: boolean;
  data: T | null;
  /** Why preview data could not be resolved, if it was asked for. */
  problem: string | null;
}

export function usePreview<T>(uri: string): PreviewState<T> {
  const [state, setState] = useState<PreviewState<T>>({
    requested: false,
    mounted: false,
    data: null,
    problem: null
  });

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).has('preview');
    if (!requested) {
      setState({ requested: false, mounted: true, data: null, problem: null });
      return;
    }

    const widget = manifest.widgets.find((w) => w.uri === uri);
    if (!widget) {
      const known = manifest.widgets.map((w) => w.uri).join(', ');
      setState({
        requested,
        mounted: true,
        data: null,
        problem: `No widget "${uri}" in widget-manifest.json. Known: ${known}`
      });
      return;
    }

    const example = widget.examples?.[0]?.data;
    if (!example) {
      setState({ requested, mounted: true, data: null, problem: `"${uri}" has no examples[0].data in the manifest.` });
      return;
    }

    setState({ requested, mounted: true, data: example as unknown as T, problem: null });
  }, [uri]);

  return state;
}

/** Lets `?theme=dark` override the host theme, so both modes can be checked in one browser. */
export function usePreviewTheme(): string | null {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('preview')) return;
    const requested = params.get('theme');
    if (requested === 'dark' || requested === 'light') setTheme(requested);
  }, []);

  return theme;
}

/**
 * Text for the empty state. In a host this is a plain "waiting" message; opened directly in a
 * browser it explains what to do instead of leaving a spinner with no explanation.
 */
export function emptyStateMessage(preview: PreviewState<unknown>, label: string): string {
  if (!preview.mounted) return `Loading ${label}…`;
  if (preview.problem) return `Preview failed — ${preview.problem}`;
  if (preview.requested) return `Preview requested but no data resolved (${PREVIEW_BUILD}).`;
  return `Waiting for tool output from the host. To see this widget with sample data, add ?preview=1 to the URL. (${PREVIEW_BUILD})`;
}
