/**
 * TopNav — Premium Sticky Header
 *
 * Premium glassmorphism top navigation with:
 * - Floating command palette search bar
 * - Animated Nitro status indicator
 * - Gradient avatar
 * - Smooth hover states
 */

import { useLocation } from 'react-router-dom'
import { Bell, Command, Search, Cpu, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, NAV_BOTTOM_ITEMS } from '@/constants'
import { motion } from 'framer-motion'

/* ─── Breadcrumb helpers ───────────────────────── */
function getPageInfo(pathname: string) {
  const allItems = [...NAV_ITEMS, ...NAV_BOTTOM_ITEMS]
  const match = allItems.find(
    (item) => pathname === item.path || pathname.startsWith(item.path + '/')
  )
  return match ?? { label: 'Invenio', description: 'AI Research Operating System' }
}

/* ─── Props ────────────────────────────────────── */
interface TopNavProps {
  actions?: React.ReactNode
  title?: string
}

/* ─── Component ────────────────────────────────── */
export function TopNav({ actions, title }: TopNavProps) {
  const location = useLocation()
  const pageInfo = getPageInfo(location.pathname)
  const displayTitle = title ?? pageInfo.label

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'flex items-center justify-between px-6 flex-shrink-0 z-50 sticky top-0'
      )}
      style={{
        height: '68px',
        background: 'rgba(8, 12, 20, 0.65)',
        backdropFilter: 'blur(40px) saturate(150%)',
        WebkitBackdropFilter: 'blur(40px) saturate(150%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1), inset 0 -1px 0 rgba(255, 255, 255, 0.05)',
      }}
      role="banner"
    >
      {/* ── Left: Page Title ───────────────────────── */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0 flex flex-col justify-center">
          <h1
            className="text-[15px] font-bold truncate tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {displayTitle}
          </h1>
          {'description' in pageInfo && (
            <p className="hidden sm:block text-[11px] font-medium text-slate-500/80 truncate leading-none mt-1 tracking-wider uppercase">
              {pageInfo.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: Actions ─────────────────────────── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Custom page actions */}
        {actions}

        {/* ── Floating Command Palette ──────────────── */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="topnav-command-palette"
          className={cn(
            'hidden sm:flex items-center gap-3 px-3.5 h-9 rounded-[14px] text-xs',
            'text-slate-400 cursor-default shadow-sm',
            'transition-all duration-300 group relative overflow-hidden'
          )}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
          aria-label="Open command palette"
          disabled
          title="Command palette — coming in Phase 2"
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(255, 255, 255, 0.06)'
            el.style.borderColor = 'rgba(99, 179, 237, 0.3)'
            el.style.color = '#e2e8f0'
            el.style.boxShadow = '0 0 20px rgba(99, 179, 237, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(255, 255, 255, 0.03)'
            el.style.borderColor = 'rgba(255, 255, 255, 0.08)'
            el.style.color = ''
            el.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="font-medium tracking-wide">Search Invenio...</span>
          <kbd
            className="hidden md:flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#94a3b8',
            }}
          >
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </motion.button>

        {/* ── Nitro Status ────────────────────────────*/}
        <div
          className="flex items-center gap-2 px-3 h-9 rounded-[14px] text-xs text-slate-300 font-semibold shadow-sm cursor-help relative overflow-hidden group"
          title="Nitro — AI orchestration layer (Phase 2)"
          id="topnav-nitro-status"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Zap className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 transition-colors relative z-10" />
          <span className="hidden sm:block relative z-10">Nitro Core</span>
          <div className="relative flex h-2 w-2 items-center justify-center ml-1 z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          </div>
        </div>

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* ── Notifications ───────────────────────────*/}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          id="topnav-notifications"
          className="flex items-center justify-center w-9 h-9 rounded-[14px] text-slate-400 transition-all duration-300 shadow-sm relative"
          aria-label="Notifications (coming in Phase 2)"
          disabled
          title="Notifications — coming in Phase 2"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(255, 255, 255, 0.08)'
            el.style.borderColor = 'rgba(255, 255, 255, 0.15)'
            el.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(255, 255, 255, 0.03)'
            el.style.borderColor = 'rgba(255, 255, 255, 0.08)'
            el.style.color = ''
          }}
        >
          <Bell className="w-4 h-4" />
          <div className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500 border border-[#080C14] shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
        </motion.button>

        {/* ── Avatar ──────────────────────────────────*/}
        <motion.div
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 0 2px rgba(255,255,255,0.1)' }}
          className="w-9 h-9 rounded-[14px] flex items-center justify-center text-[11px] font-extrabold text-white cursor-default select-none transition-all duration-300"
          title="User profile — coming in Phase 3 (Auth)"
          id="topnav-avatar"
          aria-label="User avatar placeholder"
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          IN
        </motion.div>
      </div>
    </motion.header>
  )
}

