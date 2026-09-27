export default function ActivityFeed() {
  const activities = [
    "📧 Email summarized",
    "📅 Meeting scheduled",
    "✅ Task completed",
    "🤖 AI generated report",
    "📨 Approval requested",
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <h2 className="text-xl font-bold mb-5">
        Recent Activity
      </h2>

      <div className="space-y-3">

        {activities.map((item, index) => (
          <div
            key={index}
            className="bg-slate-800 rounded-xl p-3"
          >
            {item}
          </div>
        ))}

      </div>

    </div>
  );
}