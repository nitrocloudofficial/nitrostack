import sqlite3
import os
from backend.memory_models import Memory

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "memory.db")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            memory_id TEXT PRIMARY KEY,
            content TEXT,
            memory_type TEXT,
            project_id TEXT,
            task_id TEXT,
            agent_id TEXT,
            importance REAL,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()

def insert_memory(memory: Memory) -> str:
    conn = sqlite3.connect(DB_PATH)
    d = memory.to_dict()
    conn.execute(
        "INSERT INTO memories VALUES (:memory_id, :content, :memory_type, :project_id, :task_id, :agent_id, :importance, :timestamp)",
        d,
    )
    conn.commit()
    conn.close()
    return memory.memory_id

def get_by_task(task_id: str) -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM memories WHERE task_id = ?", (task_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_by_agent(agent_id: str, project_id: str) -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM memories WHERE agent_id = ? AND project_id = ?", (agent_id, project_id)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_decisions(project_id: str, task_id: str = None) -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if task_id:
        rows = conn.execute(
            "SELECT * FROM memories WHERE project_id = ? AND task_id = ? AND memory_type = 'decision'",
            (project_id, task_id),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM memories WHERE project_id = ? AND memory_type = 'decision'", (project_id,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_all() -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM memories ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]
