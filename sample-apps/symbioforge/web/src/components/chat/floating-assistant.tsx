"use client"

import { useState, useRef, useEffect, useCallback, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Bot, X, Send, User, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    setError(null)
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error: ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      const assistantId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 right-0 w-[350px] sm:w-[400px] h-[500px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-zinc-900/40 backdrop-blur border border-zinc-700/50"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100 text-sm">SymBioForge AI</h3>
                    <p className="text-xs text-zinc-400">Powered by Groq</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center p-6 text-zinc-400">
                      <Bot className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                      <p className="text-sm">Hi! I&apos;m the SymBioForge AI. Ask me about factories, matches, carbon metrics, or anything else!</p>
                    </div>
                  )}
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-zinc-800 text-zinc-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-zinc-800 text-zinc-100 rounded-tr-none' : 'bg-zinc-900/80 border border-zinc-800 text-zinc-300 rounded-tl-none'}`}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="flex justify-start">
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 rounded-tl-none flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="flex justify-center p-2">
                      <div className="bg-red-500/10 text-red-400 text-xs px-3 py-1.5 rounded-md border border-red-500/20">
                        {error}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Input */}
              <div className="p-3 bg-zinc-900/50 border-t border-zinc-800/50 backdrop-blur-md">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about the cluster..."
                    className="flex-1 bg-zinc-950/50 border border-zinc-700/50 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 h-9 w-9">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-500/20 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </Button>
      </div>
    </>
  )
}
