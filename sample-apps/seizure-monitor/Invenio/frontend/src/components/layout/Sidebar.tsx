import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FlaskConical,
  Network,
  BookOpenCheck,
  Database,
  GitBranch,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Microscope,
  Users,
  AlertTriangle,
  Lightbulb,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, NAV_BOTTOM_ITEMS, APP_NAME } from '@/constants'

/* ─── Icon Map ─────────────────────────────────── */
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  FlaskConical,
  Network,
  BookOpenCheck,
  Database,
  GitBranch,
  FileText,
  Settings,
  Users,
  AlertTriangle,
  Lightbulb,
}

/* ─── Props ────────────────────────────────────── */
interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

/* ─── Component ────────────────────────────────── */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  const getNavStyles = (isActive: boolean) => {
    if (isActive) {
      return {
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 179, 237, 0.25)',
        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        transform: 'scale(1.02)',
      }
    }
    return {
      background: 'transparent',
      border: '1px solid transparent',
      boxShadow: 'none',
      transform: 'scale(1)',
    }
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 260 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative flex flex-col h-full overflow-hidden z-30 flex-shrink-0"
      style={{
        minWidth: collapsed ? 60 : 260,
        background: 'rgba(8, 12, 20, 0.88)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '4px 0 30px rgba(0, 0, 0, 0.4)',
      }}
      aria-label="Primary navigation"
    >
      {/* ── Ambient Top Orb ──────────────────────── */}
      <div
        className="absolute top-0 left-0 w-48 h-48 pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle at top left, rgba(99, 179, 237, 0.2) 0%, transparent 70%)',
        }}
      />

      {/* ── Logo ─────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{
          height: 'var(--topnav-height)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Logo mark */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center relative"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #8b5cf6 100%)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
          }}
        >
          <Microscope className="w-4 h-4 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <span
                className="font-semibold text-sm tracking-tight whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {APP_NAME}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main Nav ──────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar relative z-10">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon]
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')

          const navElement = (

            <NavLink
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3.5 px-3.5 py-2.5 rounded-[16px] text-sm transition-all duration-300 group relative overflow-hidden',
                isActive
                  ? 'font-bold text-white'
                  : 'font-medium text-slate-400 hover:text-slate-200'
              )}
              style={getNavStyles(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(255,255,255,0.02)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              {/* Active item left glow bar */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-[22px] rounded-r-full"
                  style={{
                    background: 'linear-gradient(180deg, #38bdf8, #818cf8)',
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.8)',
                  }}
                />
              )}

              {Icon && (
                <Icon
                  className={cn(
                    'flex-shrink-0 w-4 h-4 transition-colors duration-300 relative z-10',
                    isActive ? 'text-[#38bdf8] drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]' : 'text-slate-500 group-hover:text-slate-300 group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]'
                  )}
                />
              )}

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="truncate whitespace-nowrap relative z-10 tracking-wide"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          )

          return navElement
        })}
      </nav>

      {/* ── Divider ───────────────────────────────── */}
      <div className="mx-4 divider-glow" />

      {/* ── Bottom Nav ────────────────────────────── */}
      <div className="px-3 py-4 space-y-1">
        {NAV_BOTTOM_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon]
          const isActive = location.pathname === item.path

          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3.5 px-3.5 py-2.5 rounded-[16px] text-sm transition-all duration-300 group relative overflow-hidden',
                isActive
                  ? 'font-bold text-white'
                  : 'font-medium text-slate-400 hover:text-slate-200'
              )}
              style={getNavStyles(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(255,255,255,0.02)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              {/* Active item left glow bar */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-[22px] rounded-r-full"
                  style={{
                    background: 'linear-gradient(180deg, #38bdf8, #818cf8)',
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.8)',
                  }}
                />
              )}

              {Icon && (
                <Icon
                  className={cn(
                    'flex-shrink-0 w-4 h-4 transition-colors duration-300 relative z-10',
                    isActive ? 'text-[#38bdf8] drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]' : 'text-slate-500 group-hover:text-slate-300 group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]'
                  )}
                />
              )}
              
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="truncate whitespace-nowrap relative z-10 tracking-wide"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          )
        })}

        {/* ── Collapse Toggle ─────────────────────── */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-[16px] text-slate-500 hover:text-slate-200 transition-all duration-300 text-sm font-medium group relative overflow-hidden mt-2"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          id="sidebar-toggle"
          style={{ background: 'transparent', border: '1px solid transparent' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 group-hover:text-slate-300 transition-colors" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 group-hover:text-slate-300 transition-colors" />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-nowrap tracking-wide"
              >
                Collapse Sidebar
              </motion.span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  )
}

