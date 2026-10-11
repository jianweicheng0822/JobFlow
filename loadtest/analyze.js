// Turns one run's raw k6 CSV into readable tables, written to <run>/analysis.md.
//
// Stress runs are grouped by step (each step = one target rate held for a minute),
// so the first failing step is the limit. Other runs are grouped into 15s slices,
// which shows how a spike hits and how long recovery takes.
//
// Usage: node loadtest/analyze.js loadtest/results/<run>

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

const P95_LIMIT_MS = 500;
const ERROR_LIMIT = 0.01;
const SLICE_SECONDS = 15;
// Steps are 60s; anything much shorter means the run was stopped partway through
const MIN_STEP_SECONDS = 50;

// Handles the quoted fields k6 writes for error messages with commas in them
function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { fields.push(field); field = ''; }
    else field += c;
  }
  fields.push(field);
  return fields;
}

// extra_tags looks like "target=40" (several are joined with &)
function parseTags(text) {
  const tags = {};
  for (const pair of text.split('&')) {
    const [key, value] = pair.split('=');
    if (key) tags[key] = value;
  }
  return tags;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function newGroup() {
  return {
    start: Infinity, end: -Infinity, // when samples were recorded (end of each request)
    firstStart: Infinity, lastStart: -Infinity, // when iterations began
    durations: [], byName: new Map(), requests: 0, failed: 0, iterations: 0, dropped: 0,
  };
}

async function readRequests(file) {
  const groups = new Map();
  const dropped = []; // [time, count]; has no target tag, so placed by time afterwards
  let isStress = false;
  let firstTime = null;
  let col = null;

  const lines = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()) });
  for await (const line of lines) {
    const fields = parseCsvLine(line);
    if (!col) {
      col = Object.fromEntries(fields.map((name, i) => [name, i]));
      continue;
    }
    if (fields[col.scenario] !== 'main') continue; // skip setup() logins

    const metric = fields[col.metric_name];
    const time = Number(fields[col.timestamp]);
    const value = Number(fields[col.metric_value]);

    if (metric === 'dropped_iterations') {
      dropped.push([time, value]);
      continue;
    }
    if (!['http_req_duration', 'http_req_failed', 'iterations', 'iteration_duration'].includes(metric)) continue;

    if (firstTime === null) firstTime = time;
    const target = parseTags(fields[col.extra_tags]).target;
    if (target !== undefined) isStress = true;
    const key = target !== undefined
      ? Number(target)
      : Math.floor((time - firstTime) / SLICE_SECONDS) * SLICE_SECONDS;

    if (!groups.has(key)) groups.set(key, newGroup());
    const g = groups.get(key);
    g.start = Math.min(g.start, time);
    g.end = Math.max(g.end, time);

    if (metric === 'http_req_duration') {
      g.durations.push(value);
      const name = fields[col.name];
      if (!g.byName.has(name)) g.byName.set(name, []);
      g.byName.get(name).push(value);
    } else if (metric === 'http_req_failed') {
      g.requests++;
      g.failed += value;
    } else if (metric === 'iterations') {
      g.iterations++;
    } else {
      // Recorded when the iteration ends; subtract its duration to get when it began
      const began = time - value / 1000;
      g.firstStart = Math.min(g.firstStart, began);
      g.lastStart = Math.max(g.lastStart, began);
    }
  }

  // Each group's time window. For stress steps, use when iterations *began*: a slow
  // iteration can finish well into the next step, so end times make steps overlap
  // (stretching them to ~90s and handing one step's drops to another).
  const sorted = [...groups.entries()].sort((a, b) => a[0] - b[0]);
  sorted.forEach(([, g], i) => {
    if (isStress) {
      const next = sorted[i + 1];
      g.windowStart = g.firstStart;
      g.windowEnd = next ? next[1].firstStart : g.lastStart + 1;
    } else {
      g.windowStart = g.start;
      g.windowEnd = g.end + 1;
    }
  });

  for (const [time, count] of dropped) {
    const match = sorted.find(([, g]) => time >= g.windowStart && time < g.windowEnd);
    if (match) match[1].dropped += count;
  }
  return { groups: sorted, isStress };
}

function readResources(file) {
  if (!fs.existsSync(file)) return [];
  const [header, ...rows] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const names = header.split(',');
  return rows.map((row) => Object.fromEntries(row.split(',').map((v, i) => [names[i], v === '' ? NaN : Number(v)])));
}

