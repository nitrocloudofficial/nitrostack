from __future__ import annotations

import os
import time
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv

from shared.logger import get_logger

load_dotenv()

logger = get_logger(__name__)

VERSION = "1.0.0"


class EnterpriseResponse:
    def __init__(
        self,
        success: bool,
        result: str,
        metadata: Dict[str, Any] | None = None,
    ) -> None:
        self.success = success
        self.result = result
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "result": self.result,
            "metadata": self.metadata,
        }


INTENT_PATTERNS: List[Dict[str, Any]] = [
    {"type": "MATH", "keywords": ["calculate", "math", "equation", "formula", "solve"], "agents": ["Math Agent"]},
    {"type": "CODING", "keywords": ["code", "program", "function", "class", "debug", "implement", "typescript", "python", "javascript", "api"], "agents": ["Coding Agent"]},
    {"type": "RESEARCH", "keywords": ["research", "study", "analyze", "investigate", "explore", "compare", "review"], "agents": ["Research Agent"]},
    {"type": "PLANNING", "keywords": ["plan", "strategy", "roadmap", "timeline", "milestone", "project", "schedule"], "agents": ["Planning Agent"]},
    {"type": "BUSINESS", "keywords": ["business", "revenue", "market", "customer", "profit", "growth", "roi"], "agents": ["Business Agent"]},
    {"type": "SECURITY", "keywords": ["security", "vulnerab", "threat", "attack", "encrypt", "auth", "firewall", "compliance"], "agents": ["Security Agent"]},
    {"type": "SQL", "keywords": ["sql", "database", "query", "table", "select", "insert", "join"], "agents": ["SQL Agent"]},
    {"type": "DATA_SCIENCE", "keywords": ["data science", "machine learning", "model", "dataset", "prediction", "neural", "training"], "agents": ["Data Science Agent"]},
    {"type": "DEVOPS", "keywords": ["deploy", "docker", "kubernetes", "ci/cd", "pipeline", "infra", "cloud", "aws", "azure"], "agents": ["DevOps Agent"]},
]


def detect_intents(query: str) -> Dict[str, Any]:
    lower = query.lower()
    matched_intents: List[str] = []
    agents: set[str] = set()

    for pattern in INTENT_PATTERNS:
        if any(kw in lower for kw in pattern["keywords"]):
            matched_intents.append(pattern["type"])
            for agent in pattern["agents"]:
                agents.add(agent)

    if not matched_intents:
        matched_intents.append("GENERAL")
        agents.add("Enterprise Assistant")

    return {
        "intents": matched_intents,
        "agents": sorted(agents),
        "confidence": min(1.0, 0.5 + len(matched_intents) * 0.15),
    }


class GroqLLM:
    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    def available(self) -> bool:
        return bool(self.api_key)

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        with httpx.Client(timeout=60) as client:
            resp = client.post(self.base_url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]


