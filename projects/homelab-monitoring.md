> **Sample entry.** Replace this with your own setup. Before publishing, remove or change real IP addresses, hostnames, domains and anything that reveals how your network is laid out. The addresses below come from a documentation-only range (192.0.2.0/24).

## Summary

I wanted to know what my homelab was doing without logging in to check. The result is a small monitoring stack: Prometheus collects metrics, Grafana shows them, and Fail2ban reacts to repeated failed logins by blocking the source address.

## Goals

- See CPU, memory, disk and network use across every host on one dashboard
- Get an alert when something is wrong, and only when it matters
- Automatically block repeated failed SSH logins
- Keep the monitoring tools themselves off the public internet

## Architecture

![Monitoring architecture: exporters feed Prometheus, which feeds Grafana and alerts; Fail2ban reads logs and blocks addresses.](images/diagram-homelab.svg)

Each host runs an exporter that publishes metrics. Prometheus pulls them on a schedule and stores them. Grafana reads from Prometheus to draw dashboards, and Prometheus rules decide when to raise an alert. Fail2ban watches authentication logs on each host and adds a firewall rule when a source fails too often.

## Configuration

Prometheus scrape targets (addresses are examples):

```yaml
scrape_configs:
  - job_name: "nodes"
    scrape_interval: 30s
    static_configs:
      - targets: ["192.0.2.10:9100", "192.0.2.11:9100"]
```

A Fail2ban jail for SSH:

```ini
[sshd]
enabled  = true
maxretry = 5
findtime = 10m
bantime  = 1h
```

## Risks I considered

| Risk | Control |
| --- | --- |
| Dashboards exposed to the internet | Reachable only over a VPN, never port-forwarded |
| Default Grafana credentials | Changed on first login, unique password stored in a password manager |
| Fail2ban locking me out | Home network added to the ignore list, console access kept as a fallback |
| Metrics revealing the network layout | Exporters bind to the internal interface only |

## What I learned

- **Alert fatigue is real.** My first rules fired constantly. I cut them down to conditions I would actually act on, such as a disk filling up or a host going silent.
- **Detection and response are different jobs.** Grafana shows me what happened. Fail2ban acts without asking. Each needs its own review.
- **Monitoring is also a control.** Being able to show that logs are collected and reviewed is the kind of evidence an auditor asks for.

## Next steps

- Ship logs to a central place and keep them for a defined period
- Write a one-page runbook for the three alerts that matter most
