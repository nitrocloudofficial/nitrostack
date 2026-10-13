'use client';

import {
  FaBell,
  FaSearch,
  FaUserCircle,
} from "react-icons/fa";

export default function Topbar() {

  return (

    <div
      style={{
        height: 70,
        background: "#111827",
        borderBottom: "1px solid #1F2937",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 30px",
      }}
    >

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#1F2937",
          padding: "10px 18px",
          borderRadius: 12,
          width: 350,
        }}
      >

        <FaSearch color="#9CA3AF"/>

        <input

          placeholder="Search agents, connectors..."

          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "white",
            width: "100%",
          }}

        />

      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 25,
        }}
      >

        <FaBell
          color="white"
          size={20}
        />

        <FaUserCircle
          color="#3B82F6"
          size={34}
        />

      </div>

    </div>

  );

}