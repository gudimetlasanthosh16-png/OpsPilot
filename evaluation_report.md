# OpsPilot Benchmark & Evaluation Report

**Total Scenarios Evaluated:** 30
**Overall Investigation Success Rate:** 76.7%

## Mandatory Evaluation Framework Metrics
| Evaluation Metric | Value | Target Benchmark |
|---|---|---|
| Tool Selection Accuracy | **100.0%** | > 90% |
| Tool Argument Accuracy | **100.0%** | > 90% |
| Investigation Success Rate | **76.7%** | > 85% |
| Root-Cause Accuracy | **76.7%** | > 85% |
| Average Tool Calls | **9.97 calls/incident** | 3 - 5 calls |
| Unnecessary Call Rate | **30.8%** | < 5% |
| Loop Completion Rate | **100.0%** | 100% |
| Evidence Groundedness | **76.7%** | > 90% |

## Failure Mode Analysis
### Scenario ID: scen_13
- **Incident Prompt:** `Alert: payment-gateway has OOM errors over the last hour.`
- **Expected Cause:** Third-party payment provider timeout
- **Actual Diagnosis:** argument of type 'NoneType' is not iterable
- **Failure Classification:** Exception during execution

### Scenario ID: scen_14
- **Incident Prompt:** `Alert: payment-gateway has OOM errors over the last hour.`
- **Expected Cause:** Third-party payment provider timeout
- **Actual Diagnosis:** argument of type 'NoneType' is not iterable
- **Failure Classification:** Exception during execution

### Scenario ID: scen_15
- **Incident Prompt:** `Alert: payment-gateway has OOM errors over the last hour.`
- **Expected Cause:** Third-party payment provider timeout
- **Actual Diagnosis:** argument of type 'NoneType' is not iterable
- **Failure Classification:** Exception during execution

### Scenario ID: scen_21
- **Incident Prompt:** `inventory-service pods are 500 errors and restarting frequently.`
- **Expected Cause:** Memory leak
- **Actual Diagnosis:** System Error: All free models have exceeded their rate limits.
- **Failure Classification:** Root cause mismatch or unresolved state

### Scenario ID: scen_22
- **Incident Prompt:** `inventory-service pods are 500 errors and restarting frequently.`
- **Expected Cause:** Memory leak
- **Actual Diagnosis:** argument of type 'NoneType' is not iterable
- **Failure Classification:** Exception during execution

### Scenario ID: scen_23
- **Incident Prompt:** `inventory-service pods are timeout and restarting frequently.`
- **Expected Cause:** Memory leak
- **Actual Diagnosis:** System Error: All free models have exceeded their rate limits.
- **Failure Classification:** Root cause mismatch or unresolved state

### Scenario ID: scen_24
- **Incident Prompt:** `inventory-service pods are OOM errors and restarting frequently.`
- **Expected Cause:** Memory leak
- **Actual Diagnosis:** System Error: All free models have exceeded their rate limits.
- **Failure Classification:** Root cause mismatch or unresolved state

