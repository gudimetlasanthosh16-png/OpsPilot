import json
import random

services = ["checkout-api", "payment-gateway", "inventory-service", "user-auth"]
issues = ["high latency", "500 errors", "crashing", "timeout", "OOM errors"]

scenarios = []

# checkout-api is usually database index issue
for i in range(10):
    scenarios.append({
        "id": f"scen_{i+1}",
        "incident": f"The checkout-api is experiencing {random.choice(issues)}. Please investigate.",
        "expected_root_cause": "Database index missing"
    })

# payment-gateway is usually 3rd party timeout
for i in range(10):
    scenarios.append({
        "id": f"scen_{i+11}",
        "incident": f"Alert: payment-gateway has {random.choice(issues)} over the last hour.",
        "expected_root_cause": "Third-party payment provider timeout"
    })

# inventory-service is usually OOM
for i in range(10):
    scenarios.append({
        "id": f"scen_{i+21}",
        "incident": f"inventory-service pods are {random.choice(issues)} and restarting frequently.",
        "expected_root_cause": "Memory leak"
    })

with open("c:/Users/mamat/petersmark-projects/opspilot/eval_scenarios.json", "w") as f:
    json.dump(scenarios, f, indent=4)
print("eval_scenarios.json generated with 30 scenarios.")
