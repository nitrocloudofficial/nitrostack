from runtime import GuardianRuntime
from logger_config import setup_logging

logger = setup_logging(__name__)


def main():
    runtime = GuardianRuntime()
    runtime.start("../../datasets/raw/test_session.jsonl")

    logger.info("Guardian Bridge running. Press Ctrl+C to stop.")

    try:
        while True:
            import time
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Stopping Guardian Bridge...")
    finally:
        runtime.stop()


if __name__ == "__main__":
    main()
