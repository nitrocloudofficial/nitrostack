"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import ThemeToggle from "@/components/layout/ThemeToggle";

interface Health {
  online: boolean;
  monitoringActive: boolean;
  packetRate: number;
}

export default function Navbar() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const load = () => {
      api
        .get("/health")
        .then((res) => setHealth(res.data))
        .catch(() => setHealth(null));
    };

    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const online = health?.online ?? false;

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur sm:px-8">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold text-foreground sm:text-xl">
          GuardianSense Dashboard
        </h2>
        <p className="hidden text-sm text-muted-foreground sm:block">
          Real-Time Contactless Health Monitoring
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span
          role="status"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${
            online
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              online ? "bg-success" : "bg-destructive"
            }`}
          />
          {online ? "Backend Online" : "Backend Offline"}
        </span>

        <ThemeToggle />
      </div>
    </header>
  );
}
