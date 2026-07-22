# JobFlow

![Java 21](https://img.shields.io/badge/Java_21-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?logo=axios&logoColor=white)
![Hibernate](https://img.shields.io/badge/Hibernate-59666C?logo=hibernate&logoColor=white)

Full-stack job application tracking system with AI-powered analytics dashboard. Track applications, manage your pipeline with a Kanban board, monitor upcoming interviews, and visualize trends — all in a clean, dark-mode-supported UI with real-time data from a Spring Boot REST API.

<!-- TODO: Add screenshot -->
<!-- ![JobFlow Dashboard](screenshot.png) -->

## Features

- **Dashboard** — overview with stat cards, Kanban-style application pipeline, recent applications table, and upcoming interviews sidebar
- **Jobs** — searchable and filterable job positions table with stage tracking, stat cards, and top employers sidebar
- **Companies** — company card grid with search and location filter, showing application count per company
- **Analytics** — interactive charts including application trends (line), status distribution (pie), and per-company breakdown (bar)
- **Settings** — profile management, account settings, notification preferences, and appearance theme switcher
- **Dark Mode** — full dark mode support with theme persistence
- **API Integration** — frontend connected to backend REST API with loading and error states

## Project Structure

```
Jobtracker/
├── job-flow-frontend/          # React + TypeScript (Vite)
│   └── src/
│       ├── api/                # Axios client & API service layer
│       ├── components/         # Layout, Sidebar, TopBar
│       ├── pages/              # Dashboard, Jobs, Companies, Analytics, Settings
│       └── routes/             # React Router config
│
├── job-flow-backend/           # Spring Boot 3 (Java 21, Maven)
│   └── src/main/java/com/jobflow/
│       ├── controller/         # REST controllers
│       ├── service/            # Business logic
│       ├── repository/         # Data access (JPA)
│       ├── model/              # Entity classes
│       ├── dto/                # Data transfer objects
│       └── config/             # Security, CORS, data initializer
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- Java 21+
- MySQL 8+

### Database Setup

Create the database in MySQL:

```sql
CREATE DATABASE jobflow;
```

### Backend

```bash
cd job-flow-backend
./mvnw spring-boot:run
```

The API starts on `http://localhost:8080`. Sample data is automatically seeded on first run.

### Frontend

```bash
cd job-flow-frontend
npm install
npm run dev
```

The app starts on `http://localhost:5173`.

## API Endpoints

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List all applications (optional `?status=` filter) |
| GET | `/api/applications/{id}` | Get application by ID |
| POST | `/api/applications` | Create new application |
| PUT | `/api/applications/{id}` | Update application |
| PATCH | `/api/applications/{id}/status` | Update status (`?status=`) |
| DELETE | `/api/applications/{id}` | Delete application |
| GET | `/api/applications/stats` | Dashboard statistics |
| GET | `/api/applications/recent` | 10 most recently updated |
| GET | `/api/applications/activity` | Monthly trend data (last 12 months) |

### Companies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List all companies |
| GET | `/api/companies/{id}` | Get company by ID |
| POST | `/api/companies` | Create new company |
| PUT | `/api/companies/{id}` | Update company |
| DELETE | `/api/companies/{id}` | Delete company |

### Interviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interviews` | List all interviews |
| GET | `/api/interviews/{id}` | Get interview by ID |
| GET | `/api/interviews/upcoming` | Upcoming interviews |
| POST | `/api/interviews` | Create new interview |
| PUT | `/api/interviews/{id}` | Update interview |
| DELETE | `/api/interviews/{id}` | Delete interview |
