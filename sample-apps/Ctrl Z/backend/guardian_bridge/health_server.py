import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from config import HEALTH_PORT
from health_metrics import MetricsTracker
from logger_config import setup_logging

logger = setup_logging(__name__)


class _HealthHandler(BaseHTTPRequestHandler):
    metrics: MetricsTracker

    def do_GET(self):
        if self.path != "/health":
            self.send_response(404)
            self.end_headers()
            return

        body = json.dumps(self.metrics.snapshot()).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        logger.debug("Health server: " + format, *args)


class HealthServer:
    """Expose bridge pipeline metrics over HTTP."""

    def __init__(self, metrics: MetricsTracker, port: int = HEALTH_PORT):
        self._metrics = metrics
        self._port = port
        self._thread: threading.Thread | None = None
        self._server: HTTPServer | None = None

    def start(self) -> None:
        handler = type(
            "BridgeHealthHandler",
            (_HealthHandler,),
            {"metrics": self._metrics},
        )
        self._server = HTTPServer(("0.0.0.0", self._port), handler)
        self._thread = threading.Thread(
            target=self._server.serve_forever,
            name="health-server",
            daemon=True,
        )
        self._thread.start()
        logger.info("Health server listening on http://0.0.0.0:%d/health", self._port)

    def stop(self) -> None:
        if self._server:
            self._server.shutdown()
            self._server = None
