import { useState, useEffect } from 'react'
import './App.css'

const TYPE_COLORS = {
  decision: '#f59e0b',
  event: '#3b82f6',
  result: '#10b981',
  fact: '#8b5cf6',
}

function App() {
  const [memories, setMemories] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/timeline')
        const data = await res.json()
        setMemories(data)
        setLastUpdate(new Date().toLocaleTimeString())
      } catch (err) {
        console.error('Failed to fetch timeline:', err)
      }
    }

    fetchTimeline()
    const interval = setInterval(fetchTimeline, 2000)
    return () => clearInterval(interval)
  }, [])

  const sorted = [...memories].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  )

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Shared Agent Memory</h1>
        <div className="status">
          <span className="dot" />
          <span>Live</span>
          {lastUpdate && <span className="update-time">Updated {lastUpdate}</span>}
        </div>
      </header>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-number">{memories.length}</div>
          <div className="stat-label">Memories</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {new Set(memories.map((m) => m.agent_id)).size}
          </div>
          <div className="stat-label">Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {memories.filter((m) => m.memory_type === 'decision').length}
          </div>
          <div className="stat-label">Decisions</div>
        </div>
      </div>

      <div className="timeline">
        <h2>Live Event Timeline</h2>
        {sorted.length === 0 ? (
          <div className="empty">Waiting for agent activity...</div>
        ) : (
          sorted.map((m) => (
            <div key={m.memory_id} className="entry">
              <div className="entry-header">
                <span
                  className="type-badge"
                  style={{ backgroundColor: TYPE_COLORS[m.memory_type] || '#6b7280' }}
                >
                  {m.memory_type}
                </span>
                <span className="agent">{m.agent_id}</span>
                <span className="time">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="entry-content">{m.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default App
