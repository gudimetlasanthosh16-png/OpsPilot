from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

# Tool Schemas

class QueryMetricsArgs(BaseModel):
    service: str = Field(description="The name of the service to query metrics for (e.g., 'checkout-api')")
    metric_name: str = Field(description="The metric to query (e.g., 'latency', 'error_rate', 'cpu_usage')")
    duration: str = Field(description="The time window to query (e.g., '2h', '1d', '30m')")

class SearchLogsArgs(BaseModel):
    service: str = Field(description="The name of the service to search logs for")
    error_level: str = Field(description="The log level to filter by (e.g., 'ERROR', 'WARN', 'INFO')")
    keyword: Optional[str] = Field(default=None, description="Optional keyword to search within logs")

class GetDeploymentsArgs(BaseModel):
    service: str = Field(description="The name of the service to check deployments for")
    timeframe: str = Field(description="The time window to check (e.g., 'last 24 hours')")

class SearchIncidentsArgs(BaseModel):
    query: str = Field(description="Search query to find past incidents related to the current issue")

class SearchKnowledgeBaseArgs(BaseModel):
    query: str = Field(description="Search query to retrieve technical documentation, runbooks, and architectural guides. Reformulate your query if previous searches yielded no results.")

class RetrieveRunbookArgs(BaseModel):
    service: str = Field(description="The service name to fetch the runbook for")
    issue_type: str = Field(description="The type of issue (e.g., 'database_timeout', 'high_latency')")

class CreateIncidentReportArgs(BaseModel):
    root_cause: str = Field(description="The identified root cause of the incident")
    confidence: float = Field(description="Confidence percentage (0-100) of the root cause")
    evidence: List[str] = Field(description="List of evidence strings supporting the root cause")
    recommended_action: str = Field(description="The recommended action to resolve the issue")
    summary: str = Field(default="", description="A brief summary of the incident and investigation")
    recommendations: List[str] = Field(default_factory=list, description="A list of recommendations or changes to implement to prevent this in the future")

class RequestRollbackArgs(BaseModel):
    service: str = Field(description="The service to rollback")
    target_version: str = Field(description="The version to rollback to")

import operator
from typing import List, Optional, Any, Dict, Annotated, TypedDict

# State Schema
class AgentState(TypedDict):
    goal: str
    plan: Annotated[List[str], operator.add]
    observations: Annotated[List[str], operator.add]
    tool_history: Annotated[List[str], operator.add]
    hypotheses: Annotated[List[str], operator.add]
    evidence: Annotated[List[str], operator.add]
    messages: Annotated[List[Dict[str, Any]], operator.add]
    iteration_count: int
    max_iterations: int
    is_resolved: bool
    needs_approval: bool
    pending_action: Optional[Dict[str, Any]]
    final_report: Optional[str]
