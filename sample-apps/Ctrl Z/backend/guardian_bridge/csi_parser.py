import csv
import json
import re
from io import StringIO

from config import DEBUG
from logger_config import setup_logging

logger = setup_logging(__name__)

DATA_COLUMNS_S3 = [
    "type", "id", "mac", "rssi", "rate", "sig_mode", "mcs", "bandwidth",
    "smoothing", "not_sounding", "aggregation", "stbc", "fec_coding",
    "sgi", "noise_floor", "ampdu_cnt", "channel", "secondary_channel",
    "local_timestamp", "ant", "sig_len", "rx_format", "len", "first_word",
    "data",
]

DATA_COLUMNS_C5C6 = [
    "type", "id", "mac", "rssi", "rate", "noise_floor", "fft_gain",
    "agc_gain", "channel", "local_timestamp", "sig_len", "rx_format",
    "len", "first_word", "data",
]

SCHEMAS = {
    len(DATA_COLUMNS_S3): DATA_COLUMNS_S3,
    len(DATA_COLUMNS_C5C6): DATA_COLUMNS_C5C6,
}

MAC_PATTERN = re.compile(r"^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$")

MAX_CSI_LEN = 8192
CSI_VALUE_MIN = -(2**15)
CSI_VALUE_MAX = 2**15 - 1

_RSSI_MIN, _RSSI_MAX = -127, 0
_CHANNEL_MIN, _CHANNEL_MAX = 1, 165
_RATE_MIN, _RATE_MAX = 0, 255


class CSIParser:
    """Parse CSI_DATA lines using Espressif CSV schema with validation."""

    @staticmethod
    def _valid_int(
        value: str,
        field_name: str,
        minimum: int,
        maximum: int,
    ) -> int | None:
        try:
            number = int(value)
        except (TypeError, ValueError):
            logger.warning("%s is not an integer: %r", field_name, value)
            return None
        if number < minimum or number > maximum:
            logger.warning(
                "%s out of range %d..%d: %d",
                field_name,
                minimum,
                maximum,
                number,
            )
            return None
        return number

    @classmethod
    def _validate_csi_array(cls, raw: object) -> list[int] | None:
        if not isinstance(raw, list):
            logger.warning("CSI data is not a list")
            return None

        if not raw:
            logger.warning("Empty CSI array")
            return None

        if len(raw) > MAX_CSI_LEN:
            logger.warning(
                "CSI array too large: %d (max %d)", len(raw), MAX_CSI_LEN
            )
            return None

        csi: list[int] = []
        for value in raw:
            if isinstance(value, bool) or not isinstance(value, int):
                logger.warning("CSI value is not an integer: %r", value)
                return None
            if value < CSI_VALUE_MIN or value > CSI_VALUE_MAX:
                logger.warning(
                    "CSI value out of int16 range %d..%d: %d",
                    CSI_VALUE_MIN,
                    CSI_VALUE_MAX,
                    value,
                )
                return None
            csi.append(value)
        return csi

    @staticmethod
    def parse(line: str | bytes) -> dict | None:
        try:
            if isinstance(line, bytes):
                line = line.decode("utf-8", errors="ignore")

            line = line.strip()
            if not line.startswith("CSI_DATA"):
                return None

            reader = csv.reader(StringIO(line))
            fields = next(reader)

            schema = SCHEMAS.get(len(fields))
            if schema is None:
                logger.warning(
                    "Unexpected field count %d (expected %s)",
                    len(fields),
                    list(SCHEMAS.keys()),
                )
                return None

            if not MAC_PATTERN.match(fields[2]):
                logger.warning("Invalid MAC address: %r", fields[2])
                return None

            try:
                csi_len = int(fields[-3])
                csi_raw = json.loads(fields[-1])
            except (ValueError, json.JSONDecodeError) as exc:
                logger.warning("CSI array parse failed: %s", exc)
                return None

            if csi_len != len(csi_raw):
                logger.warning(
                    "CSI length mismatch: header=%d array=%d",
                    csi_len,
                    len(csi_raw),
                )
                return None

            csi = CSIParser._validate_csi_array(csi_raw)
            if csi is None:
                return None

            record = dict(zip(schema, fields))

            rssi = CSIParser._valid_int(record["rssi"], "rssi", _RSSI_MIN, _RSSI_MAX)
            channel = CSIParser._valid_int(
                record["channel"], "channel", _CHANNEL_MIN, _CHANNEL_MAX
            )
            rate = CSIParser._valid_int(record["rate"], "rate", _RATE_MIN, _RATE_MAX)
            if rssi is None or channel is None or rate is None:
                return None

            packet = {
                "packet_type": record["type"],
                "id": CSIParser._valid_int(record["id"], "id", 0, 2**31 - 1),
                "mac": record["mac"],
                "rssi": rssi,
                "rate": rate,
                "channel": channel,
                "noise_floor": CSIParser._valid_int(
                    record["noise_floor"], "noise_floor", -200, 200
                ),
                "sig_len": CSIParser._valid_int(
                    record["sig_len"], "sig_len", 0, MAX_CSI_LEN
                ),
                "len": CSIParser._valid_int(record["len"], "len", 0, MAX_CSI_LEN),
                "first_word": CSIParser._valid_int(
                    record["first_word"], "first_word", 0, 1
                ),
                "local_timestamp": CSIParser._valid_int(
                    record["local_timestamp"], "local_timestamp", 0, 2**63 - 1
                ),
                "csi": csi,
                "schema": "s3" if len(fields) == len(DATA_COLUMNS_S3) else "c5c6",
            }

            if any(value is None for value in packet.values()):
                logger.warning("Packet rejected: missing/out-of-range field")
                return None

            if len(fields) == len(DATA_COLUMNS_C5C6):
                packet["agc_gain"] = CSIParser._valid_int(
                    record["agc_gain"], "agc_gain", 0, 255
                )
                packet["fft_gain"] = CSIParser._valid_int(
                    record["fft_gain"], "fft_gain", -128, 127
                )
            else:
                packet["secondary_channel"] = CSIParser._valid_int(
                    record["secondary_channel"], "secondary_channel", 0, 1
                )
                packet["sig_mode"] = CSIParser._valid_int(
                    record["sig_mode"], "sig_mode", 0, 3
                )
                packet["mcs"] = CSIParser._valid_int(record["mcs"], "mcs", 0, 31)
                packet["bandwidth"] = CSIParser._valid_int(
                    record["bandwidth"], "bandwidth", 0, 3
                )

            return packet

        except Exception as exc:
            logger.error("Parser error: %s", exc, exc_info=DEBUG)
            return None
