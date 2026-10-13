'use client';

import {
  FaGithub,
  FaGoogle,
  FaDiscord,
  FaCalendarAlt,
} from "react-icons/fa";

const connectors = [
  { name: "Gmail", icon: <FaGoogle />, status: "Healthy", color: "#22C55E" },
  { name: "GitHub", icon: <FaGithub />, status: "Healthy", color: "#22C55E" },
  {
    name: "Calendar",
    icon: <FaCalendarAlt />,
    status: "Healthy",
    color: "#22C55E",
  },
  {
    name: "Discord",
    icon: <FaDiscord />,
    status: "Warning",
    color: "#F59E0B",
  },
];

export default function ConnectorPanel() {
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
        Enterprise Connectors
      </h2>

      {connectors.map((connector) => (
        <div
          key={connector.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px 0",
            borderBottom: "1px solid #1F2937",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 15,
              alignItems: "center",
              color: "#F9FAFB",
            }}
          >
            <span
              style={{
                fontSize: 22,
              }}
            >
              {connector.icon}
            </span>

            {connector.name}
          </div>

          <span
            style={{
              color: connector.color,
              fontWeight: "bold",
            }}
          >
            {connector.status}
          </span>
        </div>
      ))}
    </div>
  );
}