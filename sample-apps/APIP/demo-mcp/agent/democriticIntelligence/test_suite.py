"""
Comprehensive Dynamic Automated Test Suite for Universal Director
Calculates assertion counts on-the-fly dynamically based on target features.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from qa_agent_runner import DynamicQAAgent


def run_dynamic_test_suite():
    anim_dir = os.path.join(os.path.dirname(__file__), "animation")
    qa_agent = DynamicQAAgent(animation_dir=anim_dir)
    
    # Run dynamic assertion engine across all HTML targets
    results = qa_agent.run_suite()
    
    return results["failed_assertions"] == 0


if __name__ == "__main__":
    success = run_dynamic_test_suite()
    sys.exit(0 if success else 1)
