# Load testing

Everything here runs against the backend's `loadtest` profile, which uses its own
`jobflow_loadtest` database, turns off SQL logging, and lifts the rate limit.
Your dev data is never touched.

## 1. Start the backend in loadtest mode

MySQL has to be up first (`docker compose up -d mysql`). Then, from `job-flow-backend/`:

```bash
SPRING_PROFILES_ACTIVE=loadtest DB_PORT=3307 ./mvnw spring-boot:run
```

`DB_PORT=3307` is the port docker-compose maps MySQL to. The database is created
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

## 3. Run a k6 script

k6 runs in Docker, so nothing needs installing. From the repo root:

```bash
# Git Bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W)/loadtest/k6:/scripts" grafana/k6:2.3.0 run -e PROFILE=smoke /scripts/read.js
```

```powershell
# PowerShell
docker run --rm -v "${PWD}/loadtest/k6:/scripts" grafana/k6:2.3.0 run -e PROFILE=smoke /scripts/read.js
```

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

### Starting over

Drop the database and restart the backend; Flyway rebuilds it empty:

```bash
docker exec jobflow-mysql-1 sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE jobflow_loadtest"'
```
