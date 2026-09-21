'use client';

interface EventCardProps {
  severity: string;
  message: string;
  time: string;
}

export default function EventCard({
  severity,
  message,
  time,
}: EventCardProps) {
  const color =
    severity === "HIGH"
      ? "#dc2626"
      : severity === "MEDIUM"
      ? "#d97706"
      : "#2563eb";

  return (
    <div
      style={{
        borderLeft: `6px solid ${color}`,
        background: "#ffffff",
        padding: 18,
        marginBottom: 15,
        borderRadius: 10,
      }}
    >
      <strong
        style={{
          color,
        }}
      >
        {severity}
      </strong>

      <p>{message}</p>

      <small>{time}</small>
    </div>
  );
}