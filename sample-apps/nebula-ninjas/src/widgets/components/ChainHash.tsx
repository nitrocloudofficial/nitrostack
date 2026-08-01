import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface ChainHashProps {
  hash: string;
  label?: string;
  truncateLength?: number;
}

export const ChainHash: React.FC<ChainHashProps> = ({
  hash,
  label,
  truncateLength = 12,
}) => {
  const [copied, setCopied] = useState(false);

  const displayHash = hash
    ? hash.length > truncateLength
      ? `${hash.substring(0, truncateLength)}...`
      : hash
    : 'N/A';

  const handleCopy = () => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400/90 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/20 group">
      {label && <span className="text-slate-400 font-sans">{label}:</span>}
      <span>{displayHash}</span>
      <button
        onClick={handleCopy}
        className="opacity-60 hover:opacity-100 transition-opacity p-0.5"
        title="Copy full hash"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3 text-slate-400 group-hover:text-sky-300" />
        )}
      </button>
    </div>
  );
};
