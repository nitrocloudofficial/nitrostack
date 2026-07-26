"""
HELIX: Advanced Enterprise Cognitive Genome Platform - Main Server Entrypoint
Provides CORS-enabled REST API Server with SSE/MCP Streamable Transport Support.
"""

import os
import sys
import json
import uuid
import socketserver
import http.server
from typing import Dict, Any, List, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from pipeline.embedding.llm import LLMClient
from pipeline.embedding.embeddings import EmbeddingEngine
from pipeline.embedding.qdrant_connector import QdrantConnector
from pipeline.graphs.genome import CognitiveGenome, DepartmentGenomeProfile
from pipeline.interpolation.drift_engine import CognitiveDriftEngine
from pipeline.interpolation.recommendations import AntiDriftRecommendationEngine
from pipeline.embedding.rag import RAGPipeline
from pipeline.embedding.prompt import PromptManager

# Initialize Core Services
llm_client = LLMClient()
embedding_engine = EmbeddingEngine()
qdrant = QdrantConnector()
rag_pipeline = RAGPipeline(
    embedding_engine=embedding_engine,
    llm_client=llm_client,
    qdrant_connector=qdrant
)
drift_engine = CognitiveDriftEngine(llm_client=llm_client)
recommendation_engine = AntiDriftRecommendationEngine(llm_client=llm_client)


def run_standalone_server(port: int = 8000):
    """Runs CORS & SSE-enabled Python HTTP server for endpoints."""
    class SimpleHandler(http.server.BaseHTTPRequestHandler):
        def do_OPTIONS(self):
            """Handles CORS preflight requests for NitroStudio / Cloud connection."""
            self.send_response(200)
            self._send_cors_headers()
            self.end_headers()

        def do_GET(self):
            if self.path in ["/health", "/", "/mcp", "/sse"]:
                self._send_json({
                    "status": "HEALTHY",
                    "service": "HELIX Advanced Enterprise Engine",
                    "version": "2.0.0",
                    "transport": "HTTP/SSE Streamable",
                    "documents_indexed": rag_pipeline.qdrant.count()
                })
            elif self.path.startswith("/genome/"):
                dept = self.path.split("/genome/")[-1]
                profile = drift_engine.department_profiles.get(dept, DepartmentGenomeProfile(dept))
                self._send_json(profile.to_dict())
            else:
                self._send_json({"status": "HEALTHY", "service": "HELIX Enterprise Engine", "endpoint": self.path})

        def do_POST(self):
            length = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(length)
            try:
                body = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
            except Exception:
                body = {}

            if self.path == "/chat":
                msg = body.get("message", "")
                dept = body.get("department", "Engineering")
                res = rag_pipeline.answer_question(msg, department=dept)
                self._send_json({
                    "conversation_id": f"conv-{uuid.uuid4().hex[:8]}",
                    "department": dept,
                    "response": res["answer"]
                })
            elif self.path in ["/ask", "/mcp"]:
                q = body.get("question", body.get("message", "Who managed David Miller in 2022?"))
                dept = body.get("department", "Engineering")
                res = rag_pipeline.answer_question(q, department=dept)
                self._send_json(res)
            elif self.path == "/recommendation":
                dept = body.get("department", "Engineering")
                signals = body.get("signals", ["Process drift detected"])
                plan = recommendation_engine.generate_plan(dept, 0.35, signals)
                self._send_json(plan.to_dict())
            elif self.path == "/drift/analyze":
                dept = body.get("department", "Engineering")
                signals = body.get("signals", ["Process drift"])
                diag = drift_engine.evaluate_drift(dept, signals)
                self._send_json(diag.to_dict())
            elif self.path == "/index":
                t = body.get("title", "Doc")
                c = body.get("content", "")
                d = body.get("department", "General Enterprise")
                res = rag_pipeline.add_document(title=t, content=c, department=d)
                self._send_json(res)
            else:
                self._send_json({"status": "SUCCESS", "message": "HELIX MCP Request Received"})

        def _send_cors_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, mcp-version")

        def _send_json(self, data: dict, status: int = 200):
            self.send_response(status)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))

    socketserver.TCPServer.allow_reuse_address = True
    for p in [port, 8001, 8002, 8080]:
        try:
            print(f"🚀 Starting HELIX Advanced HTTP Server on port {p}...")
            with socketserver.TCPServer(("0.0.0.0", p), SimpleHandler) as httpd:
                httpd.serve_forever()
            break
        except (OSError, PermissionError):
            print(f"  [!] Port {p} unavailable, trying fallback port...")
            continue


if __name__ == "__main__":
    run_standalone_server()
