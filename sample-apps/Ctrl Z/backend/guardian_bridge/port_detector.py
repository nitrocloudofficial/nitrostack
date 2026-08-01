import serial
import serial.tools.list_ports

from config import ESP32_USB_IDS, SERIAL_PORT
from logger_config import setup_logging

logger = setup_logging(__name__)


def scan_esp32_ports() -> list[str]:
    """Return all serial ports matching a known ESP32 USB identifier."""
    matches: list[tuple[int, str]] = []
    for port_info in serial.tools.list_ports.comports():
        vid = port_info.vid
        pid = port_info.pid
        if vid is None or pid is None:
            continue
        if (vid, pid) in ESP32_USB_IDS:
            priority = ESP32_USB_IDS.index((vid, pid))
            matches.append((priority, port_info.device))

    matches.sort(key=lambda item: item[0])
    return [device for _, device in matches]


def find_esp32_port() -> str | None:
    """Scan serial ports for known ESP32 USB identifiers (preferred first)."""
    devices = scan_esp32_ports()
    if not devices:
        return None

    logger.info("Found ESP32 device(s): %s", devices)
    return devices[0]


def resolve_serial_port() -> str:
    """Return configured port or auto-detected ESP32 port."""
    if SERIAL_PORT:
        logger.info("Using configured serial port: %s", SERIAL_PORT)
        return SERIAL_PORT

    detected = find_esp32_port()
    if detected:
        return detected

    raise serial.SerialException(
        "No ESP32 serial port found. Set GUARDIAN_SERIAL_PORT or "
        "connect the receiver."
    )


def port_available(port: str) -> bool:
    """Return True if the given serial port is currently enumerated."""
    return any(p.device == port for p in serial.tools.list_ports.comports())
