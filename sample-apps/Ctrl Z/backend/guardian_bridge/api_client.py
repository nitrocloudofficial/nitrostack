import random
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import requests

from config import (
    BASE_URL,
    DEVICE_ID,
    DEVICE_NAME,
    HTTP_MAX_RETRIES,
    HTTP_TIMEOUT,
    HTTP_WORKERS,
)
from logger_config import setup_logging

logger = setup_logging(__name__)

_RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}


def _request_with_retry(method: str, url: str, **kwargs) -> requests.Response | None:
    kwargs.setdefault("timeout", HTTP_TIMEOUT)

    for attempt in range(1, HTTP_MAX_RETRIES + 1):
        try:
            response = requests.request(method, url, **kwargs)
        except requests.RequestException as exc:
            logger.warning(
                "HTTP %s %s failed (attempt %d/%d): %s",
                method,
                url,
                attempt,
                HTTP_MAX_RETRIES,
                exc,
            )
        else:
            if response.ok:
                return response

            if response.status_code in _RETRYABLE_STATUS:
                logger.warning(
                    "HTTP %s %s returned %d (attempt %d/%d)",
                    method,
                    url,
                    response.status_code,
                    attempt,
                    HTTP_MAX_RETRIES,
                )
            else:
                # Client error: retrying will not help.
                logger.error(
                    "HTTP %s %s returned non-retryable %d: %s",
                    method,
                    url,
                    response.status_code,
                    response.text[:500],
                )
                return response

        if attempt < HTTP_MAX_RETRIES:
            delay = min(0.5 * (2 ** (attempt - 1)), 5.0)
            time.sleep(delay * (0.8 + 0.4 * random.random()))

    logger.error("HTTP request exhausted retries: %s %s", method, url)
    return None


def register_device() -> bool:
    payload = {"id": DEVICE_ID, "name": DEVICE_NAME}
    response = _request_with_retry(
        "POST", f"{BASE_URL}/device/register", json=payload
    )
    if response:
        logger.info("Device registered: %s", response.json())
        return True
    return False


def start_monitoring() -> bool:
    payload = {"deviceId": DEVICE_ID}
    response = _request_with_retry(
        "POST", f"{BASE_URL}/monitoring/start", json=payload
    )
    if response:
        logger.info("Monitoring started: %s", response.json())
        return True
    return False


def send_packet(packet: dict) -> bool:
    payload = {
        "deviceId": DEVICE_ID,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "rawPacket": packet,
    }
    response = _request_with_retry(
        "POST", f"{BASE_URL}/bridge", json=payload
    )
    return response is not None


class HttpSender:
    """Background HTTP sender with a worker pool."""

    def __init__(self, on_error=None):
        self._executor = ThreadPoolExecutor(
            max_workers=HTTP_WORKERS, thread_name_prefix="http-sender"
        )
        self._on_error = on_error

    def submit(self, packet: dict) -> None:
        self._executor.submit(self._send, packet)

    def _send(self, packet: dict) -> None:
        if not send_packet(packet) and self._on_error:
            self._on_error()

    def shutdown(self, wait: bool = True) -> None:
        self._executor.shutdown(wait=wait)
