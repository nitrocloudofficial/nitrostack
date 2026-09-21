import serial

from binary_parser import BinaryCSIParser
from config import BAUD_RATE
from logger_config import setup_logging
from port_detector import resolve_serial_port

logger = setup_logging(__name__)


class SerialManager:
    """Serial reader with line reassembly and binary frame support."""

    def __init__(self, port: str | None = None):
        self._port_name = port or resolve_serial_port()
        self._serial: serial.Serial | None = None
        self._line_buffer = bytearray()
        self._binary_parser = BinaryCSIParser()
        self._connect()

    def _connect(self) -> None:
        if self._serial and self._serial.is_open:
            self._serial.close()

        self._serial = serial.Serial(
            self._port_name,
            BAUD_RATE,
            timeout=0.05,
        )
        self._line_buffer.clear()
        self._binary_parser = BinaryCSIParser()
        logger.info("Serial connected on %s @ %d baud", self._port_name, BAUD_RATE)

    @property
    def port(self) -> str:
        return self._port_name

    def reconnect(self, port: str | None = None) -> None:
        if port:
            self._port_name = port
        else:
            self._port_name = resolve_serial_port()
        self._connect()

    def read_available(self) -> tuple[list[bytes], list[dict]]:
        """
        Read all available serial data.
        Returns (ascii_lines, binary_packets).
        """
        if not self._serial or not self._serial.is_open:
            return [], []

        waiting = self._serial.in_waiting
        chunk = self._serial.read(max(waiting, 1))
        if not chunk:
            return [], []

        binary_packets = self._binary_parser.feed(chunk)

        self._line_buffer.extend(chunk)
        lines: list[bytes] = []

        while True:
            newline_idx = self._line_buffer.find(b"\n")
            if newline_idx == -1:
                break
            raw_line = bytes(self._line_buffer[: newline_idx + 1])
            del self._line_buffer[: newline_idx + 1]
            line = raw_line.strip()
            if line:
                lines.append(line)

        # Prevent unbounded buffer growth on malformed streams
        if len(self._line_buffer) > 65536:
            logger.warning(
                "Line buffer overflow (%d bytes), clearing",
                len(self._line_buffer),
            )
            self._line_buffer.clear()

        return lines, binary_packets

    def close(self) -> None:
        if self._serial and self._serial.is_open:
            self._serial.close()
            logger.info("Serial port closed")
