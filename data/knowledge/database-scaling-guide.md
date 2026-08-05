# Database Scaling Guide

## Overview
This document covers the architectural limitations of the Primary Transaction Database.

## Connections
The database can support a maximum of 5000 concurrent connections. If a microservice deploys code that opens a large number of connections (e.g. infinite retry loops or increased pool sizes), it will starve other services and result in widespread latency.

Always ensure connection timeouts are set to no more than 500ms for read-heavy operations, and 2000ms for write-heavy operations.
