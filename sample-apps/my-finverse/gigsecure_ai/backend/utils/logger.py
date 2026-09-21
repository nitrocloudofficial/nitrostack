import logging
import sys

logger = logging.getLogger("GigSecureAI")
logger.setLevel(logging.INFO)

handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s')
handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(handler)
