import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const health = http.get('http://localhost:3000/health');
  check(health, { 'health is 200': (r) => r.status === 200 });
  sleep(1);
}
