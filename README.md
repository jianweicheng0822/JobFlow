# JobFlow

A job application tracking system.

## Project Structure

```
Jobtracker/
├── job-flow-backend/    # Spring Boot 3 API (Java 21, Maven)
├── job-flow-frontend/   # Frontend (coming soon)
├── CLAUDE.md
└── README.md
```

## Backend

The backend is a Spring Boot 3 application using:
- Spring Web (REST API)
- Spring Data JPA (database access)
- Spring Security (authentication)
- H2 (in-memory dev database)
- Lombok

### Running the backend

```bash
cd job-flow-backend
./mvnw clean compile
./mvnw spring-boot:run
```

The API starts on `http://localhost:8080`. The H2 console is available at `http://localhost:8080/h2-console`.
