# JobFlow

[![CI](https://github.com/jianweicheng0822/JobFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/jianweicheng0822/JobFlow/actions/workflows/ci.yml)
![Java 21](https://img.shields.io/badge/Java_21-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

A full-stack job application tracker with JWT + OAuth2 authentication, Kanban pipeline, interview management, and analytics dashboard.

**Live:** https://jobflow.lumis.software (click "Try Demo" to look around without signing up)

## Screenshots

<a href="docs/dashboard.png"><img src="docs/dashboard.png" alt="Dashboard"></a>

<table>
  <tr>
    <td align="center"><strong>Login</strong><br><a href="docs/login.png"><img src="docs/login.png" alt="Login" width="400"></a></td>
    <td align="center"><strong>Jobs</strong><br><a href="docs/jobs.png"><img src="docs/jobs.png" alt="Jobs" width="400"></a></td>
  </tr>
  <tr>
    <td align="center"><strong>Interviews</strong><br><a href="docs/interviews.png"><img src="docs/interviews.png" alt="Interviews" width="400"></a></td>
    <td align="center"><strong>Companies</strong><br><a href="docs/companies.png"><img src="docs/companies.png" alt="Companies" width="400"></a></td>
  </tr>
  <tr>
    <td align="center"><strong>Analytics</strong><br><a href="docs/analytics.png"><img src="docs/analytics.png" alt="Analytics" width="400"></a></td>
    <td align="center"><strong>Settings</strong><br><a href="docs/settings.png"><img src="docs/settings.png" alt="Settings" width="400"></a></td>
  </tr>
  <tr>
    <td align="center"><strong>Dark Mode</strong><br><a href="docs/dashboard-dark.png"><img src="docs/dashboard-dark.png" alt="Dashboard in dark mode" width="400"></a></td>
    <td></td>
  </tr>
</table>

> *Click any screenshot to view full resolution.*

## Tech Stack

| Frontend | Backend | Database |
|----------|---------|----------|
| React 19, TypeScript, Vite | Java 21, Spring Boot 3, Spring Security | MySQL 8, Flyway migrations |
| Axios, Recharts, React Router | JWT (HS256), Google/GitHub OAuth2 | Hibernate, Spring Data JPA |
| Vitest, React Testing Library | JUnit 5, MockMvc, Mockito, Testcontainers | |

## Features

- **Auth** — Register/login with JWT, Google & GitHub OAuth2, demo mode. Tokens carry the user id and a token version, so changing your password signs out every other device and a deleted account's tokens stop working right away
- **Dashboard** — Stat cards, Kanban pipeline, recent applications (starred first), upcoming interviews
- **Jobs** — Searchable, paginated application table with a quick status dropdown, starred (saved) jobs, and top employers
- **Interviews** — Schedule and manage interviews linked to applications, with optional email reminders (shown only when the server has `MAIL_*` set)
- **Companies** — Company directory with search and per-company application count
- **Gmail import** — Connect Gmail, scan for application emails, and import them as applications
- **Analytics** — Overview, status distribution, per-company breakdown
- **Global search** — Search applications and companies from the top bar
- **Settings** — Profile, password, theme (dark/light), language (English/中文), and time zone
- **Account deletion** — Delete your account from Settings; all your data goes with it and Gmail access is revoked

## Getting Started

### Configuration

Copy `.env.example` to `.env` in the repo root and fill it in. Docker Compose
and a local backend both read it (environment variables override it):

| Variable | Required | What it's for |
|----------|----------|---------------|
| `DB_USERNAME`, `DB_PASSWORD` | Yes | MySQL login |
| `JWT_SECRET` | Yes | Signs login tokens (at least 32 characters) |
| `DB_HOST`, `DB_PORT` | No | MySQL address, default `localhost:3306` |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | No | Gmail SMTP for interview reminder emails |
| `SEED_DEMO_DATA` | No | `true` creates a sample account `demo@jobflow.com` / `demo123` on startup. Default `false`; keep it off anywhere public |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Google sign-in and Gmail import. Set both or neither |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | No | GitHub sign-in. Set both or neither |
| `FRONTEND_URL` | No | Where the app is opened; sign-in and Gmail linking return here. Default `http://localhost:5173` (`http://localhost` in Docker) |
| `GMAIL_REDIRECT_URI` | No | Gmail linking callback, must be registered in your Google OAuth client. Default `http://localhost:8080/api/gmail/callback` (`http://localhost/api/gmail/callback` in Docker) |

The app works without the optional ones; those features are just turned off.

#### Sign-in with Google / GitHub

Each provider turns on when both its client id and secret are set. Its button then
shows on the login and register pages, and Google also enables Gmail import in
Settings. A provider with no credentials is hidden. A provider with only one of the
two set stops the backend at startup, so a typo in your secrets can't go unnoticed.
The startup log shows which providers are on (`OAuth sign-in enabled: [google, github]`).

Keep the credentials in `.env` or your host's secret store, never in the repo.
Register these redirect URIs with each provider, using the address users open
(`http://localhost` for Docker, `http://localhost:8080` when running locally):

| Provider | Redirect URI |
|----------|--------------|
| Google (sign-in) | `<app address>/login/oauth2/code/google` |
| Google (Gmail import) | the value of `GMAIL_REDIRECT_URI` |
| GitHub | `<app address>/login/oauth2/code/github` |

### Option A: Docker (everything in one go)

Needs Docker. With `.env` in the repo root:

```bash
git clone https://github.com/jianweicheng0822/JobFlow.git
cd JobFlow
docker compose up -d --build
```

Open http://localhost. MySQL is exposed on port 3307.

### Option B: Run locally

Needs Node.js 22+, Java 21+ and MySQL 8+. Create the database first; Flyway
creates the tables on first start.

```bash
# 1. Clone
git clone https://github.com/jianweicheng0822/JobFlow.git
cd JobFlow

# 2. Database
mysql -u root -p -e "CREATE DATABASE jobflow;"

# 3. Backend (starts on :8080)
cd job-flow-backend
./mvnw spring-boot:run

# 4. Frontend (starts on :5173)
cd ../job-flow-frontend
npm install && npm run dev
```

The backend picks up the repo root `.env` on its own (also `job-flow-backend/.env`),
so there's nothing to export. If you only run MySQL from Docker
(`docker compose up -d mysql`), keep `DB_PORT=3307` from `.env.example`.

On Windows, `start.bat` does all of this in one go: starts Docker and MySQL if
needed, opens the backend and frontend in two windows, and opens the app once
the backend is up.

> **Demo Mode:** Click "Try Demo" on the login page to explore with mock data, no backend needed.

## API Endpoints

Everything needs `Authorization: Bearer <token>` except `POST /api/auth/register`,
`POST /api/auth/login`, `POST /api/auth/oauth/exchange`, `GET /api/auth/providers`
and the Gmail OAuth callback.

| Resource | Endpoints |
|----------|-----------|
| **Auth** | `POST /register`, `POST /login`, `GET /providers`, `POST /oauth/exchange`, `GET /me`, `PUT /profile`, `PUT /password` (returns a fresh token), `PUT /time-zone`, `DELETE /me` |
| **Applications** | `GET /`, `GET /page`, `GET /{id}`, `POST /`, `PUT /{id}`, `PATCH /{id}/status`, `PATCH /{id}/star`, `DELETE /{id}`, `DELETE /batch`, `GET /stats`, `GET /recent`, `GET /activity`, `GET /export` |
| **Interviews** | `GET /`, `GET /{id}`, `GET /upcoming`, `POST /`, `PUT /{id}`, `DELETE /{id}` |
| **Companies** | `GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}` |
| **Gmail** | `GET /status`, `GET /link`, `GET /callback`, `POST /scan`, `POST /import` |

Base paths: `/api/auth`, `/api/applications`, `/api/interviews`, `/api/companies`, `/api/gmail`

## Testing

About **560 tests**: backend integration and unit tests, frontend component and API tests.

```bash
# Backend (needs Docker running: integration tests start MySQL with Testcontainers)
cd job-flow-backend && ./mvnw test

# Frontend
cd job-flow-frontend && npx vitest run
```

## Load Testing

The backend was load tested with [k6](https://k6.io/) against 205 seeded users
and 17,000 applications, with a mix of 80% browsing, 15% editing and 5% logging in.
The limit is the highest rate where p95 stays under 500 ms and under 1% of
requests fail.

| Setup | Limit (iterations/s) | p95 at 80 it/s |
|-------|----------------------|----------------|
| Default (10 DB connections) | 70 | 1,903 ms |
| 20 DB connections | 90 | 90 ms |
| 20 DB connections + open-in-view off (current) | 80 | 102 ms |

Thread dumps showed 190 of 200 request threads waiting for a database connection,
which is what led to the larger pool. One iteration averages about 7 requests.
Everything (k6, backend, MySQL) ran on one laptop, so these numbers are for
comparing changes, not a production capacity figure.

These runs predate putting the user id in the JWT. Every request used to look the
user up by email before doing anything else; that lookup is gone now, and the
numbers above haven't been re-measured since.

How to run it yourself: [loadtest/README.md](loadtest/README.md).

## Deployment

Every push to `main` runs the backend and frontend tests and a Docker Compose smoke
test, then builds both images and pushes them to GHCR. The deploy job runs
[`deploy/deploy.sh`](deploy/deploy.sh) on the server through AWS SSM: it backs up the
database, starts the new images, waits until the site answers, and rolls back to the
previous version if it doesn't. A final check hits the live site.
