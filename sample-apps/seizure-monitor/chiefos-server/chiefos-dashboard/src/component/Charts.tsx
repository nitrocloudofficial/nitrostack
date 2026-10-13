import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const data = [
  { day: "Mon", tasks: 12 },
  { day: "Tue", tasks: 18 },
  { day: "Wed", tasks: 10 },
  { day: "Thu", tasks: 22 },
  { day: "Fri", tasks: 16 },
  { day: "Sat", tasks: 24 },
  { day: "Sun", tasks: 20 },
];

export default function Charts() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <h2 className="text-xl font-bold mb-6">
        Weekly Activity
      </h2>

      <div className="w-full h-72">

        <ResponsiveContainer width="100%" height="100%">

          <LineChart data={data}>

            <CartesianGrid stroke="#334155" />

            <XAxis dataKey="day" stroke="#94a3b8" />

            <YAxis stroke="#94a3b8" />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="tasks"
              stroke="#06b6d4"
              strokeWidth={3}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}