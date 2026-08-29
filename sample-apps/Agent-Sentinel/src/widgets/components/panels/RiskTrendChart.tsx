'use client';

export default function RiskTrendChart() {

  const values = [42, 55, 38, 62, 48, 72, 58, 81];

  return (
    <div
      style={{
        background: "#111827",
        borderRadius: 16,
        padding: 24,
        border: "1px solid #1F2937",
      }}
    >
      <h2
        style={{
          color: "white",
          marginBottom: 24,
        }}
      >
        📈 Enterprise Risk Trend
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: 220,
        }}
      >
        {values.map((v, i) => (
          <div
            key={i}
            style={{
              width: 36,
              height: `${v * 2}px`,
              background:
                "linear-gradient(to top,#3B82F6,#06B6D4)",
              borderRadius: 8,
              transition: ".3s",
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 15,
          color: "#9CA3AF",
          fontSize: 12,
        }}
      >
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
        <span>Today</span>
      </div>
    </div>
  );
}