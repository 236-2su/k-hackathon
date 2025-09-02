# Hackathon BE

Spring Boot 3 backend application with JPA, Flyway, and MySQL integration.

## Tech Stack

- Java 17
- Spring Boot 3.2.0
- Spring Data JPA
- MySQL
- Flyway
- Gradle
- Docker

## Quick Start

### Prerequisites

- Java 17
- MySQL 8.0+
- Docker (optional)

### Local Development

1. Start MySQL database:
```bash
docker run --name mysql-hackathon \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=hackathon_dev \
  -p 3306:3306 \
  -d mysql:8.0
```

2. Run application:
```bash
./gradlew bootRun
```

3. Test endpoints:
```bash
curl http://localhost:8080/api/ping
curl http://localhost:8080/actuator/health
```

### Build for Production

```bash
./gradlew build
```

### Run with Production Profile

```bash
java -jar build/libs/hackathon_be-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

## Docker

### Build Docker Image

```bash
docker build -t hackathon-be .
```

### Run Docker Container

```bash
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_URL=jdbc:mysql://host.docker.internal:3306/hackathon_prod \
  -e DB_USERNAME=root \
  -e DB_PASSWORD=password \
  hackathon-be
```

## API Endpoints

- `GET /api/ping` - Health check endpoint
- `GET /actuator/health` - Application health status

## Configuration

### Profiles

- `dev` - Development environment (DDL auto-update)
- `prod` - Production environment (DDL validate only)

### Environment Variables (Production)

- `DB_URL` - Database connection URL
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `SERVER_PORT` - Server port (default: 8080)

## Database Migration

Database migrations are managed by Flyway and located in `src/main/resources/db/migration/`.

Initial migration creates a sample table with test data.

## Project Structure

```
hackathon_BE/
├── src/
│   ├── main/
│   │   ├── java/com/hackathon/hackathon_be/
│   │   │   ├── controller/          # REST controllers
│   │   │   └── HackathonBeApplication.java
│   │   └── resources/
│   │       ├── db/migration/        # Flyway migrations
│   │       ├── application.yml      # Base configuration
│   │       ├── application-dev.yml  # Development config
│   │       └── application-prod.yml # Production config
│   └── test/                        # Test files
├── build.gradle                     # Build configuration
├── Dockerfile                       # Multi-stage Docker build
└── README.md                        # This file
```