"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Recycle, LayoutDashboard, ExternalLink } from "lucide-react";

export default function Navbar() {
  const path = usePathname();

  const linkClass = (href: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      path === href
        ? "bg-emerald-500/15 text-emerald-400"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
    }`;

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Recycle className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Symb<span className="text-emerald-400">io</span>Forge
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/" className={linkClass("/")}>Home</Link>
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            <span className="flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </span>
          </Link>
          <a
            href="https://github.com/kuchipudiyokshith9999-eng/SymBioForge"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>
    </nav>
  );
}
