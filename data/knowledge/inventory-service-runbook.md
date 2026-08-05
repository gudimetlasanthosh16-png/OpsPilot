# Inventory Service Runbook

## Service Overview
The Inventory Service manages real-time stock levels, warehouse availability, and item reservation during checkout.

## Common Incidents & Diagnostic Workflows

### 1. Memory Leak & OOM Kills
**Symptoms:**
- `inventory-service` pods crashing frequently (`OOMKilled`, exit code 137).
- Pod restart count steadily rising.
- Latency and HTTP 500 error spikes preceding pod restarts.
- Metrics show container memory usage reaching 100% limit continuously over 1-2 hours.

**Diagnosis:**
1. Check metrics for `inventory-service` container memory consumption.
2. Search logs for `OutOfMemoryError`, `heap dump`, or `pod restarted due to OOM`.
3. Check deployment history to verify if version `inventory-v1.8` or recent release introduced non-garbage-collected caching buffers.

**Recommended Actions:**
1. Request an immediate rollback of `inventory-service` to previous stable release (e.g. `inventory-v1.7`).
2. Temporarily increase Kubernetes pod memory limits from 512Mi to 2Gi to stabilize existing instances while investigating memory heap allocation.
