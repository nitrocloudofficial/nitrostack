'use client';

export default function EnterpriseOverview() {

  const stats = [

    {
      title: "Protected Assets",
      value: "126",
      color: "#3B82F6",
    },

    {
      title: "AI Agents",
      value: "18",
      color: "#8B5CF6",
    },

    {
      title: "Connected Platforms",
      value: "4",
      color: "#10B981",
    },

    {
      title: "Threats Blocked",
      value: "241",
      color: "#EF4444",
    },

  ];

  return (

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 18,
        marginTop: 25,
      }}
    >

      {stats.map((item) => (

        <div
          key={item.title}
          style={{
            background: "#111827",
            border: `1px solid ${item.color}`,
            borderRadius: 16,
            padding: 24,
          }}
        >

          <div
            style={{
              color: "#9CA3AF",
            }}
          >
            {item.title}
          </div>

          <div
            style={{
              color: item.color,
              fontSize: 34,
              fontWeight: 700,
              marginTop: 10,
            }}
          >
            {item.value}
          </div>

        </div>

      ))}

    </div>

  );

}