function average(rows, field) {
  const values = rows.map((r) => r[field]).filter((v) => !Number.isNaN(v));
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : NaN;
}

function fmt(n, unit = '') {
  return Number.isNaN(n) ? '–' : `${Math.round(n)}${unit}`;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node loadtest/analyze.js loadtest/results/<run>');
    process.exit(1);
  }

  const { groups, isStress } = await readRequests(path.join(dir, 'requests.csv.gz'));
  const resources = readResources(path.join(dir, 'resources.csv'));
  const endpoints = [...new Set(groups.flatMap(([, g]) => [...g.byName.keys()]))].sort();

  const out = [`# ${path.basename(dir)}`, ''];
  out.push(`Pass = p95 < ${P95_LIMIT_MS}ms and errors < ${ERROR_LIMIT * 100}%. ` +
    'Dropped = iterations k6 had to skip because all its VUs were busy waiting (for reference, ' +
    'doesn\'t affect pass). CPU columns are averages over the step, as a share of the whole machine.', '');

  out.push(`| ${isStress ? 'Target it/s' : 'Time'} | Actual it/s | Req/s | p50 | p95 | p99 | Errors | Dropped | CPU total | Java | MySQL | k6 | |`);
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');

  let lastPass = null;
  let firstFail = null;
  const partialSteps = [];
  for (const [key, g] of groups) {
    g.durations.sort((a, b) => a - b);
    const seconds = Math.max(1, Math.round(g.windowEnd - g.windowStart));
    const p95 = percentile(g.durations, 95);
    const errorRate = g.requests ? g.failed / g.requests : 0;
    // Dropped iterations are shown but don't fail a step; the bar is p95 and errors only
    const pass = p95 < P95_LIMIT_MS && errorRate < ERROR_LIMIT;
    // A stress step cut short (run stopped mid-step) has too little data to judge
    const partial = isStress && seconds < MIN_STEP_SECONDS;
    if (partial) partialSteps.push(`${key} it/s (${seconds}s)`);
    if (!partial && pass && firstFail === null) lastPass = key;
    if (!partial && !pass && firstFail === null) firstFail = key;

    const window = resources.filter((r) => r.time >= g.windowStart && r.time < g.windowEnd);
    out.push(`| ${isStress ? key : `+${key}s`} | ${(g.iterations / seconds).toFixed(1)} | ${fmt(g.requests / seconds)} ` +
      `| ${fmt(percentile(g.durations, 50), 'ms')} | ${fmt(p95, 'ms')} | ${fmt(percentile(g.durations, 99), 'ms')} ` +
      `| ${(errorRate * 100).toFixed(1)}% | ${g.dropped} ` +
      `| ${fmt(average(window, 'total_cpu'), '%')} | ${fmt(average(window, 'java_cpu'), '%')} ` +
      `| ${fmt(average(window, 'mysql_cpu'), '%')} | ${fmt(average(window, 'k6_cpu'), '%')} ` +
      `| ${partial ? 'partial' : pass ? '✓' : '✗'} |`);
  }

  if (isStress) {
    out.push('');
    out.push(firstFail === null
      ? `**No step failed** (highest full step: ${lastPass ?? 'none'} it/s). If the run went to the end, raise the stress max to find the limit.`
      : `**Limit: ${lastPass ?? 'below the first step'} it/s.** First failing step: ${firstFail} it/s.`);
    if (partialSteps.length) {
      out.push('', `⚠ Left out, ran under ${MIN_STEP_SECONDS}s: ${partialSteps.join(', ')}. ` +
        'The run was stopped early, so rerun it without interrupting.');
    }
  }

  out.push('', '## p95 per endpoint', '');
  out.push(`| ${isStress ? 'Target it/s' : 'Time'} | ${endpoints.join(' | ')} |`);
  out.push(`|---|${endpoints.map(() => '---').join('|')}|`);
  for (const [key, g] of groups) {
    const cells = endpoints.map((name) => {
      const values = (g.byName.get(name) || []).sort((a, b) => a - b);
      return fmt(percentile(values, 95), 'ms');
    });
    out.push(`| ${isStress ? key : `+${key}s`} | ${cells.join(' | ')} |`);
  }

  const text = out.join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'analysis.md'), text);
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
