from backend.memory_models import Memory
from backend import sqlite_store
from backend import vector_store

def setup():
    sqlite_store.init_db()
    vector_store.init_vector_store()

def remember(content: str, memory_type: str, project_id: str, task_id: str, agent_id: str, importance: float = 0.5) -> str:
    memory = Memory(
        content=content, memory_type=memory_type, project_id=project_id,
        task_id=task_id, agent_id=agent_id, importance=importance,
    )
    sqlite_store.insert_memory(memory)
    vector_store.add_memory(memory.to_dict())
    return memory.memory_id

def recall(query: str, project_id: str, task_id: str = None, limit: int = 5) -> list:
    return vector_store.semantic_search(query, project_id, task_id, limit)

def get_task_memory(task_id: str) -> dict:
    rows = sqlite_store.get_by_task(task_id)
    grouped = {"fact": [], "decision": [], "event": [], "result": []}
    for r in rows:
        grouped[r["memory_type"]].append(r)
    return grouped

def get_decisions(project_id: str, task_id: str = None) -> list:
    return sqlite_store.get_decisions(project_id, task_id)

def get_agent_history(agent_id: str, project_id: str) -> list:
    return sqlite_store.get_by_agent(agent_id, project_id)

def store_result(task_id: str, result: str, agent_id: str, project_id: str) -> str:
    return remember(content=result, memory_type="result", project_id=project_id, task_id=task_id, agent_id=agent_id, importance=0.8)

def handoff_task(task_id: str, from_agent: str, to_agent: str, summary: str, next_steps: str, project_id: str) -> str:
    content = f"Handoff from {from_agent} to {to_agent}. Summary: {summary}. Next steps: {next_steps}"
    return remember(content=content, memory_type="event", project_id=project_id, task_id=task_id, agent_id=from_agent, importance=0.7)
