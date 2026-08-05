# Payment Gateway Service Runbook

## Service Overview
The Payment Gateway Service handles external payment processing, credit card authorisations, and third-party vendor integrations (Stripe/PayPal/Adyen).

## Common Incidents & Diagnostic Workflows

### 1. Third-Party Provider Timeouts & Outages
**Symptoms:**
- High latency, HTTP 500/504 errors, or connection resets on `payment-gateway` service.
- Log entries: `ERROR: Third-party payment provider timeout after 3000ms`, `upstream gateway failure`.
- High memory usage / thread pool starvation due to backing up async requests waiting on third-party responses.

**Diagnosis:**
1. Search logs for external vendor endpoints or keyword `payment provider`.
2. Check if recent deployments occurred. If no recent code changes occurred, the root cause is external API degradation.

**Recommended Actions:**
- Switch to secondary payment provider fallback circuit breaker if enabled.
- Notify customer operations and monitor third-party API status page. Do NOT trigger a service rollback if no recent code deployment was made.

### 2. Missing Database Index on Transaction Logs
**Symptoms:**
- Slow transaction lookup queries during checkout verification.
- Logs show slow query execution (>5000ms) on `payment_transactions` table.

**Recommended Actions:**
- Apply database migration to add index on `transaction_id` and `user_id`.
