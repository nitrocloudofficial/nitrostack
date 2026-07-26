import sqlite3
import json
import os
import threading
from typing import Dict, Any, List, Optional

class DatabaseManager:
    """
    SQLite persistent storage for Workflows, Tasks, and System Queues.
    Guarantees state retention across server restarts and crashes.
    """
    def __init__(self, db_path: str = None):
        if not db_path:
            db_path = os.getenv("DB_PATH")
        if not db_path:
            if os.access(".", os.W_OK):
                db_path = "orchestrator_jobs.db"
            else:
                db_path = "/tmp/orchestrator_jobs.db"
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Table for Workflows
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS workflows (
                    workflow_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    goal TEXT NOT NULL,
                    status TEXT NOT NULL,
                    priority INTEGER DEFAULT 1,
                    plan TEXT,
                    context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Table for Tasks
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    task_id TEXT PRIMARY KEY,
                    workflow_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    priority INTEGER DEFAULT 1,
                    input_data TEXT,
                    output_data TEXT,
                    error_msg TEXT,
                    retry_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(workflow_id) REFERENCES workflows(workflow_id)
                )
            """)
            
            conn.commit()
            conn.close()

    def save_workflow(self, workflow_id: str, user_id: str, goal: str, status: str, priority: int = 1, plan: List[str] = None, context: Dict[str, Any] = None):
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO workflows (workflow_id, user_id, goal, status, priority, plan, context, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(workflow_id) DO UPDATE SET
                    status=excluded.status,
                    plan=COALESCE(excluded.plan, workflows.plan),
                    context=excluded.context,
                    updated_at=CURRENT_TIMESTAMP
            """, (workflow_id, user_id, goal, status, priority, json.dumps(plan or []), json.dumps(context or {})))
            conn.commit()
            conn.close()

    def save_task(self, task_id: str, workflow_id: str, agent_name: str, status: str, priority: int = 1, input_data: Dict[str, Any] = None, output_data: Dict[str, Any] = None, error_msg: str = None, retry_count: int = 0):
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO tasks (task_id, workflow_id, agent_name, status, priority, input_data, output_data, error_msg, retry_count, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(task_id) DO UPDATE SET
                    status=excluded.status,
                    output_data=excluded.output_data,
                    error_msg=excluded.error_msg,
                    retry_count=excluded.retry_count,
                    updated_at=CURRENT_TIMESTAMP
            """, (task_id, workflow_id, agent_name, status, priority, json.dumps(input_data or {}), json.dumps(output_data or {}) if output_data else None, error_msg, retry_count))
            conn.commit()
            conn.close()

    def get_workflow(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workflows WHERE workflow_id = ?", (workflow_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                res = dict(row)
                res["context"] = json.loads(res["context"]) if res["context"] else {}
                res["plan"] = json.loads(res["plan"]) if res.get("plan") else []
                return res
            return None

    def get_tasks_for_workflow(self, workflow_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tasks WHERE workflow_id = ? ORDER BY created_at ASC", (workflow_id,))
            rows = cursor.fetchall()
            conn.close()
            results = []
            for row in rows:
                r = dict(row)
                r["input_data"] = json.loads(r["input_data"]) if r["input_data"] else {}
                r["output_data"] = json.loads(r["output_data"]) if r["output_data"] else {}
                results.append(r)
            return results

    def get_active_workflows(self) -> List[Dict[str, Any]]:
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workflows WHERE status IN ('QUEUED', 'RUNNING', 'WAITING')")
            rows = cursor.fetchall()
            conn.close()
            results = []
            for row in rows:
                r = dict(row)
                r["context"] = json.loads(r["context"]) if r["context"] else {}
                r["plan"] = json.loads(r["plan"]) if r.get("plan") else []
                results.append(r)
            return results

    def get_unfinished_tasks(self) -> List[Dict[str, Any]]:
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tasks WHERE status IN ('QUEUED', 'RUNNING') ORDER BY priority DESC, created_at ASC")
            rows = cursor.fetchall()
            conn.close()
            results = []
            for row in rows:
                r = dict(row)
                r["input_data"] = json.loads(r["input_data"]) if r["input_data"] else {}
                r["output_data"] = json.loads(r["output_data"]) if r["output_data"] else {}
                results.append(r)
            return results

    def recover_interrupted_tasks(self):
        """
        On server startup, reset any tasks left in 'RUNNING' back to 'QUEUED'
        so they can be safely re-scheduled and re-executed.
        """
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE tasks SET status = 'QUEUED' WHERE status = 'RUNNING'")
            cursor.execute("UPDATE workflows SET status = 'QUEUED' WHERE status = 'RUNNING'")
            conn.commit()
            conn.close()
