// Shared bits for all k6 scripts: target, test users, load profiles, and the
// user flows (read / write / login) that the scripts combine.

import http from 'k6/http';
import { check, fail } from 'k6';

// k6 runs in Docker, so the backend on the host is host.docker.internal
export const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8080';
const PASSWORD = 'loadtest123';

// Must match loadtest/seed.js
const EMAILS = [
  ...Array.from({ length: 200 }, (_, i) => `lt-user-${String(i + 1).padStart(3, '0')}@jobflow.test`),
  ...Array.from({ length: 5 }, (_, i) => `lt-heavy-${i + 1}@jobflow.test`),
];

const STATUSES = ['APPLIED', 'IN_REVIEW', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED'];
const KEYWORDS = ['Engineer', 'Backend', 'Data', 'Developer'];

// Pass/fail line for "the system is still keeping up". Filtered to the main
// scenario so the setup() logins don't count toward the results.
const THRESHOLDS = {
  'http_req_failed{scenario:main}': ['rate<0.01'],
  'http_req_duration{scenario:main}': ['p(95)<500'],
};

// Load shapes, picked with -e PROFILE=... Rates are iterations per second.
// Only smoke for now; load / stress / spike get tuned in step 4.
const PROFILES = {
  smoke: {
    executor: 'constant-arrival-rate',
    rate: 1,
    timeUnit: '1s',
    duration: '30s',
    preAllocatedVUs: 5,
    maxVUs: 10,
  },
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Builds k6 options for the chosen profile. `endpoints` are the request names the
// script uses, so the summary shows p95 per endpoint, not just the overall number.
export function buildOptions(endpoints) {
  const profileName = __ENV.PROFILE || 'smoke';
  const profile = PROFILES[profileName];
  if (!profile) {
    throw new Error(`Unknown PROFILE "${profileName}". Available: ${Object.keys(PROFILES).join(', ')}`);
  }

  const thresholds = { ...THRESHOLDS };
  for (const name of endpoints) {
    thresholds[`http_req_duration{scenario:main,name:${name}}`] = ['p(95)<500'];
  }

  return {
    scenarios: { main: profile },
    thresholds,
    // setup() logs in all 205 users, which takes a while because of BCrypt
    setupTimeout: '2m',
  };
}

function ok(res, name) {
  return check(res, { [`${name} 2xx`]: (r) => r.status >= 200 && r.status < 300 });
}

function auth(token, name) {
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, tags: { name } };
}

function loginRequest(email) {
  return {
    method: 'POST',
    url: `${BASE_URL}/api/auth/login`,
    body: JSON.stringify({ email, password: PASSWORD }),
    params: { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  };
}

// Logs every test user in once, so the read/write flows don't pay for BCrypt on
// each iteration. Returns one token per user; this goes to setup() data.
export function loginAllUsers() {
  const tokens = [];
  for (let i = 0; i < EMAILS.length; i += 20) {
    const batch = EMAILS.slice(i, i + 20).map(loginRequest);
    for (const res of http.batch(batch)) {
      if (res.status !== 200) {
        fail(`setup login failed (${res.status}). Is the seed data there? ${res.body}`);
      }
      tokens.push(res.json('token'));
    }
  }
  return tokens;
}

export function randomToken(tokens) {
  return pick(tokens);
}

export const LOGIN_ENDPOINTS = ['login'];

export function loginFlow() {
  const req = loginRequest(pick(EMAILS));
  ok(http.post(req.url, req.body, req.params), 'login');
}

export const READ_ENDPOINTS = ['me', 'stats', 'recent', 'activity', 'upcoming', 'page', 'companies', 'interviews'];

// One user opening Dashboard, then the Jobs, Companies and Interviews pages
export function readFlow(token) {
  const get = (path, name) => ok(http.get(`${BASE_URL}${path}`, auth(token, name)), name);

  get('/api/auth/me', 'me');
  get('/api/applications/stats', 'stats');
  get('/api/applications/recent', 'recent');
  get('/api/applications/activity', 'activity');
  get('/api/interviews/upcoming', 'upcoming');

  let query = `page=${randomInt(0, 2)}&size=20`;
  if (Math.random() < 0.3) query += `&status=${pick(STATUSES)}`;
  if (Math.random() < 0.2) query += `&keyword=${pick(KEYWORDS)}`;
  get(`/api/applications/page?${query}`, 'page');

  get('/api/companies', 'companies');
  get('/api/interviews', 'interviews');
}

export const WRITE_ENDPOINTS = ['create', 'status', 'star', 'delete'];

// Create an application, move it along, star it, then delete it again so the
// data size stays the same from run to run
export function writeFlow(token) {
  const created = http.post(`${BASE_URL}/api/applications`, JSON.stringify({
    positionTitle: 'Load Test Engineer',
    companyName: 'Company 001', // every seeded user has this one
    status: 'APPLIED',
    appliedDate: new Date().toISOString().slice(0, 10),
  }), auth(token, 'create'));
  if (!ok(created, 'create')) return;
  const id = created.json('id');

  ok(http.patch(`${BASE_URL}/api/applications/${id}/status?status=${pick(STATUSES)}`, null, auth(token, 'status')), 'status');
  ok(http.patch(`${BASE_URL}/api/applications/${id}/star`, null, auth(token, 'star')), 'star');
  ok(http.del(`${BASE_URL}/api/applications/${id}`, null, auth(token, 'delete')), 'delete');
}
