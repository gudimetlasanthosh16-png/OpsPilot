import unittest
import json
from opspilot import mock_tools
from opspilot.schemas import (
    QueryMetricsArgs, SearchLogsArgs, GetDeploymentsArgs,
    SearchIncidentsArgs, RetrieveRunbookArgs, CreateIncidentReportArgs,
    RequestRollbackArgs
)

class TestMockToolsAndSchemas(unittest.TestCase):
    def test_query_metrics(self):
        # Validate Pydantic schema
        args = QueryMetricsArgs(service="checkout-api", metric_name="latency", duration="2h")
        res_str = mock_tools.query_metrics(args.service, args.metric_name, args.duration)
        data = json.loads(res_str)
        self.assertEqual(data["service"], "checkout-api")
        self.assertEqual(data["status"], "critical")

    def test_search_logs(self):
        args = SearchLogsArgs(service="checkout-api", error_level="ERROR")
        res_str = mock_tools.search_logs(args.service, args.error_level)
        data = json.loads(res_str)
        self.assertTrue(isinstance(data, list))
        self.assertTrue(any("Database query timeout" in item.get("message", "") for item in data if isinstance(item, dict)))

    def test_get_deployments(self):
        args = GetDeploymentsArgs(service="checkout-api", timeframe="2 hours ago")
        res_str = mock_tools.get_deployments(args.service, args.timeframe)
        data = json.loads(res_str)
        self.assertTrue(len(data) > 0)
        self.assertEqual(data[0]["version"], "checkout-v2.4")

    def test_search_incidents(self):
        args = SearchIncidentsArgs(query="checkout database timeout")
        res_str = mock_tools.search_incidents(args.query)
        data = json.loads(res_str)
        self.assertTrue(any(item["incident_id"] == "INC-104" for item in data))

    def test_retrieve_runbook(self):
        args = RetrieveRunbookArgs(service="payment-gateway", issue_type="timeout")
        res_str = mock_tools.retrieve_runbook(args.service, args.issue_type)
        data = json.loads(res_str)
        self.assertEqual(data["service"], "payment-gateway")
        self.assertTrue(len(data["runbook_steps"]) > 0)

    def test_create_incident_report(self):
        args = CreateIncidentReportArgs(
            root_cause="Missing DB index",
            confidence=95.0,
            evidence=["Timeout logs increased 420%"],
            recommended_action="Roll back checkout release",
            summary="DB index missing",
            recommendations=["Add DB index"]
        )
        res_str = mock_tools.create_incident_report(
            args.root_cause, args.confidence, args.evidence,
            args.recommended_action, args.summary, args.recommendations
        )
        data = json.loads(res_str)
        self.assertEqual(data["status"], "Report generated")
        self.assertEqual(data["report"]["root_cause"], "Missing DB index")

    def test_request_rollback(self):
        args = RequestRollbackArgs(service="checkout-api", target_version="checkout-v2.3")
        res_str = mock_tools.request_rollback(args.service, args.target_version)
        data = json.loads(res_str)
        self.assertEqual(data["status"], "PENDING_APPROVAL")
        self.assertEqual(data["action"], "rollback")

if __name__ == "__main__":
    unittest.main()
