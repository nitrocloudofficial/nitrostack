import os

SERIAL_PORT = os.environ.get("GUARDIAN_SERIAL_PORT", "")
BAUD_RATE = int(os.environ.get("GUARDIAN_BAUD_RATE", "921600"))

OUTPUT_FILE = os.environ.get(
    "GUARDIAN_OUTPUT_FILE", "guardian_data.jsonl"
)

DEBUG = os.environ.get("GUARDIAN_DEBUG", "false").lower() in (
    "1",
    "true",
    "yes",
)

# Logging
LOG_LEVEL = os.environ.get("GUARDIAN_LOG_LEVEL", "").upper()
LOG_FILE = os.environ.get("GUARDIAN_LOG_FILE", "guardian_bridge.log")
LOG_MAX_BYTES = int(os.environ.get("GUARDIAN_LOG_MAX_BYTES", "5242880"))
LOG_BACKUP_COUNT = int(os.environ.get("GUARDIAN_LOG_BACKUP_COUNT", "3"))

BASE_URL = os.environ.get(
    "GUARDIAN_BACKEND_URL", "http://localhost:5000/api"
)

DEVICE_ID = os.environ.get("GUARDIAN_DEVICE_ID", "ESP32_S3_001")
DEVICE_NAME = os.environ.get("GUARDIAN_DEVICE_NAME", "Guardian Bridge")

# Pipeline tuning
RAW_QUEUE_SIZE = int(os.environ.get("GUARDIAN_RAW_QUEUE_SIZE", "1000"))
PACKET_QUEUE_SIZE = int(
    os.environ.get("GUARDIAN_PACKET_QUEUE_SIZE", "1000")
)
WRITE_BATCH_SIZE = int(os.environ.get("GUARDIAN_WRITE_BATCH_SIZE", "20"))
WRITE_FLUSH_INTERVAL = float(
    os.environ.get("GUARDIAN_WRITE_FLUSH_INTERVAL", "1.0")
)

HTTP_WORKERS = int(os.environ.get("GUARDIAN_HTTP_WORKERS", "2"))
HTTP_TIMEOUT = float(os.environ.get("GUARDIAN_HTTP_TIMEOUT", "2.0"))
HTTP_MAX_RETRIES = int(os.environ.get("GUARDIAN_HTTP_MAX_RETRIES", "3"))

HEALTH_PORT = int(os.environ.get("GUARDIAN_HEALTH_PORT", "5001"))

# ESP32 USB VID/PID pairs, ordered by preference (Espressif native first)
ESP32_USB_IDS = [
    (0x303A, 0x1001),  # Espressif USB JTAG
    (0x303A, 0x0002),  # ESP32-S2/S3 USB CDC
    (0x10C4, 0xEA60),  # Silicon Labs CP210x
    (0x1A86, 0x7523),  # WCH CH340
    (0x1A86, 0x55D4),  # WCH CH9102
]
