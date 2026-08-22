import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'https://blaqjaq.vercel.app').replace(/\/$/, '');
const MAX_VUS = Number.parseInt(__ENV.MAX_VUS || '100', 10);

const responseStatus = new Counter('http_response_status');
const status200 = new Counter('http_response_status_200');
const status403 = new Counter('http_response_status_403');
const status429 = new Counter('http_response_status_429');
const status5xx = new Counter('http_response_status_5xx');
const statusOther = new Counter('http_response_status_other');

export const options = {
  scenarios: {
    production_web_delivery: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: Math.max(5, Math.round(MAX_VUS * 0.1)) },
        { duration: '30s', target: Math.max(10, Math.round(MAX_VUS * 0.5)) },
        { duration: '60s', target: MAX_VUS },
        { duration: '60s', target: MAX_VUS },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
      tags: { surface: 'production-web' },
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
};

function recordResponseStatus(status) {
  responseStatus.add(1, { status: String(status) });

  if (status === 200) {
    status200.add(1);
  } else if (status === 403) {
    status403.add(1);
  } else if (status === 429) {
    status429.add(1);
  } else if (status >= 500 && status < 600) {
    status5xx.add(1);
  } else {
    statusOther.add(1);
  }
}

export default function () {
  const response = http.get(`${BASE_URL}/`, {
    tags: { name: 'GET /' },
    headers: {
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  recordResponseStatus(response.status);

  check(response, {
    'root returns 200': (res) => res.status === 200,
    'root returns HTML': (res) => String(res.headers['Content-Type'] || '').includes('text/html'),
    'root contains app mount': (res) => res.body.includes('id="root"'),
  });

  sleep(0.5 + Math.random());
}

function metricCount(metrics, name) {
  return metrics[name]?.values?.count ?? 0;
}

function formatCount(value) {
  return Number(value).toLocaleString('en-US');
}

function formatRate(value) {
  return value == null ? 'n/a' : `${(value * 100).toFixed(2)}%`;
}

function formatMs(value) {
  return value == null ? 'n/a' : `${value.toFixed(2)} ms`;
}

export function handleSummary(data) {
  const metrics = data.metrics || {};
  const duration = metrics.http_req_duration?.values || {};
  const requests = metrics.http_reqs?.values || {};
  const failed = metrics.http_req_failed?.values || {};
  const checks = metrics.checks?.values || {};

  const thresholdResults = Object.values(metrics)
    .flatMap((metric) => Object.values(metric.thresholds || {}));
  const failedThresholds = thresholdResults.filter((threshold) => !threshold.ok).length;

  const statusSummary = [
    ['200', metricCount(metrics, 'http_response_status_200')],
    ['403', metricCount(metrics, 'http_response_status_403')],
    ['429', metricCount(metrics, 'http_response_status_429')],
    ['5xx', metricCount(metrics, 'http_response_status_5xx')],
    ['other / network', metricCount(metrics, 'http_response_status_other')],
  ];

  const lines = [
    '',
    '█ RESPONSE STATUS SUMMARY',
    '',
    ...statusSummary.map(([label, count]) => `  ${label.padEnd(16)} ${formatCount(count)}`),
    '',
    '█ DELIVERY SUMMARY',
    '',
    `  requests            ${formatCount(requests.count || 0)}`,
    `  request failures    ${formatRate(failed.rate)}`,
    `  checks passed       ${formatRate(checks.rate)}`,
    `  p95 / p99 latency   ${formatMs(duration['p(95)'])} / ${formatMs(duration['p(99)'])}`,
    `  thresholds          ${failedThresholds === 0 ? 'PASS' : `FAILED (${failedThresholds}/${thresholdResults.length})`}`,
    '',
    '  Exact per-code counts are available in Grafana via http_response_status.',
    '',
  ];

  return { stdout: lines.join('\n') };
}
