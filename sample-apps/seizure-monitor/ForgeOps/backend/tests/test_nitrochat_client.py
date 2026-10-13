"""Regression tests for resilient NitroChat JSON responses and retries."""

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.llm.nitrochat_client import NitroChatClient, _parse_json_object


class _FakeResponse:
    def __init__(self, content):
        self.content = content

    def raise_for_status(self):
        return None

    def json(self):
        return {"message": {"content": self.content}}


class TestNitroChatParsing(unittest.TestCase):
    def test_repairs_trailing_commas_and_prose(self):
        parsed = _parse_json_object(
            'Result follows: {"tool_names": ["get_timeline",], "research_goal": "verify",}'
        )
        self.assertEqual(parsed["tool_names"], ["get_timeline"])

    def test_accepts_python_style_object(self):
        parsed = _parse_json_object(
            "{'tool_names': ['get_causal_graph'], 'research_goal': 'trace cause'}"
        )
        self.assertEqual(parsed["research_goal"], "trace cause")

    @patch("backend.llm.nitrochat_client.time.sleep")
    @patch("backend.llm.nitrochat_client.httpx.post")
    def test_retries_after_invalid_json(self, post, _sleep):
        post.side_effect = [
            _FakeResponse("This response is not JSON."),
            _FakeResponse(
                '{"tool_names":["get_timeline"],"research_goal":"verify timeline"}'
            ),
        ]
        client = NitroChatClient(
            endpoint="https://example.invalid/api/chat",
            enabled=True,
            max_attempts=2,
        )

        result = client.complete_json(
            agent="Research",
            system_prompt="Return tool selection JSON.",
            payload={"query": "verify"},
        )

        self.assertTrue(result.live)
        self.assertEqual(result.attempts, 2)
        self.assertEqual(result.data["tool_names"], ["get_timeline"])
        self.assertEqual(post.call_count, 2)


if __name__ == "__main__":
    unittest.main()
