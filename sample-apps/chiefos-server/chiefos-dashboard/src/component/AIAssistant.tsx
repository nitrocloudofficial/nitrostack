import { Bot, Send, Sparkles } from "lucide-react";
import { useState } from "react";

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      sender: "AI",
      text: "Hello! I'm your AI Chief of Staff. How can I help today?",
    },
  ]);

  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { sender: "You", text: input },
      {
        sender: "AI",
        text: "MCP integration coming next. This is a demo response.",
      },
    ]);

    setInput("");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <div className="flex items-center gap-3 mb-5">

        <Bot className="text-cyan-400" />

        <h2 className="text-xl font-bold">
          AI Assistant
        </h2>

      </div>

      <div className="h-80 overflow-y-auto space-y-3">

        {messages.map((msg, index) => (

          <div
            key={index}
            className={`p-3 rounded-xl ${
              msg.sender === "AI"
                ? "bg-slate-800"
                : "bg-cyan-500"
            }`}
          >
            <p className="text-sm opacity-70">
              {msg.sender}
            </p>

            <p className="mt-1">
              {msg.text}
            </p>

          </div>

        ))}

      </div>

      <div className="flex gap-3 mt-5">

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI Chief..."
          className="flex-1 bg-slate-800 rounded-xl p-3 outline-none"
        />

        <button
          onClick={sendMessage}
          className="bg-cyan-500 hover:bg-cyan-400 rounded-xl px-5"
        >
          <Send />
        </button>

      </div>

      <div className="mt-5 flex items-center gap-2 text-green-400">

        <Sparkles size={18} />

        AI Ready

      </div>

    </div>
  );
}