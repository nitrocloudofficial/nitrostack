import re

from config import DEBUG
from logger_config import setup_logging

logger = setup_logging(__name__)

CSI_DATA_PREFIX = "CSI_DATA"
MAX_LINE_LENGTH = 65536

# A CSI array opening (optional whitespace, then int or negative int)
CSI_ARRAY_PATTERN = re.compile(r"\[\s*-?\d+")
# Optional trailing quote because the firmware emits the field as "[...]"
BRACKET_BALANCED_PATTERN = re.compile(r"^[^\[]*\[[^\[\]]*\]\"?\s*$")


class PacketValidator:
    """Validate raw serial lines before parsing."""

    @staticmethod
    def is_valid_ascii(line: str) -> bool:
        if not line:
            return False

        if len(line) > MAX_LINE_LENGTH:
            logger.warning("CSI line exceeds %d bytes, dropping", MAX_LINE_LENGTH)
            return False

        if not line.startswith(CSI_DATA_PREFIX):
            return False

        if not CSI_ARRAY_PATTERN.search(line):
            logger.debug("Missing CSI array in line")
            return False

        if not BRACKET_BALANCED_PATTERN.match(line):
            logger.debug("Malformed bracket structure in CSI line")
            return False

        return True

    @staticmethod
    def is_valid(line: str) -> bool:
        return PacketValidator.is_valid_ascii(line)
