import logging
import time

from fastapi import Request

logger = logging.getLogger("aeios-api")


async def logging_middleware(request: Request, call_next):

    start = time.time()

    response = await call_next(request)

    elapsed = time.time() - start

    logger.info(
        "%s %s %.3fs",
        request.method,
        request.url.path,
        elapsed,
    )

    return response