class EnterpriseKernel:
    VERSION = VERSION

    def __init__(self) -> None:
        self.llm = GroqLLM()
        self._running = False
        self._start_time: float | None = None
        self._stats = {
            "total": 0,
            "success": 0,
            "failed": 0,
            "total_time": 0.0,
        }

    def start(self) -> None:
        if not self.llm.available():
            logger.warning("GROQ_API_KEY not set — LLM calls will fail")
        self._running = True
        self._start_time = time.time()
        logger.info("Enterprise Kernel started (v%s)", self.VERSION)

    def stop(self) -> None:
        self._running = False
        logger.info("Enterprise Kernel stopped")

    def is_running(self) -> bool:
        return self._running

    def kernel_info(self) -> Dict[str, Any]:
        return {
            "name": "AEIOS-X",
            "fullName": "Autonomous Enterprise Intelligence Operating System",
            "version": self.VERSION,
            "capabilities": [
                "Multi-Agent AI Pipeline",
                "Dynamic Agent Creation",
                "Intent Detection (10 types)",
                "Enterprise Knowledge Management",
                "Consensus Engine",
                "Decision Engine",
                "Conflict Resolution",
                "Enterprise Response Synthesis",
            ],
            "llm": {
                "provider": "Groq",
                "model": self.llm.model,
                "available": self.llm.available(),
            },
        }

    def reset(self) -> None:
        self._stats = {"total": 0, "success": 0, "failed": 0, "total_time": 0.0}

    def run(
        self,
        task_name: str,
        payload: Dict[str, Any],
        priority: int = 5,
    ) -> Dict[str, Any]:
        start = time.time()
        self._stats["total"] += 1

        query = payload.get("query") or payload.get("prompt", "")
        if not query:
            return {"success": False, "result": EnterpriseResponse(False, "No query provided")}

        try:
            intent_result = detect_intents(query)
            agent_outputs = self._run_agents(query, intent_result)
            synthesized = self._synthesize(query, intent_result, agent_outputs)
            elapsed = time.time() - start
            self._stats["success"] += 1
            self._stats["total_time"] += elapsed

            response = EnterpriseResponse(
                success=True,
                result=synthesized,
                metadata={
                    "pipeline": "enterprise-v1",
                    "intents": intent_result["intents"],
                    "agents": intent_result["agents"],
                    "agentCount": len(intent_result["agents"]),
                    "confidence": intent_result["confidence"],
                    "executionTime": round(elapsed, 3),
                },
            )
            return {"success": True, "result": response}

        except Exception as exc:
            elapsed = time.time() - start
            self._stats["failed"] += 1
            self._stats["total_time"] += elapsed
            logger.error("Pipeline failed: %s", exc)
            return {
                "success": False,
                "result": EnterpriseResponse(False, f"Pipeline execution failed: {exc}"),
            }

    def _run_agents(
        self, query: str, intent_result: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        for role in intent_result["agents"]:
            start = time.time()
            system_prompt = (
                f"You are {role}, an expert AI agent in the AEIOS-X Enterprise Intelligence System.\n"
                f"Your role: {role}\n\n"
                "Guidelines:\n"
                "- Provide clear, actionable enterprise-grade analysis\n"
                "- Identify risks, opportunities, and recommendations\n"
                "- Be specific and data-driven where possible\n"
                "- Consider enterprise context and best practices\n"
                "- Format responses with clear structure"
            )
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"## Task\n{query}\n\nProvide your expert {role} analysis."},
            ]
            try:
                output = self.llm.chat(messages)
                results.append({"agent": role, "success": True, "output": output, "time": round(time.time() - start, 3)})
            except Exception as exc:
                results.append({"agent": role, "success": False, "output": "", "error": str(exc), "time": round(time.time() - start, 3)})
        return results

    def _synthesize(
        self,
        query: str,
        intent_result: Dict[str, Any],
        agent_outputs: List[Dict[str, Any]],
    ) -> str:
        successful = [a for a in agent_outputs if a["success"]]
        if not successful:
            return "No agents produced output. Please try again."

        agent_section = "\n\n".join(
            f"### {a['agent']}\n{a['output']}" for a in successful
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are the AEIOS-X Enterprise Response Composer.\n"
                    "Synthesize multiple AI agent outputs into a single, cohesive enterprise-grade response.\n\n"
                    "Guidelines:\n"
                    "- Create a unified, well-structured response\n"
                    "- Highlight key findings, risks, and recommendations\n"
                    "- Use clear markdown formatting\n"
                    "- Prioritize actionable insights\n"
                    "- Maintain professional enterprise tone\n"
                    "- Do NOT mention individual agents or the pipeline process"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"## Original Query\n{query}\n\n"
                    f"## Detected Intents\n{', '.join(intent_result['intents'])}\n\n"
                    f"## Agent Analysis\n{agent_section}\n\n"
                    "Compose the final enterprise response."
                ),
            },
        ]
        return self.llm.chat(messages, max_tokens=4096)
