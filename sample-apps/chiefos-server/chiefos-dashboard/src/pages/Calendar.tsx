import {
  CalendarDays,
  Clock3,
  Users,
  Video,
  Sparkles,
  Bell
} from "lucide-react";

const meetings = [
  {
    time: "09:00 AM",
    title: "Leadership Standup",
    attendees: 8,
    mode: "Google Meet",
    ai: "Prepare meeting summary"
  },
  {
    time: "11:00 AM",
    title: "Product Roadmap",
    attendees: 12,
    mode: "Conference Room",
    ai: "Generate agenda"
  },
  {
    time: "02:00 PM",
    title: "Client Demo",
    attendees: 5,
    mode: "Zoom",
    ai: "Create follow-up email"
  },
  {
    time: "04:30 PM",
    title: "Engineering Sync",
    attendees: 14,
    mode: "Microsoft Teams",
    ai: "Capture action items"
  }
];

export default function Calendar() {
  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex justify-between items-center">

        <div>

          <h1 className="text-4xl font-bold flex items-center gap-3">
            <CalendarDays className="text-cyan-400" />
            Calendar
          </h1>

          <p className="text-slate-400 mt-2">
            AI-powered meeting planner
          </p>

        </div>

        <button className="bg-cyan-500 hover:bg-cyan-400 px-5 py-3 rounded-xl font-semibold transition">
          + Schedule Meeting
        </button>

      </div>

      {/* Stats */}

      <div className="grid md:grid-cols-3 gap-6">

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">

          <Clock3 className="text-cyan-400 mb-4" />

          <h2 className="text-3xl font-bold">4</h2>

          <p className="text-slate-400 mt-2">
            Meetings Today
          </p>

        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">

          <Users className="text-green-400 mb-4" />

          <h2 className="text-3xl font-bold">39</h2>

          <p className="text-slate-400 mt-2">
            Total Participants
          </p>

        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">

          <Bell className="text-yellow-400 mb-4" />

          <h2 className="text-3xl font-bold">2</h2>

          <p className="text-slate-400 mt-2">
            Upcoming Reminders
          </p>

        </div>

      </div>

      {/* Meeting Cards */}

      <div className="space-y-5">

        {meetings.map((meeting, index) => (

          <div
            key={index}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500 transition"
          >

            <div className="flex justify-between items-start">

              <div>

                <h2 className="text-2xl font-semibold">
                  {meeting.title}
                </h2>

                <div className="flex gap-6 mt-4 text-slate-300">

                  <div className="flex items-center gap-2">
                    <Clock3 size={18} />
                    {meeting.time}
                  </div>

                  <div className="flex items-center gap-2">
                    <Users size={18} />
                    {meeting.attendees} attendees
                  </div>

                  <div className="flex items-center gap-2">
                    <Video size={18} />
                    {meeting.mode}
                  </div>

                </div>

              </div>

              <button className="bg-cyan-500 hover:bg-cyan-400 px-5 py-2 rounded-xl flex items-center gap-2">

                <Sparkles size={18} />

                AI Suggestion

              </button>

            </div>

            <div className="mt-6 bg-slate-800 rounded-xl p-4">

              <p className="text-cyan-400 font-semibold">
                AI Recommendation
              </p>

              <p className="mt-2 text-slate-300">
                {meeting.ai}
              </p>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}