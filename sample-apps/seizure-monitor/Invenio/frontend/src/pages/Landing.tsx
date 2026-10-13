/**
 * Landing — Public-Facing Entry Page
 *
 * Phase 1: Professional development shell.
 *
 * Purpose:
 * - Entry point for unauthenticated users
 * - Communicates Invenio's mission and value proposition
 * - Directs users to the application (once auth is implemented in Phase 3)
 *
 * Future:
 * - Real authentication flow (Supabase Auth in Phase 3)
 * - Pricing tiers
 * - Feature demos and screenshots
 * - Blog / research announcements
 * - SEO optimization
 */

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Brain,
  FlaskConical,
  Network,
  Database,
  GitBranch,
  Cpu,
  ArrowRight,
  Sparkles,
  BookOpenCheck,
  Atom,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME, APP_TAGLINE } from '@/constants'

/* ─── Animation Variants ───────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
}

/* ─── Feature Item ─────────────────────────────── */
interface FeatureItemProps {
  icon: React.ElementType
  title: string
  description: string
}

function FeatureItem({ icon: Icon, title, description }: FeatureItemProps) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'group p-6 rounded-2xl border border-border bg-card',
        'hover:border-primary/30 hover:bg-card/80 transition-all duration-300'
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  )
}

/* ─── Connection Type ──────────────────────────── */
function ConnectionBadge({ label }: { label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
      'bg-muted/60 text-muted-foreground border border-border',
      'hover:border-primary/30 hover:text-foreground transition-all duration-200'
    )}>
      {label}
    </span>
  )
}

/* ─── Landing Page ─────────────────────────────── */
export function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── Top Navigation ─────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 border-b border-border glass">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-foreground">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            id="landing-enter-app"
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-[hsl(var(--primary-hover))] transition-colors duration-150'
            )}
          >
            Enter App
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center pt-32 pb-20 px-6 md:px-12 overflow-hidden">

        {/* Background dot grid */}
        <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />

        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-[hsl(199,89%,48%)]/5 blur-3xl pointer-events-none" />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 max-w-4xl mx-auto space-y-8"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="flex justify-center">
            <span className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
              'border border-primary/30 bg-primary/10 text-primary'
            )}>
              <Sparkles className="w-3 h-3" />
              Phase 1 — Architecture Foundation
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div variants={fadeUp} className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              <span className="text-foreground">The Research</span>
              <br />
              <span className="text-gradient">{APP_TAGLINE}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Invenio connects scientific papers, datasets, repositories, patents, and natural
              phenomena to uncover research opportunities that traditional search cannot.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-4">
            <Link
              to="/workflow?demo=true"
              id="landing-cta-demo"
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold',
                'bg-primary text-primary-foreground',
                'hover:bg-[hsl(var(--primary-hover))] transition-all duration-200',
                'shadow-[0_0_20px_rgba(var(--primary),0.5)] hover:shadow-[0_0_30px_rgba(var(--primary),0.8)]'
              )}
            >
              <Sparkles className="w-4 h-4" />
              Run Demo Pipeline
            </Link>
            <Link
              to="/dashboard"
              id="landing-cta-primary"
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium',
                'border border-border text-muted-foreground',
                'hover:border-primary/30 hover:text-foreground transition-all duration-200'
              )}
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com"
              id="landing-cta-github"
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium',
                'border border-border text-muted-foreground',
                'hover:border-primary/30 hover:text-foreground transition-all duration-200'
              )}
            >
              <GitBranch className="w-4 h-4" />
              View on GitHub
            </a>
          </motion.div>

          {/* Connection types */}
          <motion.div variants={fadeUp} className="space-y-3">
            <p className="text-xs text-muted-foreground">Connecting across</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'Scientific Papers', 'Datasets', 'Repositories', 'Patents',
                'Biological Phenomena', 'Mathematical Concepts', 'Algorithms', 'Engineering Techniques',
              ].map((label) => (
                <ConnectionBadge key={label} label={label} />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features Grid ──────────────────────────── */}
      <section className="px-6 md:px-12 py-20 max-w-6xl mx-auto">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="space-y-10"
        >
          <motion.div variants={fadeUp} className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Built for Discovery</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every module is designed to surface connections that humans miss and systems can't see.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureItem
              icon={FlaskConical}
              title="Research Intelligence"
              description="Semantic search across OpenAlex, Semantic Scholar, ArXiv, and PubMed. AI-assisted query expansion."
            />
            <FeatureItem
              icon={Network}
              title="Knowledge Graph"
              description="Neo4j-powered relationship graph connecting all entities across domains. Discover hidden links."
            />
            <FeatureItem
              icon={Database}
              title="Dataset Discovery"
              description="Index and browse datasets from Kaggle, HuggingFace, Zenodo, and 20+ sources."
            />
            <FeatureItem
              icon={GitBranch}
              title="Repository Linking"
              description="Connect code implementations directly to the papers and datasets they implement or use."
            />
            <FeatureItem
              icon={BookOpenCheck}
              title="Evidence Chains"
              description="Structured, scored evidence chains extracted by AI from research entities."
            />
            <FeatureItem
              icon={Cpu}
              title="Nitro Orchestration"
              description="9 specialized AI agents working in concert via MCP. Planner coordinates, agents execute."
            />
          </div>
        </motion.div>
      </section>

      {/* ── Architecture Preview ────────────────────── */}
      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="space-y-6"
        >
          <motion.div variants={fadeUp} className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Architecture First</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Invenio is built for teams. Every module is independently deployable and independently testable.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="p-6 rounded-2xl border border-border bg-card font-mono text-xs text-muted-foreground space-y-1 overflow-x-auto"
          >
            {[
              'invenio/',
              '  frontend/     ← React + Vite + TypeScript + Tailwind + shadcn',
              '  backend/      ← FastAPI + Pydantic + SQLAlchemy',
              '  nitro/        ← NitroStack MCP agent workspace',
              '  shared/       ← Cross-workspace types and constants',
              '  docs/         ← Architecture, phases, standards',
              '  scripts/      ← Dev environment bootstrap',
              '  tests/        ← Pytest + Vitest integration suites',
              '  .github/      ← CI/CD workflows',
            ].map((line) => (
              <div key={line}>
                <span className={line.startsWith('  ') ? 'text-foreground/60' : 'text-foreground font-semibold'}>
                  {line}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-border px-6 md:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Atom className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">
              {APP_NAME} — {APP_TAGLINE}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Phase 1 — Architecture Foundation — v0.1.0
          </div>
        </div>
      </footer>
    </div>
  )
}
