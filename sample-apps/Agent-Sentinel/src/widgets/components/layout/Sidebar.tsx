'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  FaShieldAlt,
  FaChartLine,
  FaRobot,
  FaSearch,
  FaLock,
  FaPlug,
  FaFileAlt,
  FaCog,
} from "react-icons/fa";

const menu = [
  {
    name: "Dashboard",
    href: "/",
    icon: <FaChartLine />,
  },
  {
    name: "AI Agents",
    href: "/agents",
    icon: <FaRobot />,
  },
  {
    name: "Discovery",
    href: "/discovery",
    icon: <FaSearch />,
  },
  {
    name: "Security",
    href: "/security",
    icon: <FaLock />,
  },
  {
    name: "Connectors",
    href: "/connectors",
    icon: <FaPlug />,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: <FaFileAlt />,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: <FaCog />,
  },
];

export default function Sidebar() {

  const pathname = usePathname();

  return (

    <aside
      style={{
        width: 260,
        background: "#0F172A",
        minHeight: "100vh",
        borderRight: "1px solid #1F2937",
        padding: 25,
      }}
    >

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 40,
        }}
      >
        <FaShieldAlt
          color="#3B82F6"
          size={30}
        />

        <div>

          <div
            style={{
              color: "white",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            AgentSentinel
          </div>

          <div
            style={{
              color: "#9CA3AF",
              fontSize: 13,
            }}
          >
            Enterprise AI SOC
          </div>

        </div>

      </div>

      {menu.map((item) => {

        const active = pathname === item.href;

        return (

          <Link
            key={item.name}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              textDecoration: "none",
              color: active ? "white" : "#9CA3AF",
              background: active ? "#2563EB" : "transparent",
              padding: "14px 18px",
              borderRadius: 12,
              marginBottom: 10,
              transition: ".25s",
            }}
          >
            {item.icon}

            {item.name}

          </Link>

        );

      })}

    </aside>

  );

}