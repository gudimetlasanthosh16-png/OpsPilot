import unittest
from opspilot.tool_registry import ToolRegistry, registry

class TestToolRegistry(unittest.TestCase):
    def test_global_registry_populated(self):
        tools = ["query_metrics", "search_logs", "get_deployments", "search_incidents", "retrieve_runbook", "create_incident_report", "request_rollback"]
        for tool in tools:
            func = registry.get_tool(tool)
            self.assertIsNotNone(func, f"Tool '{tool}' was not registered in global registry.")

    def test_custom_registry_execution(self):
        reg = ToolRegistry()
        reg.register("dummy_tool", lambda x: f"hello {x}")
        res = reg.execute("dummy_tool", x="world")
        self.assertEqual(res, "hello world")

    def test_nonexistent_tool_execution(self):
        reg = ToolRegistry()
        res = reg.execute("unknown_tool")
        self.assertTrue("not found" in res.lower())

if __name__ == "__main__":
    unittest.main()
