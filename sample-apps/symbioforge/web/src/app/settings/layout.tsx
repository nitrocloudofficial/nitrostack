import { ReactNode } from "react"
import Link from "next/link"
import { User, Shield, Bell, Key, Network, Users, Palette } from "lucide-react"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const navItems = [
    { href: "/settings/profile", label: "Profile", icon: User },
    { href: "/settings/security", label: "Security", icon: Shield },
    { href: "/settings/notifications", label: "Notifications", icon: Bell },
    { href: "/settings/api-keys", label: "API Keys", icon: Key },
    { href: "/settings/integrations", label: "Integrations", icon: Network },
    { href: "/settings/team", label: "Team", icon: Users },
    { href: "/settings/appearance", label: "Appearance", icon: Palette },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-1 overflow-x-auto pb-4 md:pb-0 hide-scrollbar">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors shrink-0"
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        
        <div className="flex-1 max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  )
}
