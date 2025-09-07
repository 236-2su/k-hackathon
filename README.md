# Hack Monorepo

Stack:
- Frontend: React + Vite + Tailwind
- Backend: Spring Boot (Java 17)
- DB: MySQL (RDS)
- Deploy: EC2 + Docker + Nginx + Jenkins (blue/green)

Domains:
- Front: https://www.hackathon-first-step.com
- API:   https://api.hackathon-first-step.com

## Quick Start (Local)
- Frontend dev: `cd frontend && npm i && npm run dev`
- Backend dev: `cd backend && ./gradlew bootRun`

## Deploy (Server)
- Put RDS/JWT values into `deploy/env/.env.prod`
- Run Jenkins pipeline or: `docker compose -f deploy/docker-compose.prod.yml up -d`
