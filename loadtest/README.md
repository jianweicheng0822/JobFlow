# Load testing

Everything here runs against the backend's `loadtest` profile, which uses its own
`jobflow_loadtest` database, turns off SQL logging, and lifts the rate limit.
Your dev data is never touched.

## 1. Start the backend in loadtest mode

MySQL has to be up first (`docker compose up -d mysql`). Then build the jar and
start it in its own terminal, from `job-flow-backend/`:

```bash
# Git Bash
./mvnw -q package -DskipTests
DB_PORT=3307 java -jar target/job-flow-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=loadtest
```

```powershell
# PowerShell
.\mvnw.cmd -q package -DskipTests
$env:DB_PORT = "3307"; java -jar target\job-flow-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=loadtest
```

Press Ctrl+C in that terminal to stop it cleanly.

- Use the jar, not `./mvnw spring-boot:run`. The Maven plugin adds
  `-XX:TieredStopAtLevel=1` for a faster start, which turns off the JVM's best
  optimizations and makes the backend look slower than it really is.
- Rebuild the jar after changing backend code, or you'll be testing the old version.
- `DB_PORT=3307` is the port docker-compose maps MySQL to. The database is created
  and migrated on first start.

## 2. Seed test data

From the repo root:

```bash
node loadtest/seed.js
```

This goes through the real API and takes about a minute and a half. It creates:

| Users | Emails | Each user has |
|---|---|---|
| 200 regular | `lt-user-001@jobflow.test` … `lt-user-200@jobflow.test` | 15 companies, 60 applications, 15 interviews |
| 5 heavy | `lt-heavy-1@jobflow.test` … `lt-heavy-5@jobflow.test` | 50 companies, 1000 applications, 200 interviews |

All users have the password `loadtest123`. Application statuses and dates (last
6 months) are random, and about half the interviews are in the next 30 days.

The script refuses to run if the backend isn't in loadtest mode, or if the data
is already there.

### Starting over

Drop the database and restart the backend; Flyway rebuilds it empty:

```bash
docker exec jobflow-mysql-1 sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE jobflow_loadtest"'
```

## 3. Run a test

k6 runs in Docker, so nothing needs installing. From Git Bash:

```bash
loadtest/run.sh <script> <profile> [LIMIT]

loadtest/run.sh mixed smoke          # quick check that everything works
loadtest/run.sh mixed stress         # find the limit (~15 min)
loadtest/run.sh login stress         # login on its own (~12 min)
loadtest/run.sh mixed load 80        # 60% of a limit of 80 it/s, for 10 min
loadtest/run.sh mixed spike 80       # 30% of 80, jump to 150%, back down (~5 min)
```

Don't interrupt a run. If you do, rerun it; a step cut short is marked
`partial` and left out of the result.

Each run gets its own folder in `loadtest/results/` (not committed):

| File | What it is |
|---|---|
| `analysis.md` | Per-step table: p95, errors, CPU, and the limit for stress runs. Start here |
| `report.html` | k6's charts over time, open in a browser |
| `summary.txt` | k6's own end-of-run summary |
| `resources.csv` | CPU and memory samples every 5s |
| `requests.csv.gz` | Every request, the raw input for `analysis.md` |

### Profiles

| Profile | Shape |
|---|---|
| `smoke` | 1 it/s for 30s |
| `stress` | +10 it/s every minute from 10 to 150 (login: +5 from 5 to 60). Stops early once 10% of requests fail |
| `load` | 60% of `LIMIT` for 10 minutes. Does it stay steady? |
| `spike` | 30% of `LIMIT`, then 150% for a minute, then back. Does it recover? |

"it/s" is iterations per second: one pass through a script's flow, which for
`mixed` averages about 7 requests.

### Scripts

| Script | What it does |
|---|---|
| `login.js` | Logs in only. Kept separate because BCrypt is CPU-heavy |
| `read.js` | One user browsing Dashboard, Jobs, Companies and Interviews |
| `write.js` | Creates an application, changes its status, stars it, then deletes it |
| `mixed.js` | 80% read, 15% write, 5% login. Use this one for the overall limit |

`read`, `write` and `mixed` log every test user in once during setup, so BCrypt
doesn't skew those numbers. The setup requests are left out of the results.

A run passes if fewer than 1% of requests fail and p95 stays under 500 ms, both
overall and per endpoint. `write.js` deletes what it creates, so the data size
stays the same between runs.
