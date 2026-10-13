'use client';

import { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface Entity {
  id: string;
  investigationId: string;
  type: string;
  value: string;
  confidence: number;
  description?: string;
  tags?: string[];
}

export default function EntityCard() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const [expanded, setExpanded] = useState(false);

  const output = getToolOutput<any>();

  if (output?.isError) {
    return (
      <div
        style={{
          padding: 20,
          background: "#7f1d1d",
          color: "white",
          borderRadius: 12,
        }}
      >
        <h3>❌ Tool Error</h3>
        <pre>{JSON.stringify(output.content, null, 2)}</pre>
      </div>
    );
  }

  const entity: Entity =
    output?.entity ??
    output?.data?.entity ??
    output;

  if (!entity) {
    return (
      <div style={{ padding: 20 }}>
        No Entity Found
      </div>
    );
  }

  const dark = theme === "dark";

  return (
    <div
      style={{
        maxWidth: 500,
        padding: 24,
        borderRadius: 18,
        background: dark ? "#111827" : "#ffffff",
        color: dark ? "#fff" : "#111827",
        border: dark
          ? "1px solid #374151"
          : "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              color: "#60A5FA",
              fontSize: 13,
            }}
          >
            🌐 Entity
          </div>

          <h2>{entity.value}</h2>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "#2563EB",
            color: "white",
            border: "none",
            padding: "8px 14px",
            borderRadius: 8,
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
        <Info label="Type" value={entity.type} />
        <Info
          label="Confidence"
          value={`${entity.confidence}%`}
        />
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
          {(entity.tags ?? []).map(tag => (
            <span
              key={tag}
              style={{
                background: "#2563EB",
                color: "white",
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 12,
              }}
            >
              {tag}
            </span>
          ))}
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

          <p>
            {entity.description ?? "No description"}
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
        background: "rgba(37,99,235,.08)",
        padding: 12,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: .7,
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
        {value}
      </div>
    </div>
  );
}