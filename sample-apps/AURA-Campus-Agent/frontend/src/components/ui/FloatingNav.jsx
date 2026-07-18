/**
 * FloatingNav — Adapted for React + Vite (no Next.js, no Tailwind, no TypeScript)
 * Original design: Aceternity UI  |  Adapted: Neon Dark theme for AURA
 *
 * Adaptations made from the original Next.js version:
 * - Removed "use client" directive (not needed in Vite/React)
 * - Replaced `next/link` with plain <a> tags + onClick navigation
 * - Removed TypeScript types and JSX.Element annotations
 * - Replaced all Tailwind classes with inline styles matching AURA neon theme
 * - Replaced `cn` from @/lib/utils with a simple className joiner
 * - Styled to match the existing dark neon glassmorphic design system
 */

import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";

/**
 * FloatingNav Component
 *
 * Props:
 *   navItems  — array of { name, icon, onClick } objects
 *   className — optional extra className string
 *
 * Behaviour:
 *   - Hidden at top of page (scrollY < 5%)
 *   - Appears when user scrolls UP past 5%
 *   - Hides when scrolling DOWN
 */
export function FloatingNav({ navItems = [], className = "", onLoginClick }) {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - scrollYProgress.getPrevious();

      if (scrollYProgress.get() < 0.05) {
        // Near top — always hide
        setVisible(false);
      } else {
        // Show on scroll-up, hide on scroll-down
        setVisible(direction < 0);
      }
    }
  });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 1, y: -100 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={styles.floatingBar}
        className={className}
      >
        {/* Nav links */}
        {navItems.map((item, idx) => (
          <button
            key={idx}
            onClick={item.onClick}
            style={styles.navLink}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#00f0ff';
              e.currentTarget.style.textShadow = '0 0 10px rgba(0,240,255,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
              e.currentTarget.style.textShadow = 'none';
            }}
          >
            {item.icon && <span style={styles.iconWrap}>{item.icon}</span>}
            <span style={styles.linkText}>{item.name}</span>
          </button>
        ))}

        {/* Action button */}
        <button
          style={styles.loginBtn}
          onClick={onLoginClick}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.2)';
            e.currentTarget.style.borderColor = 'rgba(0,240,255,0.7)';
            e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 0 10px rgba(0,240,255,0.2)';
            e.currentTarget.style.borderColor = 'rgba(0,240,255,0.35)';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
          }}
        >
          <span style={styles.loginText}>AURA</span>
          {/* Neon bottom highlight line */}
          <span style={styles.loginLine} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

const styles = {
  floatingBar: {
    position: "fixed",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9000,
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 8px 6px 18px",
    borderRadius: "9999px",
    background: "rgba(2, 3, 12, 0.82)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(0, 240, 255, 0.18)",
    boxShadow:
      "0 8px 32px rgba(0,0,0,0.6), 0 0 24px rgba(0,240,255,0.07), inset 0 1px 0 rgba(255,255,255,0.05)",
    whiteSpace: "nowrap",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "9999px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "rgba(255,255,255,0.55)",
    fontSize: "0.82rem",
    fontWeight: "600",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "0.2px",
    transition: "color 0.2s, text-shadow 0.2s",
  },
  iconWrap: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  linkText: {
    // hidden on very small screens via CSS — inline styles can't do media queries
    // but we display it always here since the app is desktop-focused
  },
  loginBtn: {
    position: "relative",
    padding: "6px 16px",
    borderRadius: "9999px",
    border: "1px solid rgba(0,240,255,0.35)",
    background: "rgba(0,240,255,0.08)",
    color: "#00f0ff",
    fontSize: "0.78rem",
    fontWeight: "800",
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: "1px",
    cursor: "pointer",
    boxShadow: "0 0 10px rgba(0,240,255,0.2)",
    textShadow: "0 0 8px rgba(0,240,255,0.5)",
    transition: "all 0.25s cubic-bezier(0.175,0.885,0.32,1.275)",
  },
  loginText: { position: "relative", zIndex: 1 },
  loginLine: {
    position: "absolute",
    bottom: "-1px",
    left: "25%",
    right: "25%",
    height: "1px",
    background:
      "linear-gradient(90deg, transparent, #00f0ff, rgba(191,0,255,0.8), transparent)",
  },
};

export default FloatingNav;
