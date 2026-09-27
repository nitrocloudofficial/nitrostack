'use client';

import { FaRobot } from "react-icons/fa";

const agents = [
  { name: "Security Agent", health: 98, color: "#22C55E" },
  { name: "Finance Agent", health: 91, color: "#22C55E" },
  { name: "HR Agent", health: 84, color: "#F59E0B" },
  { name: "Support Agent", health: 72, color: "#EF4444" },
];

export default function AgentPanel() {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1F2937",
        borderRadius: 16,
        padding: 24,
      }}
    >
      <h2
        style={{
          color: "#F9FAFB",
          marginBottom: 25,
        }}
      >
        <FaRobot style={{ marginRight: 10 }} />
        AI Agent Health
      </h2>

      {agents.map((agent) => (
        <div key={agent.name} style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "#E5E7EB",
              marginBottom: 8,
            }}
          >
            <span>{agent.name}</span>
            <span>{agent.health}%</span>
          </div>

          <div
            style={{
              width: "100%",
              height: 10,
              background: "#374151",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                width: `${agent.health}%`,
                height: "100%",
                background: agent.color,
                borderRadius: 10,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}