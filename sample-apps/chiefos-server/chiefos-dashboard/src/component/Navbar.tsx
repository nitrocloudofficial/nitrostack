import {
  Bell,
  Search,
  UserCircle,
} from "lucide-react";

export default function Navbar() {
  return (
    <header className="flex justify-between items-center bg-slate-800 rounded-xl p-5 shadow-md">
      <div>
        <h1 className="text-3xl font-bold text-white">
          AI Chief of Staff
        </h1>

        <p className="text-slate-400 mt-1">
          Multi-Agent Executive Dashboard
        </p>
      </div>

      <div className="flex items-center gap-5">

        <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
          <Search className="text-slate-400" size={18} />
          <input
            placeholder="Search..."
            className="bg-transparent outline-none ml-2 text-white placeholder:text-slate-400"
          />
        </div>

        <button className="relative">
          <Bell className="text-white" size={22} />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"></span>
        </button>

        <div className="flex items-center gap-2">
          <UserCircle size={36} className="text-cyan-400" />

          <div>
            <p className="text-white font-semibold">
              Admin
            </p>

            <p className="text-slate-400 text-sm">
              ChiefOS
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}
