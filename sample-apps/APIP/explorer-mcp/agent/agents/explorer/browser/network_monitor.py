"""Network monitor listening to Playwright request and response events."""

from typing import List, Dict, Optional
from playwright.async_api import Request as PWRequest, Response as PWResponse
from agents.explorer.browser.browser_controller import BrowserController
from agents.explorer.models.network import NetworkRequest, NetworkResponse
from agents.explorer.interfaces import AbstractNetworkMonitor
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class NetworkMonitor(AbstractNetworkMonitor):
    """Monitors HTTP requests and responses made by the browser context."""

    def __init__(self, browser_controller: BrowserController):
        self.browser = browser_controller
        self._requests: Dict[str, NetworkRequest] = {}
        self._request_counter = 0

    def attach_listeners(self) -> None:
        """Attach Playwright network event handlers."""
        page = self.browser.page
        page.on("request", self._on_request)
        page.on("response", self._on_response)
        page.on("requestfailed", self._on_request_failed)
        logger.info("Network monitor listeners attached.")

    def _on_request(self, request: PWRequest) -> None:
        self._request_counter += 1
        req_id = f"req_{self._request_counter:05d}"
        
        # Store internal mapping on request object if possible or track by URL/id
        net_req = NetworkRequest(
            request_id=req_id,
            url=request.url,
            method=request.method,
            resource_type=request.resource_type,
            post_data=request.post_data,
        )
        self._requests[request.url] = net_req

    def _on_response(self, response: PWResponse) -> None:
        url = response.url
        if url in self._requests:
            net_resp = NetworkResponse(
                status_code=response.status,
                status_text=response.status_text,
                headers=dict(response.headers),
                response_time_ms=0.0
            )
            self._requests[url].response = net_resp

    def _on_request_failed(self, request: PWRequest) -> None:
        url = request.url
        if url in self._requests:
            self._requests[url].failed = True
            self._requests[url].failure_text = request.failure

    def get_network_requests(self) -> List[NetworkRequest]:
        """Return all recorded network requests."""
        return list(self._requests.values())
