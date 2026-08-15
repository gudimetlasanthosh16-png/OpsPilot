import unittest
import os
import json
from unittest.mock import MagicMock, patch
from opspilot.agent import OpsPilotAgent

class TestAgentStateAndControl(unittest.TestCase):
    def setUp(self):
        # Set dummy env key so initialization doesn't throw ValueError
        os.environ["OPENAI_API_KEY"] = "sk-test-key-12345"

    def test_agent_initialization(self):
        agent = OpsPilotAgent()
        self.assertIsNotNone(agent.client)
        self.assertTrue(len(agent.tools) >= 7)

    def test_tools_node_duplicate_call_detection(self):
        agent = OpsPilotAgent()
        state = {
            "messages": [{
                "role": "assistant",
                "tool_calls": [{
                    "id": "tc1",
                    "type": "function",
                    "function": {"name": "query_metrics", "arguments": '{"service": "checkout-api", "metric_name": "latency", "duration": "2h"}'}
                }]
            }],
            "tool_history": [
                "query_metrics({'service': 'checkout-api', 'metric_name': 'latency', 'duration': '2h'})",
                "query_metrics({'service': 'checkout-api', 'metric_name': 'latency', 'duration': '2h'})"
            ]
        }
        res = agent.tools_node(state)
        self.assertFalse(res.get("is_resolved"))
        self.assertTrue("aborted" in res.get("final_report", "").lower())

    def test_tools_node_rollback_approval_trigger(self):
        agent = OpsPilotAgent()
        state = {
            "messages": [{
                "role": "assistant",
                "tool_calls": [{
                    "id": "tc2",
                    "type": "function",
                    "function": {"name": "request_rollback", "arguments": '{"service": "checkout-api", "target_version": "v2.3"}'}
                }]
            }],
            "tool_history": []
        }
        res = agent.tools_node(state)
        self.assertTrue(res.get("needs_approval"))
        self.assertEqual(res.get("pending_action")["tool"], "request_rollback")

if __name__ == "__main__":
    unittest.main()
