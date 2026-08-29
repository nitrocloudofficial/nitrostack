import queue
import threading
import time

import serial

from api_client import HttpSender, register_device, start_monitoring
from config import RAW_QUEUE_SIZE, WRITE_FLUSH_INTERVAL
from csi_parser import CSIParser
from dataset_writer import DatasetWriter
from health_metrics import DropAwareQueue, MetricsTracker
from health_server import HealthServer
from logger_config import setup_logging
from packet_validator import PacketValidator
from port_detector import port_available, resolve_serial_port
from serial_manager import SerialManager

logger = setup_logging(__name__)

OUTPUT_QUEUE_SIZE = 1000


class GuardianRuntime:
    """
    Multi-threaded CSI pipeline:
      Serial Reader -> Raw Queue -> Parser -> Output Queue -> Writer + HTTP
    """

    def __init__(self):
        self.serial_manager: SerialManager | None = None
        self.writer: DatasetWriter | None = None
        self.metrics = MetricsTracker()
        self._raw_queue = DropAwareQueue(
            RAW_QUEUE_SIZE, self.metrics, "raw_queue_drops"
        )
        self._output_queue = DropAwareQueue(
            OUTPUT_QUEUE_SIZE, self.metrics, "packet_queue_drops"
        )
        self._http_sender = HttpSender(
            on_error=lambda: self.metrics.increment("http_errors")
        )
        self._health_server = HealthServer(self.metrics)
        self._running = False
        self._threads: list[threading.Thread] = []

    def start(self, output_file: str) -> None:
        if self._running:
            return

        while True:
            try:
                port = resolve_serial_port()
                self.serial_manager = SerialManager(port=port)
                break
            except serial.SerialException as exc:
                logger.warning(
                    "Receiver not found (%s). Plug in ESP32-S3. Retrying in 3s...",
                    exc,
                )
                time.sleep(3)

        register_device()
        start_monitoring()

        self.writer = DatasetWriter(output_file)
        self._running = True
        self._health_server.start()

        self._threads = [
            threading.Thread(
                target=self._serial_reader_loop,
                name="serial-reader",
                daemon=True,
            ),
            threading.Thread(
                target=self._parser_loop,
                name="parser",
                daemon=True,
            ),
            threading.Thread(
                target=self._output_loop,
                name="output",
                daemon=True,
            ),
        ]
        for thread in self._threads:
            thread.start()

        logger.info("Guardian Runtime started (multi-threaded pipeline)")

    def _reconnect_serial(self) -> None:
        try:
            if self.serial_manager:
                self.serial_manager.close()
            self.serial_manager = SerialManager()
            self.metrics.increment("serial_reconnects")
            logger.info("Serial reconnected on %s", self.serial_manager.port)
        except serial.SerialException as exc:
            logger.error("Serial reconnect failed: %s", exc)
            self.serial_manager = None

    def _serial_reader_loop(self) -> None:
        last_port_check = 0.0

        while self._running:
            if not self.serial_manager:
                self._reconnect_serial()
                time.sleep(1)
                continue

            # Detect device unplug/replug while running
            now = time.time()
            if now - last_port_check >= 5.0:
                last_port_check = now
                if not port_available(self.serial_manager.port):
                    logger.warning(
                        "Serial port %s disappeared, reconnecting...",
                        self.serial_manager.port,
                    )
                    self.metrics.increment("serial_reconnects")
                    self.serial_manager.close()
                    self.serial_manager = None
                    continue

            try:
                lines, binary_packets = self.serial_manager.read_available()

                for packet in binary_packets:
                    self.metrics.increment("packets_read")
                    self._raw_queue.put(("binary", packet), timeout=0.01)

                for line in lines:
                    self.metrics.increment("packets_read")
                    self._raw_queue.put(("ascii", line), timeout=0.01)

            except serial.SerialException as exc:
                logger.error("Serial read error: %s", exc)
                self.serial_manager = None
                time.sleep(1)

            except Exception as exc:
                logger.error("Unexpected serial error: %s", exc, exc_info=True)
                time.sleep(0.1)

    def _parser_loop(self) -> None:
        while self._running:
            try:
                kind, data = self._raw_queue.get(timeout=0.5)
            except queue.Empty:
                continue

            try:
                if kind == "binary":
                    packet = data
                else:
                    line = (
                        data.decode("utf-8", errors="ignore").strip()
                        if isinstance(data, bytes)
                        else str(data).strip()
                    )
                    if not PacketValidator.is_valid(line):
                        self.metrics.increment("validation_errors")
                        continue

                    packet = CSIParser.parse(line)
                    if packet is None:
                        self.metrics.increment("parse_errors")
                        continue

                self.metrics.increment("packets_parsed")
                self._output_queue.put(packet, timeout=0.01)

            finally:
                self._raw_queue.task_done()

    def _output_loop(self) -> None:
        """Batch-write to disk and dispatch HTTP sends for each parsed packet."""
        batch: list[dict] = []
        last_flush = time.time()

        while self._running:
            try:
                packet = self._output_queue.get(timeout=0.5)
                batch.append(packet)
                self._http_sender.submit(packet)
                self.metrics.increment("packets_sent")
                self._output_queue.task_done()
            except queue.Empty:
                pass

            should_flush = batch and (
                len(batch) >= 20
                or (time.time() - last_flush) >= WRITE_FLUSH_INTERVAL
            )

            if should_flush and self.writer:
                self.writer.save_batch(batch)
                self.metrics.increment("packets_written", len(batch))
                batch = []
                last_flush = time.time()

        if batch and self.writer:
            self.writer.save_batch(batch)

    def stop(self) -> None:
        self._running = False
        self._health_server.stop()
        self._http_sender.shutdown(wait=True)

        for thread in self._threads:
            thread.join(timeout=2)

        if self.writer:
            self.writer.close()

        if self.serial_manager:
            self.serial_manager.close()

        logger.info(
            "Guardian Runtime stopped. Metrics: %s", self.metrics.snapshot()
        )

    def record(self, duration: float) -> int:
        start = time.time()
        initial = self.metrics.snapshot()["packets_parsed"]
        while time.time() - start < duration:
            time.sleep(0.1)
        final = self.metrics.snapshot()["packets_parsed"]
        return final - initial

    def process_packet(self):
        """Legacy single-packet API for tests."""
        if not self.serial_manager:
            return None

        lines, binary_packets = self.serial_manager.read_available()
        for packet in binary_packets:
            if self.writer:
                self.writer.save(packet)
            self._http_sender.submit(packet)
            return packet

        for line in lines:
            text = line.decode("utf-8", errors="ignore").strip()
            if not PacketValidator.is_valid(text):
                continue
            packet = CSIParser.parse(text)
            if packet:
                if self.writer:
                    self.writer.save(packet)
                self._http_sender.submit(packet)
                return packet
        return None
