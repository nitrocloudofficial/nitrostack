import time
import random
import re
from typing import Callable, Any

def safe_llm_call(func: Callable[[], Any], max_retries: int = 5, base_delay: float = 5.0) -> Any:
    """
    Executes an LLM call with smart retry logic:
    1. Extracts 'Please retry in X s' from error message and waits X+1 seconds.
    2. Falls back to exponential backoff if no specific time is found.
    """
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                if attempt == max_retries - 1:
                    raise e
                
                # Check for explicit retry time in error message
                # Pattern: "Please retry in 56.360130679s."
                match = re.search(r"retry in (\d+(\.\d+)?)s", error_str)
                if match:
                    wait_time = float(match.group(1)) + 1.0 # Add 1s buffer
                    print(f"Rate limit hit. Server requested wait. Sleeping for {wait_time:.2f}s...")
                    time.sleep(wait_time)
                    continue

                # Fallback to exponential backoff
                delay = (base_delay * (2 ** attempt)) + random.uniform(0, 1)
                print(f"Rate limit hit. Retrying in {delay:.2f}s... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
            else:
                raise e
