'use client';

import {
  FaExclamationTriangle,
  FaShieldAlt,
  FaBug,
  FaGithub,
  FaDiscord,
  FaGoogle,
  FaClock,
} from "react-icons/fa";

const alerts = [
  {
    severity: "CRITICAL",
    title: "Prompt Injection Attempt",
    source: "GitHub",
    agent: "Finance Agent",
    time: "2 min ago",
    icon: <FaGithub />,
    color: "#EF4444",
  },
  {
    severity: "HIGH",
    title: "Suspicious Gmail Attachment",
    source: "Gmail",
    agent: "HR Agent",
    time: "5 min ago",
    icon: <FaGoogle />,
    color: "#F59E0B",
  },
  {
    severity: "MEDIUM",
    title: "Discord Bot Token Exposure",
    source: "Discord",
    agent: "Support Agent",
    time: "12 min ago",
    icon: <FaDiscord />,
    color: "#3B82F6",
  },
  {
    severity: "LOW",
    title: "Policy Auto Remediation",
    source: "Security Engine",
    agent: "Security Agent",
    time: "20 min ago",
    icon: <FaShieldAlt />,
    color: "#10B981",
  },
];

export default function NotificationPanel() {
  return (
    <div
      style={{
        background: "#111827",
        borderRadius: 16,
        padding: 24,
        marginTop: 30,
        border: "1px solid #1F2937",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          🚨 Live Threat Monitoring
        </h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#10B981",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#10B981",
              display: "inline-block",
            }}
          />
          LIVE
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {alerts.map((alert, index) => (
          <div
            key={index}
            style={{
              background: "#1F2937",
              borderLeft: `5px solid ${alert.color}`,
              borderRadius: 12,
              padding: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  color: alert.color,
                }}
              >
                {alert.icon}
              </div>

              <div>
                <div
                  style={{
                    color: "white",
                    fontWeight: 700,
                    fontSize: 17,
                  }}
                >
                  {alert.title}
                </div>

                <div
                  style={{
                    color: "#9CA3AF",
                    marginTop: 5,
                  }}
                >
                  Source: {alert.source}
                </div>

                <div
                  style={{
                    color: "#9CA3AF",
                  }}
                >
                  Agent: {alert.agent}
                </div>
              </div>
            </div>

            <div
              style={{
                textAlign: "right",
              }}
            >
              <div
                style={{
                  color: alert.color,
                  fontWeight: 700,
                }}
              >
                {alert.severity}
              </div>

              <div
                style={{
                  color: "#9CA3AF",
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                <FaClock />
                {alert.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}