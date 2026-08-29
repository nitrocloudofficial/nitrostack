'use client';

import {
  FaShieldAlt,
  FaCircle,
  FaBuilding,
  FaClock,
} from "react-icons/fa";

export default function Header() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg,#111827,#1F2937)",
        borderRadius: 18,
        padding: 30,
        border: "1px solid #374151",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <FaShieldAlt
            size={38}
            color="#3B82F6"
          />

          <div>
            <h1
              style={{
                margin: 0,
                color: "white",
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              AgentSentinel
            </h1>

            <p
              style={{
                color: "#9CA3AF",
                marginTop: 8,
              }}
            >
              Enterprise AI Security Operations Center
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 40,
        }}
      >
        <div>
          <div
            style={{
              color: "#6B7280",
              fontSize: 13,
            }}
          >
            Organization
          </div>

          <div
            style={{
              color: "white",
              marginTop: 6,
            }}
          >
            <FaBuilding /> NitroStack Enterprise
          </div>
        </div>

        <div>
          <div
            style={{
              color: "#6B7280",
              fontSize: 13,
            }}
          >
            Last Scan
          </div>

          <div
            style={{
              color: "white",
              marginTop: 6,
            }}
          >
            <FaClock /> 2 min ago
          </div>
        </div>

        <div>
          <div
            style={{
              color: "#6B7280",
              fontSize: 13,
            }}
          >
            Status
          </div>

          <div
            style={{
              color: "#10B981",
              marginTop: 6,
              fontWeight: 700,
            }}
          >
            <FaCircle
              size={10}
              style={{
                marginRight: 8,
              }}
            />
            LIVE
          </div>
        </div>
      </div>
    </div>
  );
}