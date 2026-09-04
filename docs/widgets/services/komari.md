---
title: Komari
description: Komari Probe Widget Configuration
---

Learn more about [Komari](https://github.com/komari-monitor/komari).

The widget supports two modes:

1. **Cluster Overview**: Overview of all probe nodes when `nodeId` is omitted.
2. **Single Node Monitoring**: Real-time telemetry (CPU, RAM, Disk, Network) for a specific server when `nodeId` is specified.

The `nodeId` can be the node's `uuid` or its `name`.

### Allowed Fields

- **Cluster Overview**: `["nodes", "online", "offline", "cores", "memory", "disk"]` (default: `["nodes", "online"]`)
- **Single Node**: `["name", "status", "cpu", "memory", "disk", "network", "network_up", "network_down", "uptime"]` (default: `["name", "status", "cpu", "memory"]`)

### Public Mode (No Authentication)

```yaml
widget:
  type: komari
  url: http://komari.local:8080
  nodeId: "Tokyo-Node-01" # Optional. Remove for cluster overview
```

### Private Mode (API Key Authentication)

```yaml
widget:
  type: komari
  url: https://komari.example.com
  key: your_komari_api_key
  nodeId: "c0a801-9f82-4e31-bc6a" # Optional. Remove for cluster overview
  fields: ["cpu", "memory", "disk", "network"]
```
