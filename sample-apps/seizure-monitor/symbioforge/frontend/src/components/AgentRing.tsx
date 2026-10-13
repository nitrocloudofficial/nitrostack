"use client";
import { agents } from "@/lib/data";

export default function AgentRing() {
  const radius = 130;
  const cx = 170, cy = 170;

  return (
    <div className="flex flex-col items-center">
      <svg width="340" height="340" viewBox="0 0 340 340">
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={radius + 20} fill="none" stroke="#1e293b" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={radius - 20} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

        {/* Connection lines */}
        {agents.map((_, i) => {
          const next = (i + 1) % agents.length;
          const a1 = (i * 360) / agents.length - 90;
          const a2 = (next * 360) / agents.length - 90;
          const x1 = cx + radius * Math.cos((a1 * Math.PI) / 180);
          const y1 = cy + radius * Math.sin((a1 * Math.PI) / 180);
          const x2 = cx + radius * Math.cos((a2 * Math.PI) / 180);
          const y2 = cy + radius * Math.sin((a2 * Math.PI) / 180);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#1e293b" strokeWidth="1" strokeDasharray="6 3" />
          );
        })}

        {/* Agent nodes */}
        {agents.map((agent, i) => {
          const angle = (i * 360) / agents.length - 90;
          const x = cx + radius * Math.cos((angle * Math.PI) / 180);
          const y = cy + radius * Math.sin((angle * Math.PI) / 180);
          return (
            <g key={agent.name}>
              <circle cx={x} cy={y} r="28" fill="#111827" stroke={agent.color} strokeWidth="2.5" />
              <text x={x} y={y - 4} textAnchor="middle" fill={agent.color} fontSize="11" fontWeight="700">
                {agent.name.slice(0, 2)}
              </text>
              <text x={x} y={y + 10} textAnchor="middle" fill="#94a3b8" fontSize="7">
                {agent.name}
              </text>
            </g>
          );
        })}

        {/* Center */}
        <circle cx={cx} cy={cy} r="38" fill="#111827" stroke="#10b981" strokeWidth="2" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">CLUSTER</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#10b981" fontSize="16" fontWeight="800">11%</text>
      </svg>
    </div>
  );
}
