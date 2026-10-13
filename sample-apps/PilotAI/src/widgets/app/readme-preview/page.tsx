'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

/**
 * README Preview Widget
 *
 * Renders the output of the `generate_readme` tool as a formatted Markdown
 * preview, with a toggle to view the raw Markdown source.
 */

interface ReadmeData {
  project_name: string;
  markdown: string;
  sections: {
    features: string[];
    tech_stack: string[];
    installation_steps: string[];
    usage: string | null;
    license: string;
  };
}

function isReadmeData(value: unknown): value is ReadmeData {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ReadmeData).markdown === 'string' &&
    !!(value as ReadmeData).sections &&
    typeof (value as ReadmeData).sections === 'object'
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderInline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  return html;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('# ')) {
      closeList();
      htmlParts.push(`<h1>${renderInline(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      closeList();
      htmlParts.push(`<h2>${renderInline(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      closeList();
      htmlParts.push(`<h3>${renderInline(line.slice(4))}</h3>`);
    } else if (/^\d+\.\s/.test(line) || line.startsWith('- ')) {
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      const content = line.replace(/^\d+\.\s/, '').replace(/^-\s/, '');
      htmlParts.push(`<li>${renderInline(content)}</li>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      htmlParts.push(`<p>${renderInline(line)}</p>`);
    }
  }
  closeList();

  function closeList() {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  }

  return htmlParts.join('\n');
}

type Phase = 'idle' | 'executing' | 'success' | 'error';

export default function ReadmePreviewWidget() {
  const theme = useTheme();
  const { getToolOutput, toolInput, toolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ tab: 'preview' | 'raw' }>(() => ({ tab: 'preview' }));

  const [phase, setPhase] = useState<Phase>('idle');
  const [data, setData] = useState<ReadmeData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The host (NitroStudio's preview pane) may seed `toolInput`/`toolOutput`
  // with something non-null before the user ever clicks "Execute Tool" —
  // e.g. the tool's own declared `examples.response` metadata, so the
  // preview has something to show. That is NOT a real execution. Snapshot
  // whatever is present on first render (synchronously, via useRef's lazy
  // initializer — no readiness gate) and treat that as the baseline. Only a
  // genuine change *after* that baseline is treated as "the tool ran."
  //
  // NOTE: an earlier version of this gated the effect on `isReady` from
  // useWidgetSDK(). That silently broke the widget: `dashboard` and
  // `task-list` both react to `toolOutput` correctly without ever checking
  // `isReady`, which means it isn't a prerequisite for these globals to be
  // usable in this host — but it also means `isReady` may never actually
  // become `true` here, so gating on it left the effect permanently
  // no-op'ing, and the widget never left the idle state even after a real,
  // successful execution.
  const baselineRef = useRef<{ input: unknown; output: unknown }>({
    input: toolInput,
    output: toolOutput
  });

  useEffect(() => {
    const outputChanged = toolOutput !== baselineRef.current.output;
    const inputChanged = toolInput !== baselineRef.current.input;

    if (outputChanged) {
      baselineRef.current.output = toolOutput;
      // Validation only ever happens here — after a real, new response —
      // never during the initial render.
      const raw = getToolOutput<unknown>();
      if (isReadmeData(raw)) {
        setData(raw);
        setErrorMessage(null);
        setPhase('success');
      } else {
        setData(null);
        setErrorMessage(typeof raw === 'string' ? raw : 'The tool response was missing the expected README data.');
        setPhase('error');
      }
      return;
    }

    if (inputChanged) {
      baselineRef.current.input = toolInput;
      setPhase('executing');
    }
    // `getToolOutput` is a new bound function on every render of
    // useWidgetSDK() (`sdk.getToolOutput.bind(sdk)`), so it's intentionally
    // left out of the dependency array — including it would re-run this
    // effect on every unrelated render instead of only when the host
    // actually pushes new toolInput/toolOutput.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInput, toolOutput]);

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
  const textColor = isDark ? '#ffffff' : '#111827';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  if (phase === 'idle') {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: mutedColor, background: bgColor }}>
        Fill in the form and click "Execute Tool" to generate a README preview.
      </div>
    );
  }

  if (phase === 'executing') {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: textColor, background: bgColor }}>
        Generating README...
      </div>
    );
  }

  if (phase === 'error' || !data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444', background: bgColor }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Unable to load README</div>
        <div style={{ fontSize: '12px', color: mutedColor }}>
          {errorMessage ?? 'The tool response was missing the expected README data.'}
        </div>
      </div>
    );
  }

  const tab = state?.tab ?? 'preview';

  return (
    <div
      style={{
        padding: '24px',
        background: bgColor,
        color: textColor,
        borderRadius: '16px',
        maxWidth: '560px',
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        border: `1px solid ${borderColor}`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>📄 {data.project_name} README</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: mutedColor }}>
            {data.sections.features.length} features · {data.sections.tech_stack.length} tech · {data.sections.license}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['preview', 'raw'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setState({ tab: t })}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: `1px solid ${tab === t ? '#764ba2' : borderColor}`,
                background: tab === t ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: tab === t ? '#fff' : textColor,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {t === 'preview' ? 'Preview' : 'Raw Markdown'}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          background: cardBg,
          borderRadius: '12px',
          padding: '18px',
          border: `1px solid ${borderColor}`,
          maxHeight: '420px',
          overflowY: 'auto'
        }}
      >
        {tab === 'preview' ? (
          <div
            className="readme-preview-markdown"
            style={{ fontSize: '13px', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(data.markdown) }}
          />
        ) : (
          <pre
            style={{
              margin: 0,
              fontSize: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {data.markdown}
          </pre>
        )}
      </div>

      <style>{`
        .readme-preview-markdown h1 { font-size: 20px; margin: 0 0 8px 0; }
        .readme-preview-markdown h2 { font-size: 16px; margin: 16px 0 6px 0; }
        .readme-preview-markdown h3 { font-size: 14px; margin: 12px 0 4px 0; }
        .readme-preview-markdown p { margin: 4px 0; }
        .readme-preview-markdown ul { margin: 4px 0; padding-left: 20px; }
        .readme-preview-markdown li { margin: 2px 0; }
        .readme-preview-markdown code {
          background: ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'};
          border-radius: 4px;
          padding: 1px 5px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
