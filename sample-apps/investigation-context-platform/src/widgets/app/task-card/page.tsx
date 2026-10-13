'use client';

import { useState } from "react";
import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

interface Task {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string;
  dueDate?: string;
}

export default function TaskCard() {

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

  const task: Task = {

    id:
      output?.task?.id ??
      output?.id ??
      "",

    investigationId:
      output?.task?.investigationId ??
      output?.investigationId ??
      "",

    title:
      output?.task?.title ??
      output?.title ??
      "Untitled Task",

    description:
      output?.task?.description ??
      output?.description ??
      "",

    status:
      output?.task?.status ??
      output?.status ??
      "Pending",

    priority:
      output?.task?.priority ??
      output?.priority ??
      "Medium",

    assignedTo:
      output?.task?.assignedTo ??
      output?.assignedTo ??
      "Unassigned",

    dueDate:
      output?.task?.dueDate ??
      output?.dueDate ??
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
              marginBottom: 6,
            }}
          >
            ✅ Investigation Task
          </div>

          <h2
            style={{
              margin: 0,
            }}
          >
            {task.title}
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
          marginTop: 22,
        }}
      >

        <Info label="Status" value={task.status} />

        <Info label="Priority" value={task.priority} />

        <Info label="Assigned To" value={task.assignedTo} />

        <Info
          label="Due Date"
          value={
            task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : "Not Set"
          }
        />

      </div>

      <div
        style={{
          marginTop: 24,
        }}
      >
        <strong>Description</strong>

        <p
          style={{
            marginTop: 10,
            lineHeight: 1.7,
          }}
        >
          {task.description || "No description available."}
        </p>
      </div>
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

          <strong>Task Details</strong>

          <p
            style={{
              lineHeight: 1.8,
            }}
          >
            This investigation task is currently
            <strong> {task.status}</strong> and is
            assigned to <strong>{task.assignedTo}</strong>.
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