import { CSSProperties } from "react";

export const colors = {
  background: "#050505", // Pure premium black
  surface: "rgba(15, 15, 15, 0.75)", // Dark obsidian surface
  surfaceLight: "rgba(255, 255, 255, 0.03)",
  border: "rgba(255, 255, 255, 0.08)", // Subtle premium border

  text: "#F8FAFC",
  secondary: "#8E9CAE", // Slightly brighter slate for readability

  blue: "#3B82F6",
  green: "#10B981", // Vibrant emerald green
  orange: "#F59E0B",
  purple: "#8B5CF6",
  cyan: "#06B6D4",
};

export const pageBackground: CSSProperties = {
  background: `
    radial-gradient(circle at 15% 0%, rgba(59, 130, 246, 0.15), transparent 25%),
    radial-gradient(circle at 85% 10%, rgba(139, 92, 246, 0.12), transparent 30%),
    radial-gradient(circle at 50% 100%, rgba(6, 182, 212, 0.08), transparent 35%),
    ${colors.background}
  `,
};

export const glassCard: CSSProperties = {
  background: colors.surface,
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: `1px solid ${colors.border}`,
  borderRadius: 24,
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
};

export const sectionTitle: CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  margin: 0,
  letterSpacing: "-0.02em",
};

export const cardTitle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: colors.secondary,
  textTransform: "uppercase",
  letterSpacing: ".1em",
};

export const valueText: CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
};

export const badge: CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  background: "linear-gradient(135deg, #3B82F6, #2563EB)",
  color: "white",
  fontWeight: 700,
  boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
};
