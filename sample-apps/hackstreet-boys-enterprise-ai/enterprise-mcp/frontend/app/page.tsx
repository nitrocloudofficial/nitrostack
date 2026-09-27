'use client'

import { useState } from 'react'

export default function Home() {
  const [messages, setMessages] = useState<{role: str, content: string}[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages, stream: false })
      })
      
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.response }])
    } catch (err) {
      console.error(err)
      setMessages([...newMessages, { role: 'assistant', content: 'Error communicating with server.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-xl font-bold mb-8">Enterprise MCP</h1>
        <nav className="space-y-2">
          <a href="#" className="block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 font-medium">Chat</a>
          <a href="#" className="block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">Documents</a>
          <a href="#" className="block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">Projects</a>
          <a href="#" className="block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">Settings</a>
        </nav>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold">AI Assistant</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <p>Welcome to Enterprise Knowledge Platform.</p>
              <p className="text-sm mt-2">Try asking: "What is our leave policy?" or "Who owns Project Atlas?"</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-lg p-4 ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-gray-500">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
