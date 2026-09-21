import { useState } from "react";
import { Bot, Sparkles, CheckCircle } from "lucide-react";

export default function Chief() {
  const [type, setType] = useState("Email");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<any>(null);

  function routeWork() {
    let agent = "";
    let confidence = "";
    let priority = "";
    let action = "";

    switch (type) {
      case "Email":
        agent = "Email Triage Agent";
        confidence = "99%";
        priority = "High";
        action = "Categorize and draft reply";
        break;

      case "Meeting":
        agent = "Calendar Agent";
        confidence = "97%";
        priority = "Medium";
        action = "Schedule meeting";
        break;

      case "Task":
        agent = "Task Manager";
        confidence = "98%";
        priority = "High";
        action = "Create and assign task";
        break;

      default:
        agent = "Approval Workflow";
        confidence = "95%";
        priority = "Critical";
        action = "Request approval";
    }

    setResult({
      agent,
      confidence,
      priority,
      action,
    });
  }

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
          <Bot className="text-cyan-400" />
          Chief AI
        </h1>

        <p className="text-slate-400 mt-2">
          Route work intelligently using AI agents.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">

        <div className="space-y-5">

          <div>

            <label className="block mb-2 font-semibold">
              Work Type
            </label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-800 rounded-xl p-3"
            >
              <option>Email</option>
              <option>Meeting</option>
              <option>Task</option>
              <option>Approval</option>
            </select>

          </div>

          <div>

            <label className="block mb-2 font-semibold">
              Title
            </label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter work title..."
              className="w-full bg-slate-800 rounded-xl p-3"
            />

          </div>

          <div>

            <label className="block mb-2 font-semibold">
              Description
            </label>

            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work..."
              className="w-full bg-slate-800 rounded-xl p-3"
            />

          </div>

          <button
            onClick={routeWork}
            className="bg-cyan-500 hover:bg-cyan-400 px-6 py-3 rounded-xl font-bold transition"
          >
            <Sparkles className="inline mr-2" />
            Route Work
          </button>

        </div>

      </div>

      {result && (

        <div className="bg-slate-900 border border-cyan-500 rounded-2xl p-8">

          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CheckCircle className="text-green-400" />
            AI Recommendation
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            <div className="bg-slate-800 rounded-xl p-5">
              <p className="text-slate-400">Assigned Agent</p>
              <h3 className="text-xl font-bold mt-2">
                {result.agent}
              </h3>
            </div>

            <div className="bg-slate-800 rounded-xl p-5">
              <p className="text-slate-400">Confidence</p>
              <h3 className="text-green-400 text-xl font-bold mt-2">
                {result.confidence}
              </h3>
            </div>

            <div className="bg-slate-800 rounded-xl p-5">
              <p className="text-slate-400">Priority</p>
              <h3 className="text-red-400 text-xl font-bold mt-2">
                {result.priority}
              </h3>
            </div>

            <div className="bg-slate-800 rounded-xl p-5">
              <p className="text-slate-400">Suggested Action</p>
              <h3 className="text-cyan-400 text-xl font-bold mt-2">
                {result.action}
              </h3>
            </div>

          </div>

        </div>

      )}

    </div>
  );
}