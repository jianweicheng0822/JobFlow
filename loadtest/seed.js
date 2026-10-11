// Seeds the loadtest database with test users and their data, through the real API.
//
// Usage: node loadtest/seed.js
// Needs the backend running with SPRING_PROFILES_ACTIVE=loadtest (see README.md).

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const PASSWORD = 'loadtest123';
const CONCURRENCY = 20; // users seeded in parallel

// Rate limit the loadtest profile sets; anything else means we're pointed at the wrong backend
const LOADTEST_RATE_LIMIT = '1000000';

const USER_GROUPS = [
  { count: 200, email: (i) => `lt-user-${pad(i, 3)}@jobflow.test`, companies: 15, applications: 60, interviews: 15 },
  { count: 5, email: (i) => `lt-heavy-${i}@jobflow.test`, companies: 50, applications: 1000, interviews: 200 },
];

const STATUSES = ['APPLIED', 'IN_REVIEW', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED'];
const INTERVIEW_TYPES = ['PHONE', 'VIDEO', 'ONSITE'];
const TITLES = ['Software Engineer', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Developer',
  'Data Engineer', 'DevOps Engineer', 'QA Engineer', 'Mobile Developer', 'ML Engineer', 'Product Engineer'];
const CITIES = ['Calgary, AB', 'Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Remote'];

let requestCount = 0;

function pad(n, width) {
  return String(n).padStart(width, '0');
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// yyyy-mm-dd, `daysAgo` days before today
function dateDaysAgo(daysAgo) {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toISOString().slice(0, 10);
}

// yyyy-mm-ddThh:mm:00, offset from now in days (negative = past), on a whole hour
function dateTimeInDays(days) {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setUTCHours(randomInt(9, 17), 0, 0, 0);
  return d.toISOString().slice(0, 19);
}

async function api(method, path, { token, body } = {}) {
  requestCount++;
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, data: text ? JSON.parse(text) : null };
}

async function expectOk(method, path, options) {
  const res = await api(method, path, options);
  if (res.status >= 300) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

// Refuse to run against a backend that isn't using the loadtest profile,
// or against a database that's already been seeded
async function checkTarget(firstEmail) {
  let res;
  try {
    res = await api('POST', '/api/auth/login', { body: { email: firstEmail, password: PASSWORD } });
  } catch (e) {
    throw new Error(`Can't reach the backend at ${BASE_URL}. Is it running?`);
  }

  const limit = res.headers.get('X-RateLimit-Limit');
  if (limit !== LOADTEST_RATE_LIMIT) {
    throw new Error(`Backend rate limit is ${limit}, expected ${LOADTEST_RATE_LIMIT}. ` +
      'Start it with SPRING_PROFILES_ACTIVE=loadtest so we don\'t seed the dev database.');
  }
  if (res.status === 200) {
    throw new Error(`${firstEmail} already exists, so the data is already seeded. ` +
      'To start over, drop the jobflow_loadtest database and restart the backend.');
  }
}

async function seedUser(email, group) {
  const { token } = await expectOk('POST', '/api/auth/register', {
    body: { name: email.split('@')[0], email, password: PASSWORD },
  });

  const companyIds = [];
  for (let i = 1; i <= group.companies; i++) {
    const company = await expectOk('POST', '/api/companies', {
      token,
      body: { name: `Company ${pad(i, 3)}`, location: pick(CITIES), website: `https://company${i}.example.com` },
    });
    companyIds.push(company.id);
  }

  const applicationIds = [];
  for (let i = 0; i < group.applications; i++) {
    const app = await expectOk('POST', '/api/applications', {
      token,
      body: {
        positionTitle: pick(TITLES),
        companyId: pick(companyIds),
        location: pick(CITIES),
        salary: `$${randomInt(70, 160)}k`,
        status: pick(STATUSES),
        appliedDate: dateDaysAgo(randomInt(0, 180)),
        notes: 'Seeded for load testing',
      },
    });
    applicationIds.push(app.id);
  }

  // Half in the past, half in the next 30 days so /upcoming has something to return
  for (let i = 0; i < group.interviews; i++) {
    const days = i % 2 === 0 ? -randomInt(1, 90) : randomInt(1, 30);
    await expectOk('POST', '/api/interviews', {
      token,
      body: {
        jobApplicationId: pick(applicationIds),
        interviewDate: dateTimeInDays(days),
        interviewType: pick(INTERVIEW_TYPES),
        reminderEnabled: false,
      },
    });
  }
}

// Runs tasks with at most `limit` in flight; stops at the first failure
async function runPool(tasks, limit) {
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < tasks.length) {
      await tasks[next++]();
      done++;
      if (done % 20 === 0 || done === tasks.length) {
        console.log(`  ${done}/${tasks.length} users done (${requestCount} requests)`);
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

async function main() {
  await checkTarget(USER_GROUPS[0].email(1));

  const tasks = [];
  for (const group of USER_GROUPS) {
    for (let i = 1; i <= group.count; i++) {
      tasks.push(() => seedUser(group.email(i), group));
    }
  }

  console.log(`Seeding ${tasks.length} users into ${BASE_URL} ...`);
  const start = Date.now();
  await runPool(tasks, CONCURRENCY);
  console.log(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s, ${requestCount} requests.`);
  console.log(`All users share the password "${PASSWORD}".`);
}

main().catch((e) => {
  console.error(`Seeding failed: ${e.message}`);
  process.exit(1);
});
