'use client';

import { useState } from "react";
import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

interface Relationship {
  id: string;

  investigationId: string;

  sourceEntityId: string;

  targetEntityId: string;

  relationship: string;

  confidence: number;

  description?: string;
}

export default function RelationshipCard() {

  const theme = useTheme();

  const { getToolOutput } = useWidgetSDK();

  const [expanded, setExpanded] = useState(false);

  const output = getToolOutput<any>();
  console.log("=================================");
console.log(output);
console.log(JSON.stringify(output, null, 2));
console.log("=================================");

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
        <h3>Tool Error</h3>

        <pre>{JSON.stringify(output.content, null, 2)}</pre>
      </div>
    );
  }

  const relationship: Relationship =
    output?.relationship ??
    output?.data?.relationship ??
    output;

  if (!relationship) {
    return (
      <div style={{ padding: 20 }}>
        No Relationship Found
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
              color: "#60A5FA",
              fontSize: 13,
            }}
          >
            🔗 Relationship
          </div>

          <h2
            style={{
              margin: 0,
            }}
          >
            {relationship.relationship}
          </h2>

        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "#2563EB",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          {expanded ? "Hide" : "Details"}
        </button>

      </div>

      {/* Source */}

      <div
        style={{
          marginTop: 25,
          textAlign: "center",
        }}
      >

        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: "#2563EB",
            color: "white",
            wordBreak: "break-all",
          }}
        >
          {relationship.sourceEntityId}
        </div>

        <div
          style={{
            margin: "12px 0",
            fontSize: 26,
          }}
        >
          ↓
        </div>

        <div
          style={{
            color: "#60A5FA",
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          {relationship.relationship}
        </div>

        <div
          style={{
            fontSize: 26,
          }}
        >
          ↓
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 10,
            background: "#10B981",
            color: "white",
            wordBreak: "break-all",
          }}
        >
          {relationship.targetEntityId}
        </div>

      </div>

      {/* Confidence */}

      <div
        style={{
          marginTop: 25,
        }}
      >

        <Info
          label="Confidence"
          value={`${relationship.confidence}%`}
        />

      </div>

      {/* Description */}

      {expanded && (

        <div
          style={{
            marginTop: 25,
            borderTop: "1px solid rgba(255,255,255,.15)",
            paddingTop: 20,
          }}
        >

          <strong>Description</strong>

          <p>
            {relationship.description || "No description"}
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
        borderRadius: 10,
        padding: 12,
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