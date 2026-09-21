"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "guardiansense-theme";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((callback) => callback());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  document.documentElement.classList.toggle("dark", event.newValue === "dark");
  emit();
}

function getSnapshot(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): "light" | "dark" {
  return "dark";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(STORAGE_KEY, theme);
  emit();
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => applyTheme(theme === "dark" ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:text-primary"
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
