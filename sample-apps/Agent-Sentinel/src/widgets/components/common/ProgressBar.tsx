'use client';

interface ProgressBarProps {
  value: number;
}

export default function ProgressBar({
  value,
}: ProgressBarProps) {
  return (
    <div>
      <div
        style={{
          width: "100%",
          background: "#ddd",
          borderRadius: 8,
          height: 18,
        }}
      >
        <div
          style={{
            width: `${value}%`,
            background: "#16a34a",
            height: "100%",
            borderRadius: 8,
          }}
        />
      </div>

      <p
        style={{
          marginTop: 10,
          fontWeight: "bold",
        }}
      >
        {value}% Secure
      </p>
    </div>
  );
}