# JobFlow

A full-stack job application tracking system built with React and Spring Boot. Designed to help job seekers organize, monitor, and analyze their application pipeline in one place.

<!-- TODO: Add screenshot -->
<!-- ![JobFlow Dashboard](screenshot.png) -->

## Tech Stack

### Frontend

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-1.18-5A29E4?style=for-the-badge&logo=axios&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)

### Backend

![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-6-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Hibernate](https://img.shields.io/badge/Hibernate-6-59666C?style=for-the-badge&logo=hibernate&logoColor=white)
![Maven](https://img.shields.io/badge/Maven-3-C71A36?style=for-the-badge&logo=apachemaven&logoColor=white)

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
