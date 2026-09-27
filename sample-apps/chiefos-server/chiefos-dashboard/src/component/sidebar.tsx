import {
  LayoutDashboard,
  Bot,
  Inbox,
  CalendarDays,
  CheckSquare,
  Settings,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const links = [
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Chief AI",
    path: "/chief",
    icon: Bot,
  },
  {
    title: "Inbox",
    path: "/inbox",
    icon: Inbox,
  },
  {
    title: "Calendar",
    path: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Tasks",
    path: "/tasks",
    icon: CheckSquare,
  },
];

export default function Sidebar() {
  return (
    <aside className="w-72 min-h-screen bg-slate-950 border-r border-slate-800">

      <div className="p-8">

        <h1 className="text-3xl font-bold text-cyan-400">
          ChiefOS
        </h1>

        <p className="text-slate-500 mt-2">
          AI Command Center
        </p>

      </div>

      <nav className="px-5 space-y-3">

        {links.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.title}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-4 p-4 rounded-xl transition ${
                  isActive
                    ? "bg-cyan-500 text-white"
                    : "hover:bg-slate-800 text-slate-300"
                }`
              }
            >
              <Icon size={22} />

              {item.title}
            </NavLink>
          );
        })}

      </nav>

      <div className="absolute bottom-8 left-5 right-5">

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">

          <div className="flex items-center gap-3">

            <Settings />

            <div>

              <h3 className="font-semibold">
                Settings
              </h3>

              <p className="text-sm text-slate-400">
                AI Preferences
              </p>

            </div>

          </div>

        </div>

      </div>

    </aside>
  );
}