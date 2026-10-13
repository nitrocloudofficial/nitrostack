'use client';

import { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface Evidence {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  type: string;
  source: string;
  status: string;
  collectedBy: string;
  collectedAt: string;
  tags?: string[];
}

export default function EvidenceCard() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const [expanded, setExpanded] = useState(false);

  const output = getToolOutput<any>();

  console.log("Evidence Output:", output);

  if (output?.isError) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: "#7f1d1d",
          color: "white",
        }}
      >
        <h3>❌ Tool Error</h3>
        <pre>{JSON.stringify(output.content, null, 2)}</pre>
      </div>
    );
  }

  const evidence: Evidence | undefined =
    output?.evidence ??
    output?.data?.evidence ??
    output;

  if (!evidence) {
    return (
      <div style={{ padding: 20 }}>
        No evidence received.
      </div>
    );
  }

  const dark = theme === "dark";

  return (
    <div
      style={{
        maxWidth: 520,
        padding: 24,
        borderRadius: 18,
        background: dark ? "#111827" : "#ffffff",
        color: dark ? "#ffffff" : "#111827",
        border: dark
          ? "1px solid #374151"
          : "1px solid #e5e7eb",
        boxShadow: "0 10px 25px rgba(0,0,0,.15)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              color: "#60A5FA",
              fontSize: 13,
            }}
          >
            📄 Evidence
          </div>

          <h2
            style={{
              marginTop: 5,
              marginBottom: 0,
            }}
          >
            {evidence.title || "Untitled Evidence"}
          </h2>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            background: "#2563EB",
            color: "white",
            cursor: "pointer",
          }}
        >
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 20,
        }}
      >
        <Info label="Type" value={evidence.type} />
        <Info label="Status" value={evidence.status} />
        <Info label="Source" value={evidence.source} />
        <Info label="Collected By" value={evidence.collectedBy} />
      </div>

      <div style={{ marginTop: 20 }}>
        <strong>Tags</strong>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 10,
          }}
        >
          {(evidence.tags ?? []).length > 0 ? (
            evidence.tags!.map((tag) => (
              <span
                key={tag}
                style={{
                  background: "#2563EB",
                  color: "#fff",
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                }}
              >
                {tag}
              </span>
            ))
          ) : (
            <span style={{ opacity: 0.6 }}>
              No Tags
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 20,
            borderTop: "1px solid rgba(255,255,255,.15)",
            paddingTop: 20,
          }}
        >
          <strong>Description</strong>

          <p
            style={{
              lineHeight: 1.7,
            }}
          >
            {evidence.description || "No description available."}
          </p>
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "rgba(37,99,235,.08)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.7,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontWeight: 600,
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}