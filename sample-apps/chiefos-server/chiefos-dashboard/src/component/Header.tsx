import { useEffect, useState } from "react";
import {
  Search,
  Bell,
  UserCircle2,
  Sparkles,
} from "lucide-react";

export default function Header() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    updateClock();

    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-950 border-b border-slate-800 px-8 py-5">

      <div className="flex justify-between items-center">

        <div className="relative">

          <Search
            size={18}
            className="absolute left-3 top-3 text-slate-400"
          />

          <input
            placeholder="Search..."
            className="w-96 bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none"
          />

        </div>

        <div className="flex items-center gap-5">

          <div className="text-cyan-400 font-semibold">
            {time}
          </div>

          <div className="flex items-center gap-2 text-green-400">
            <Sparkles size={18} />
            AI Online
          </div>

          <Bell />

          <div className="flex items-center gap-2">
            <UserCircle2 size={35} />
            <span>Kavya</span>
          </div>

        </div>

      </div>

    </header>
  );
}