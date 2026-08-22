# Blaqjaq performance harness

This directory gives Blaqjaq a reproducible production load test instead of hand-wavy performance claims.

## What it measures

The k6 scenario ramps production web delivery to 100 virtual users by default and verifies:

- fewer than 1% failed HTTP requests
- p95 response time below 750 ms
- p99 response time below 1500 ms
- more than 99% of response checks pass
- the deployed document still contains the React app mount point

These thresholds are intentionally about the production delivery path. They do not pretend that HTTP load testing proves WebGL frame rate or blackjack-engine correctness. Those concerns remain covered by browser profiling and the unit/integration suite.

## Run with Grafana locally

From the repository root:

```bash
cd performance
docker compose up -d influxdb grafana
docker compose run --rm k6
```

Open Grafana at `http://localhost:3000` and select the **Blaqjaq · k6 production load** dashboard. Grafana's default local credentials are `admin` / `admin` unless you override them.

To test a different deployment or concurrency level:

```bash
BASE_URL=http://host.docker.internal:4173 MAX_VUS=150 docker compose run --rm k6
```

For a local Vite preview, run `npm run build && npm run preview -- --host 0.0.0.0` in another terminal first.

When finished:

```bash
docker compose down
```

Use `docker compose down -v` if you also want to discard the local Grafana and InfluxDB data volumes.

## CI evidence

`.github/workflows/performance.yml` runs the same k6 scenario against the live deployment and uploads the raw k6 summary as a workflow artifact. That artifact is the source of truth for any latency, throughput, or error-rate number quoted in the portfolio.

Do not copy a number into the portfolio until it appears in a completed run artifact. That keeps the case study defensible.
