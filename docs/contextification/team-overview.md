# Team Overview

> context_type: team_overview

## Scope

The right-sizing prediction engine is a feature within the Multi-Cluster
Observability stack, spanning two repositories:

- **MCO** (multicluster-observability-operator) — Hub-side operator that manages
  observability across managed OCP clusters. Owns the MCO CR API, delegation
  logic, and Policy-based resource distribution.

- **MCOA** (multicluster-observability-addon) — OCM addon that deploys
  observability components to spoke clusters via Helm charts rendered into
  ManifestWork. The prediction engine runs here on the hub.

## What This Team Is Responsible For

- Resource right-sizing recommendations for Kubernetes workloads across
  multi-cluster ACM deployments
- Forecasting future CPU/memory/GPU demand using on-cluster prediction models
- Anomaly detection for resource usage patterns
- Privacy-first architecture ensuring customer data stays within their cluster
- Integration with LLM backend for AI-assisted resource optimization

## What Is Explicitly NOT in Scope

- HPA (Horizontal Pod Autoscaler) — orthogonal concern
- Replacing VPA — this is higher-level, multi-cluster-aware
- Node-level right-sizing or cluster autoscaling
- Raw metric collection (owned by the metrics signal package)
- Thanos/Observatorium infrastructure

## How This Fits in the Broader Organization

```
ACM (Advanced Cluster Management)
  └── MCO (Multi-Cluster Observability)
        ├── Metrics collection + federation
        ├── Logging, Tracing (via MCOA)
        ├── Incident Detection (via MCOA)
        ├── Right-Sizing ← this team
        │     ├── Recording rules (namespace, virt, workload, GPU)
        │     ├── RS Agent (spoke-side automation)
        │     ├── Prediction Engine (hub-side forecasting) ← new
        │     └── LLM integration (AI-assisted)
        └── Dashboards (Grafana, Perses)
```

## Key Contacts

| Role | Area | Contact Method |
|------|------|---------------|
| Feature owner | Right-sizing overall | Project lead |
| MCO maintainers | Hub operator, API types | MCO repo OWNERS file |
| MCOA maintainers | Addon, Helm charts | MCOA repo OWNERS file |
| LLM integration | AI-assisted analysis | Observability Intelligence team |
