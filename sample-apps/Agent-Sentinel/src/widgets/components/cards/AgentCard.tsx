'use client';

interface AgentCardProps {
  name: string;
  status: string;
  risk: string;
}

export default function AgentCard({
  name,
  status,
  risk,
}: AgentCardProps) {
  const riskColor =
    risk === "High"
      ? "#dc2626"
      : risk === "Medium"
      ? "#d97706"
      : "#16a34a";

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        padding: 18,
        marginBottom: 15,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <h3>{name}</h3>

      <p>
        Status:
        <strong> {status}</strong>
      </p>

      <p
        style={{
          color: riskColor,
          fontWeight: "bold",
        }}
      >
        Risk: {risk}
      </p>
    </div>
  );
}