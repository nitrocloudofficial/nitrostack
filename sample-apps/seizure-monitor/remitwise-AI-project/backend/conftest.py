"""
pytest configuration for RemitWise AI backend tests.

This conftest.py ensures the backend root is on sys.path so that
both the existing tests and the new agent tests can import modules
correctly, regardless of how pytest is invoked.
"""

import sys
import os

# Add the backend root directory (parent of tests/) to sys.path
_BACKEND_ROOT = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)
