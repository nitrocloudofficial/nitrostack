'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language: string;
  filename: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-dot" style={{ background: '#ff5f57' }} />
        <span className="code-dot" style={{ background: '#febc2e' }} />
        <span className="code-dot" style={{ background: '#28c840' }} />
        <span style={{ marginLeft: 8 }}>{filename}</span>
        <button
          onClick={copy}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
          }}
        >
          {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code-body">
        <code>{code}</code>
      </pre>
    </div>
  );
}
