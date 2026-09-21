import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
}

function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <div
      className="
      bg-slate-900
      border
      border-slate-800
      rounded-2xl
      p-5
      "
    >

      <div className="flex justify-between items-center">

        <p className="text-slate-400">
          {title}
        </p>

        <Icon 
          size={24} 
          className="text-sky-400"
        />

      </div>


      <h2
        className="
        text-3xl
        font-bold
        mt-4
        text-white
        "
      >
        {value}
      </h2>


    </div>
  );
}

export default StatCard;