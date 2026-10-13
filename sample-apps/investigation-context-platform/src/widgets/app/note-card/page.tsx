'use client';

import { useState } from "react";
import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

interface Note {
  id: string;
  investigationId: string;
  title: string;
  content: string;
  author: string;
  type: string;
  createdAt: string;
}

export default function NoteCard() {

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

  const note: Note = {
    id:
      output?.note?.id ??
      output?.id ??
      "",

    investigationId:
      output?.note?.investigationId ??
      output?.investigationId ??
      "",

    title:
      output?.note?.title ??
      output?.title ??
      "Untitled Note",

    content:
      output?.note?.content ??
      output?.content ??
      "",

    author:
      output?.note?.author ??
      output?.author ??
      "Unknown",

    type:
      output?.note?.type ??
      output?.type ??
      "General",

    createdAt:
      output?.note?.createdAt ??
      output?.createdAt ??
      "",
  };
const dark = theme === "dark";
  return (
    <div
      style={{
        maxWidth: 560,
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
              color: "#60A5FA",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            📝 Investigation Note
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 22,
            }}
          >
            {note.title}
          </h2>

        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            border: "none",
            borderRadius: 8,
            background: "#2563EB",
            color: "white",
            padding: "8px 14px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {expanded ? "Hide" : "Details"}
        </button>

      </div>

      {/* Information Grid */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 22,
        }}
      >

        <Info
          label="Author"
          value={note.author}
        />

        <Info
          label="Type"
          value={note.type}
        />

        <Info
          label="Created"
          value={
            note.createdAt
              ? new Date(note.createdAt).toLocaleDateString()
              : "-"
          }
        />

        <Info
          label="Status"
          value="Saved"
        />

      </div>

      {/* Preview */}

      <div
        style={{
          marginTop: 24,
        }}
      >
        <strong>Preview</strong>

        <p
          style={{
            lineHeight: 1.7,
            marginTop: 10,
          }}
        >
          {note.content
            ? note.content.length > 120
              ? note.content.substring(0, 120) + "..."
              : note.content
            : "No note content available"}
        </p>
      </div>
          {/* Full Note */}

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
          <strong>Complete Note</strong>

          <p
            style={{
              marginTop: 12,
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}
          >
            {note.content || "No note content available."}
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
          fontSize: 15,
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

  