// Shared bits for all k6 scripts: target, test users, load profiles, and the
// user flows (read / write / login) that the scripts combine.

import http from 'k6/http';
import exec from 'k6/execution';
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

// Each stress step holds one rate for a minute, so analyze.js can report per step
const STEP_SECONDS = 60;

// Room for VUs to pile up when the backend slows down. If k6 runs out of them it
// drops iterations instead of sending them, which analyze.js reports.
const VUS = { preAllocatedVUs: 50, maxVUs: 1000 };

// Stress: start at `start` iterations/s and add `step` every minute up to `max`
function stressProfile({ start, step, max }) {
  const stages = [];
  for (let rate = start; rate <= max; rate += step) {
    stages.push({ duration: '5s', target: rate }, { duration: `${STEP_SECONDS - 5}s`, target: rate });
  }
  return { executor: 'ramping-arrival-rate', startRate: start, timeUnit: '1s', stages, ...VUS };
}

// load and spike are sized from the limit found by stress (-e LIMIT=<iterations/s>)
function requireLimit(profileName) {
  const limit = Number(__ENV.LIMIT);
  if (!limit) {
    throw new Error(`PROFILE=${profileName} needs -e LIMIT=<iterations/s>, the limit found by the stress run`);
  }
  return limit;
}

// Load shapes, picked with -e PROFILE=... Rates are iterations per second.
const PROFILES = {
  smoke: () => ({
    executor: 'constant-arrival-rate',
    rate: 1,
    timeUnit: '1s',
    duration: '30s',
    preAllocatedVUs: 5,
    maxVUs: 10,
  }),

  stress: (stress) => stressProfile(stress),

  // 60% of the limit for 10 minutes: does it stay steady, or slowly get worse?
  load: () => ({
    executor: 'constant-arrival-rate',
    rate: Math.round(requireLimit('load') * 0.6),
    timeUnit: '1s',
    duration: '10m',
    ...VUS,
  }),

  // 30% of the limit, jump to 150% for a minute, then back: does it recover?
  spike: () => {
    const limit = requireLimit('spike');
    const base = Math.round(limit * 0.3);
    const peak = Math.round(limit * 1.5);
    return {
      executor: 'ramping-arrival-rate',
      startRate: base,
      timeUnit: '1s',
      stages: [
        { duration: '1m', target: base },
        { duration: '10s', target: peak },
        { duration: '1m', target: peak },
        { duration: '10s', target: base },
        { duration: '2m', target: base },
      ],
      ...VUS,
    };
  },
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const DEFAULT_STRESS = { start: 10, step: 10, max: 150 };
let stressSteps = null;

// Builds k6 options for the chosen profile. `endpoints` are the request names the
// script uses, so the summary shows p95 per endpoint, not just the overall number.
// `stress` overrides the stress ramp for scripts that need a different range.
export function buildOptions(endpoints, { stress = DEFAULT_STRESS } = {}) {
  const profileName = __ENV.PROFILE || 'smoke';
  const makeProfile = PROFILES[profileName];
  if (!makeProfile) {
    throw new Error(`Unknown PROFILE "${profileName}". Available: ${Object.keys(PROFILES).join(', ')}`);
  }
  if (profileName === 'stress') stressSteps = stress;

  const thresholds = { ...THRESHOLDS };
  for (const name of endpoints) {
    thresholds[`http_req_duration{scenario:main,name:${name}}`] = ['p(95)<500'];
  }
  if (profileName === 'stress') {
    // Once 10% of requests fail the system is clearly past its limit; no point going on
    thresholds['http_req_failed{scenario:main}'] = [
      'rate<0.01',
      { threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '30s' },
    ];
  }

  return {
    scenarios: { main: makeProfile(stress) },
    thresholds,
    // setup() logs in all 205 users, which takes a while because of BCrypt
    setupTimeout: '2m',
  };
}

// Call at the start of every iteration. Under stress it tags requests with the
// step's target rate, so analyze.js can group results by step.
export function markStep() {
  if (!stressSteps) return;
  const elapsed = Date.now() - exec.scenario.startTime;
  const step = Math.floor(elapsed / (STEP_SECONDS * 1000));
  exec.vu.metrics.tags.target = String(stressSteps.start + step * stressSteps.step);
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
