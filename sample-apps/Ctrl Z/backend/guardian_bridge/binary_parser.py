"""Binary CSI frame decoder for compact UART protocol (Phase 4)."""

import struct

from logger_config import setup_logging

logger = setup_logging(__name__)

MAGIC = b"GS"
VERSION = 1
HEADER_FMT = "<2sB i b B b B b H I"  # magic, ver, id, rssi, ch, noise, agc, fft, csi_len, ts
HEADER_SIZE = struct.calcsize(HEADER_FMT)
CHECKSUM_SIZE = 2


class BinaryCSIParser:
    """Parse compact binary CSI frames emitted by updated firmware."""

    def __init__(self):
        self._buffer = bytearray()

    def feed(self, data: bytes) -> list[dict]:
        """Append bytes and return all complete packets found."""
        self._buffer.extend(data)
        packets: list[dict] = []

        while True:
            packet = self._try_extract_one()
            if packet is None:
                break
            packets.append(packet)

        return packets

    def _try_extract_one(self) -> dict | None:
        buf = self._buffer

        # Resync to magic bytes
        while len(buf) >= 2:
            if buf[0:2] == MAGIC:
                break
            del buf[0]

        if len(buf) < HEADER_SIZE + CHECKSUM_SIZE:
            return None

        header = struct.unpack_from(HEADER_FMT, buf, 0)
        magic, version, rx_id, rssi, channel, noise_floor, agc_gain, fft_gain, csi_len, timestamp = header

        if magic != MAGIC or version != VERSION:
            del buf[0]
            return None

        frame_size = HEADER_SIZE + (csi_len * 2) + CHECKSUM_SIZE
        if len(buf) < frame_size:
            return None

        csi_start = HEADER_SIZE
        csi_end = csi_start + (csi_len * 2)
        csi_bytes = buf[csi_start:csi_end]
        csi = list(struct.unpack(f"<{csi_len}h", csi_bytes))

        checksum_expected = struct.unpack_from("<H", buf, csi_end)[0]
        checksum_actual = sum(buf[:csi_end]) & 0xFFFF

        if checksum_expected != checksum_actual:
            logger.warning(
                "Binary checksum mismatch expected=%d actual=%d",
                checksum_expected,
                checksum_actual,
            )
            del buf[0]
            return None

        del buf[:frame_size]

        return {
            "packet_type": "CSI_BINARY",
            "id": rx_id,
            "mac": "binary",
            "rssi": rssi,
            "channel": channel,
            "noise_floor": noise_floor,
            "agc_gain": agc_gain,
            "fft_gain": fft_gain,
            "len": csi_len,
            "local_timestamp": timestamp,
            "csi": csi,
            "schema": "binary",
        }
