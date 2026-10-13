'use client';

import { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface Investigation {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  visibility?: string;
  tags?: string[];
  createdAt: string;
}

export default function InvestigationCard() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const [expanded, setExpanded] = useState(false);

  const output = getToolOutput<any>();

  console.log("Tool Output:", output);

  const inv: Investigation | undefined =
    output?.investigation ??
    output?.data?.investigation ??
    output;

  if (!inv) {
    return (
      <div
        style={{
          padding: 24,
          color: theme === "dark" ? "#fff" : "#000",
        }}
      >
        No investigation data received.
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
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
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
              color: "#60a5fa",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            🕵️ Investigation
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 22,
            }}
          >
            {inv.title || "Untitled Investigation"}
          </h2>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            border: "none",
            cursor: "pointer",
            padding: "8px 14px",
            borderRadius: 8,
            background: "#2563eb",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {/* Info Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 20,
        }}
      >
        <Info label="Status" value={inv.status || "Unknown"} />
        <Info label="Priority" value={inv.priority || "Medium"} />
        <Info label="Visibility" value={inv.visibility || "Private"} />
        <Info
          label="Created"
          value={
            inv.createdAt
              ? new Date(inv.createdAt).toLocaleDateString()
              : "-"
          }
        />
      </div>

      {/* Tags */}
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Tags
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {inv.tags && inv.tags.length > 0 ? (
            inv.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: "#2563eb",
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
              No tags
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {expanded && (
        <div
          style={{
            marginTop: 24,
            borderTop: dark
              ? "1px solid #374151"
              : "1px solid #e5e7eb",
            paddingTop: 20,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            Description
          </div>

          <p
            style={{
              margin: 0,
              lineHeight: 1.7,
            }}
          >
            {inv.description || "No description available."}
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
        padding: 14,
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
          fontSize: 15,
        }}
      >
        {value}
      </div>
    </div>
  );
}