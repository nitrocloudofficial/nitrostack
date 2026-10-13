/**
 * App — Root Application with Routing
 *
 * Phase 1: Defines all routes and the application shell.
 *
 * Route Structure:
 * - / → Landing (public, no auth required in Phase 1)
 * - /dashboard → Dashboard (inside WorkspaceLayout)
 * - /research → Research
 * - /knowledge-graph → Knowledge Graph
 * - /evidence → Evidence
 * - /datasets → Datasets
 * - /repositories → Repositories
 * - /reports → Reports
 * - /settings → Settings
 *
 * Future (Phase 3):
 * - Add ProtectedRoute wrapper for auth
 * - Add /auth/login and /auth/callback routes
 * - Add /workspace/:id for multi-workspace support
 * - Lazy-load page components for code splitting
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { Loader2 } from 'lucide-react'

// Lazy load pages for performance
const Landing = lazy(() => import('@/pages/Landing').then(m => ({ default: m.Landing })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Workflow = lazy(() => import('@/pages/Workflow').then(m => ({ default: m.Workflow })))
const Research = lazy(() => import('@/pages/PaperView').then(m => ({ default: m.PaperView })))
const KnowledgeGraph = lazy(() => import('@/pages/KnowledgeGraph').then(m => ({ default: m.KnowledgeGraph })))
const Evidence = lazy(() => import('@/pages/EvidenceView').then(m => ({ default: m.EvidenceView })))
const Datasets = lazy(() => import('@/pages/Datasets').then(m => ({ default: m.Datasets })))
const Repositories = lazy(() => import('@/pages/Repositories').then(m => ({ default: m.Repositories })))
const Workspace = lazy(() => import('@/pages/Workspace').then(m => ({ default: m.Workspace })))
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))
const PlaceholderPage = lazy(() => import('@/pages/PlaceholderPage').then(m => ({ default: m.PlaceholderPage })))
const Authors = lazy(() => import('@/pages/AuthorsView').then(m => ({ default: m.AuthorsView })))
const Contradictions = lazy(() => import('@/pages/ContradictionsView').then(m => ({ default: m.ContradictionsView })))
const Hypotheses = lazy(() => import('@/pages/HypothesesView').then(m => ({ default: m.HypothesesView })))

function SuspenseFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          {/* ── Public Routes ──────────────────────────── */}
          <Route path="/" element={<Landing />} />

        {/* ── Workspace Routes (inside shell) ──────── */}
        <Route element={<WorkspaceLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/research" element={<Research />} />
          <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/repositories" element={<Repositories />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/contradictions" element={<Contradictions />} />
          <Route path="/hypotheses" element={<Hypotheses />} />
        </Route>

        {/* ── Fallback ───────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
