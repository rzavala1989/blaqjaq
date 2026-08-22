import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'https://blaqjaq.vercel.app').replace(/\/$/, '');
const MAX_VUS = Number.parseInt(__ENV.MAX_VUS || '100', 10);

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
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const response = http.get(`${BASE_URL}/`, {
    tags: { name: 'GET /' },
    headers: {
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  check(response, {
    'root returns 200': (res) => res.status === 200,
    'root returns HTML': (res) => String(res.headers['Content-Type'] || '').includes('text/html'),
    'root contains app mount': (res) => res.body.includes('id="root"'),
  });

  sleep(0.5 + Math.random());
}
