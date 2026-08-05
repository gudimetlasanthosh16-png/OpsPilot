import json

def query_metrics(service: str, metric_name: str, duration: str) -> str:
    """Mock querying metrics from a system like Datadog/Prometheus."""
    srv = service.lower()
    met = metric_name.lower()
    
    if "checkout" in srv:
        if "memory" in met or "oom" in met:
            return json.dumps({"service": service, "metric": metric_name, "status": "critical", "value": "94% memory usage", "normal_value": "40%", "start_time": "2 hours ago"})
        return json.dumps({"service": service, "metric": metric_name, "status": "critical", "value": "2000ms latency / 15% error rate", "normal_value": "50ms / 0.1%", "start_time": "2 hours ago"})
        
    elif "payment" in srv:
        return json.dumps({"service": service, "metric": metric_name, "status": "critical", "value": "5000ms external latency / 25% error rate", "normal_value": "120ms / 0.01%", "start_time": "1 hour ago"})
        
    elif "inventory" in srv:
        return json.dumps({"service": service, "metric": metric_name, "status": "critical", "value": "99% memory usage / 14 pod restarts (OOMKilled)", "normal_value": "45% memory / 0 restarts", "start_time": "3 hours ago"})
        
    return json.dumps({"service": service, "metric": metric_name, "status": "ok", "value": "normal"})

def search_logs(service: str, error_level: str, keyword: str = None) -> str:
    """Mock searching logs in a system like Splunk/Datadog."""
    srv = service.lower()
    
    if "checkout" in srv:
        return json.dumps([
            {"timestamp": "2023-10-27T14:14:00Z", "level": "ERROR", "message": "Database query timeout connecting to user_db. Missing database index on transaction_logs table causing table scan."},
            {"timestamp": "2023-10-27T14:14:05Z", "level": "ERROR", "message": "Database retry 2 failed after 3000ms timeout."},
            {"summary": "420% increase in database timeout errors in the last 2 hours. Missing database index identified as primary root cause."}
        ])
        
    elif "payment" in srv:
        return json.dumps([
            {"timestamp": "2023-10-27T15:00:00Z", "level": "ERROR", "message": "Third-party payment provider timeout connecting to external vendor API."},
            {"timestamp": "2023-10-27T15:05:00Z", "level": "ERROR", "message": "HTTP 504 Gateway Timeout from upstream third-party payment gateway."},
            {"summary": "High failure rate due to third-party payment provider timeout."}
        ])
        
    elif "inventory" in srv:
        return json.dumps([
            {"timestamp": "2023-10-27T13:30:00Z", "level": "ERROR", "message": "java.lang.OutOfMemoryError: Java heap space in inventory buffer cache."},
            {"timestamp": "2023-10-27T13:31:00Z", "level": "FATAL", "message": "Pod inventory-service-7f89d terminated due to OOMKilled (exit code 137)."},
            {"summary": "Severe memory leak in inventory cache causing pod crashloop and OOM errors."}
        ])
        
    return json.dumps({"logs": [], "message": "No anomalous logs found."})

def get_deployments(service: str, timeframe: str) -> str:
    """Mock retrieving deployment history."""
    srv = service.lower()
    
    if "checkout" in srv:
        return json.dumps([
            {"version": "checkout-v2.4", "deployed_at": "2 hours ago", "status": "success", "author": "dev-team", "changes": "Added retry logic for DB queries"}
        ])
    elif "inventory" in srv:
        return json.dumps([
            {"version": "inventory-v1.8", "deployed_at": "3 hours ago", "status": "success", "author": "inventory-team", "changes": "Introduced in-memory item caching"}
        ])
    elif "payment" in srv:
        return json.dumps([
            {"version": "payment-v1.2", "deployed_at": "5 days ago", "status": "success", "author": "payments-team", "changes": "Minor maintenance patch"}
        ])
        
    return json.dumps([])

def search_incidents(query: str) -> str:
    """Mock searching historical incidents."""
    q = query.lower()
    
    if "checkout" in q or "database" in q or "index" in q:
        return json.dumps([
            {"incident_id": "INC-104", "description": "Database timeout due to missing database index on checkout transaction logs.", "resolution": "Added missing index on transaction_id column."}
        ])
    elif "payment" in q or "provider" in q or "vendor" in q:
        return json.dumps([
            {"incident_id": "INC-208", "description": "Surge in 500 errors caused by third-party payment provider timeout.", "resolution": "Monitored external vendor status until third-party provider resolved upstream outage."}
        ])
    elif "inventory" in q or "memory" in q or "oom" in q:
        return json.dumps([
            {"incident_id": "INC-312", "description": "Pod crash loops caused by memory leak in inventory service buffer.", "resolution": "Rolled back inventory-service to v1.7."}
        ])
        
    return json.dumps([
        {"incident_id": "INC-100", "description": "General service latency spike.", "resolution": "Scaled up replica count."}
    ])

def retrieve_runbook(service: str, issue_type: str) -> str:
    """Mock retrieving a runbook for a service."""
    srv = service.lower()
    
    if "payment" in srv:
        return json.dumps({
            "service": service,
            "runbook_steps": [
                "1. Confirm if failure is due to external vendor API.",
                "2. If Third-party payment provider timeout is detected with no recent deployments, do NOT rollback.",
                "3. Notify operational channels and monitor vendor status page."
            ]
        })
    elif "inventory" in srv:
        return json.dumps({
            "service": service,
            "runbook_steps": [
                "1. Check pod restart count and memory usage metrics.",
                "2. If Memory leak or OOMKilled crashes occur after deployment, trigger rollback to previous stable release.",
                "3. Increase pod memory allocation as temporary mitigation."
            ]
        })
        
    return json.dumps({
        "service": service,
        "runbook_steps": [
            "1. Verify if recent deployments introduced query changes.",
            "2. Check database index status and query execution plans.",
            "3. If database index missing causes database timeout, add required database index and rollback unindexed release."
        ]
    })

def create_incident_report(root_cause: str, confidence: float, evidence: list, recommended_action: str, summary: str = "", recommendations: list = None) -> str:
    """Creates a structured incident report and sets it in the agent state."""
    if recommendations is None:
        recommendations = []
    return json.dumps({
        "status": "Report generated",
        "report": {
            "root_cause": root_cause,
            "confidence": f"{confidence}%" if not str(confidence).endswith("%") else str(confidence),
            "evidence": evidence,
            "recommended_action": recommended_action,
            "summary": summary or f"Investigation concluded with root cause: {root_cause}",
            "recommendations": recommendations or ["Monitor service health metrics post resolution."]
        }
    })

def request_rollback(service: str, target_version: str) -> str:
    """Mock requesting a rollback (requires human approval)."""
    return json.dumps({
        "status": "PENDING_APPROVAL",
        "action": "rollback",
        "service": service,
        "target_version": target_version
    })
