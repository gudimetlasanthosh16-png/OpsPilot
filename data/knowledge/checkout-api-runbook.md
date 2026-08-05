# Checkout API Runbook

## Overview
The Checkout API is responsible for processing final orders. It depends heavily on the Primary Transaction Database.

## Known Issues

### 1. Database Retry Storm
**Symptoms:** 
- Latency spike on the `/checkout` endpoint.
- Database timeout logs (`ERROR: connection timeout`).
- Often occurs shortly after a new deployment if connection pooling is misconfigured.

**Diagnosis:**
If the latency increases immediately after a deployment and database timeouts are observed in the Splunk logs, it is highly likely that the new version introduced aggressive retry logic causing a connection pool exhaustion (retry storm).

**Recommended Action:**
1. Rollback the deployment to the previous stable version immediately to relieve database pressure.
2. Investigate the connection pool configuration in the newly deployed code.

### 2. Payment Gateway Timeout
**Symptoms:**
- Latency spikes on `/checkout/pay`
- Logs show `Gateway timeout` from external payment provider (e.g. Stripe).

**Diagnosis:**
This is usually an external provider issue. 

**Recommended Action:**
1. Do NOT rollback.
2. Update the status page and wait for the provider to resolve the issue.
