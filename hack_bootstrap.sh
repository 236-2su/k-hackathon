#!/usr/bin/env bash
set -euo pipefail

# === Inputs / defaults ===
REPO_NAME="${1:-hack-monorepo}"
PKG_NAME="hack"
DOMAIN="hackathon-first-step.com"
FE_ORIGIN="https://www.${DOMAIN}"
API_ORIGIN="https://api.${DOMAIN}"
DB_NAME="hackdb"
DB_USER="hackuser"
DB_PASS="${DB_PASS:-changeme-please}"  # you can override by exporting DB_PASS before running
JWT_SECRET="${JWT_SECRET:-change_me_to_32_chars_min}"

echo "[+] Creating repo: ${REPO_NAME}"
mkdir -p "${REPO_NAME}"
cd "${REPO_NAME}"

# === .gitignore (root) ===
cat > .gitignore << 'EOF'
# Node
node_modules/
dist/
# Java/Gradle
.gradle/
build/
out/
# IDE
.idea/
.vscode/
# OS
.DS_Store
# Docker
*.log
# Env
*.env
deploy/env/.env.*
EOF

# === Root README ===
cat > README.md << EOF
# Hack Monorepo

Stack:
- Frontend: React + Vite + Tailwind
- Backend: Spring Boot (Java 17)
- DB: MySQL (RDS)
- Deploy: EC2 + Docker + Nginx + Jenkins (blue/green)

Domains:
- Front: https://www.${DOMAIN}
- API:   https://api.${DOMAIN}

## Quick Start (Local)
- Frontend dev: \`cd frontend && npm i && npm run dev\`
- Backend dev: \`cd backend && ./gradlew bootRun\`

## Deploy (Server)
- Put RDS/JWT values into \`deploy/env/.env.prod\`
- Run Jenkins pipeline or: \`docker compose -f deploy/docker-compose.prod.yml up -d\`
EOF

# === Frontend scaffold ===
mkdir -p frontend/src
cat > frontend/package.json << 'EOF'
{
  "name": "hack-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5173"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.6.2",
    "vite": "^5.4.2"
  }
}
EOF

cat > frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true
  },
  "include": ["src"]
}
EOF

cat > frontend/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
EOF

cat > frontend/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

cat > frontend/postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
EOF

cat > frontend/index.html << 'EOF'
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hack Frontend</title>
  </head>
  <body class="bg-slate-50">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

cat > frontend/src/main.tsx << 'EOF'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
EOF

cat > frontend/src/App.tsx << EOF
import { useEffect, useState } from 'react'

export default function App() {
  const [health, setHealth] = useState<string>('checking...')

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.text())
      .then(setHealth)
      .catch(() => setHealth('down'))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-3xl font-bold">Hack MVP</h1>
        <p className="text-slate-600">Backend health: <span className="font-mono">{health}</span></p>
        <div className="border rounded-xl p-4">
          <h2 className="font-semibold mb-2">Stock Chart Placeholder</h2>
          <p className="text-sm text-slate-500">추후 주식 데이터 연동</p>
        </div>
      </div>
    </div>
  )
}
EOF

cat > frontend/src/styles.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# === Backend (Spring Boot Java 17 + Gradle) ===
mkdir -p backend/src/main/java/com/hack/app
mkdir -p backend/src/main/resources
cat > backend/settings.gradle << 'EOF'
rootProject.name = 'hack-backend'
EOF

cat > backend/build.gradle << 'EOF'
plugins {
  id 'java'
  id 'org.springframework.boot' version '3.3.3'
  id 'io.spring.dependency-management' version '1.1.6'
}

group = 'com.hack'
version = '0.0.1'
java {
  sourceCompatibility = JavaVersion.VERSION_17
}

repositories { mavenCentral() }

dependencies {
  implementation 'org.springframework.boot:spring-boot-starter-web'
  implementation 'org.springframework.boot:spring-boot-starter-actuator'
  implementation 'org.springframework.boot:spring-boot-starter-validation'
  implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
  runtimeOnly 'com.mysql:mysql-connector-j:9.0.0'

  testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

tasks.withType(Test).configureEach {
  useJUnitPlatform()
}
EOF

cat > backend/src/main/java/com/hack/app/HackApplication.java << 'EOF'
package com.hack.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class HackApplication {
  public static void main(String[] args) {
    SpringApplication.run(HackApplication.class, args);
  }
}
EOF

cat > backend/src/main/java/com/hack/app/HealthController.java << 'EOF'
package com.hack.app;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  @GetMapping("/api/health")
  public String health() {
    return "UP";
  }
}
EOF

cat > backend/src/main/resources/application.yml << EOF
server:
  port: \${SERVER_PORT:8080}
  shutdown: graceful
spring:
  datasource:
    url: jdbc:mysql://\${DB_HOST:\${MYSQL_HOST:localhost}}:\${DB_PORT:3306}/\${DB_NAME:${DB_NAME}}?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Seoul
    username: \${DB_USER:${DB_USER}}
    password: \${DB_PASS:${DB_PASS}}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 20000
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: true
management:
  endpoints:
    web:
      exposure:
        include: health,info
EOF

# === Deploy files ===
mkdir -p deploy/docker deploy/nginx deploy/env deploy/scripts

# Frontend Dockerfile (build -> static image)
cat > deploy/docker/frontend.Dockerfile << 'EOF'
FROM node:20-alpine AS build
WORKDIR /fe
COPY frontend/ /fe
RUN npm ci && npm run build

FROM nginx:1.27-alpine
COPY --from=build /fe/dist/ /usr/share/nginx/html
EOF

# Backend Dockerfile
cat > deploy/docker/backend.Dockerfile << 'EOF'
FROM gradle:8-jdk17 AS build
WORKDIR /app
COPY backend/ /app
RUN gradle bootJar -x test

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java","-XX:+UseContainerSupport","-XX:MaxRAMPercentage=75","-jar","/app/app.jar"]
EOF

# Nginx Dockerfile
cat > deploy/docker/nginx.Dockerfile << 'EOF'
FROM nginx:1.27-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
# Static files will be provided by a separate frontend container OR you can COPY them here if you prefer single-nginx.
EOF

# Nginx config
cat > deploy/nginx/default.conf << EOF
server {
  listen 80;
  server_name www.${DOMAIN} api.${DOMAIN};

  # Uncomment after TLS ready: redirect to HTTPS
  # return 301 https://\$host\$request_uri;
}

server {
  listen 443 ssl http2;
  server_name www.${DOMAIN} api.${DOMAIN};

  ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

  # === Frontend (served by frontend container on :8081) ===
  location / {
    proxy_pass http://frontend:8081;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }

  # === Backend (blue/green) ===
  set \$backend_upstream http://backend_blue:8080;
  if (\$http_x_backend_active = "green") {
    set \$backend_upstream http://backend_green:8080;
  }

  location /api/ {
    proxy_pass \$backend_upstream;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_read_timeout 60s;
  }

  gzip on;
  add_header X-Content-Type-Options nosniff;
  add_header X-Frame-Options DENY;
  add_header Referrer-Policy no-referrer-when-downgrade;
}
EOF

# Compose (prod)
cat > deploy/docker-compose.prod.yml << 'EOF'
version: "3.9"
services:
  nginx:
    build:
      context: ..
      dockerfile: deploy/docker/nginx.Dockerfile
    container_name: hack-nginx
    ports: ["80:80", "443:443"]
    depends_on:
      - frontend
      - backend_blue
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    networks: [hacknet]

  frontend:
    build:
      context: ..
      dockerfile: deploy/docker/frontend.Dockerfile
    container_name: hack-frontend
    environment:
      - PORT=8081
    expose: ["8081"]
    command: [ "nginx", "-g", "daemon off;" ]
    networks: [hacknet]

  backend_blue:
    build:
      context: ..
    #  dockerfile: deploy/docker/backend.Dockerfile   # uncomment to build from Dockerfile
    image: hack-backend:${GIT_SHA:-latest}
    container_name: hack-backend-blue
    env_file: [deploy/env/.env.prod]
    environment:
      - SERVER_PORT=8080
      - SPRING_PROFILES_ACTIVE=prod
    expose: ["8080"]
    networks: [hacknet]

  backend_green:
    image: hack-backend:${GIT_SHA:-latest}
    container_name: hack-backend-green
    env_file: [deploy/env/.env.prod]
    environment:
      - SERVER_PORT=8080
      - SPRING_PROFILES_ACTIVE=prod
    expose: ["8080"]
    deploy:
      replicas: 0
    networks: [hacknet]

networks:
  hacknet:
    driver: bridge
EOF

# Env file
cat > deploy/env/.env.prod << EOF
# === DB ===
DB_HOST=REPLACE_WITH_RDS_ENDPOINT
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}

# === App ===
JWT_SECRET=${JWT_SECRET}
CORS_ALLOWED_ORIGINS=${FE_ORIGIN}
EOF

# Blue/Green switch script
cat > deploy/scripts/blue_green_switch.sh << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Decide new color
ACTIVE_FILE="deploy/active_color"
NEW_COLOR="blue"
if [ -f "$ACTIVE_FILE" ]; then
  CUR=$(cat "$ACTIVE_FILE")
  if [ "$CUR" = "blue" ]; then NEW_COLOR="green"; fi
fi
echo "[switch] -> $NEW_COLOR"

# Start new color (build images if not present)
docker compose -f deploy/docker-compose.prod.yml up -d backend_${NEW_COLOR}

# Health check
for i in {1..30}; do
  if docker exec hack-backend-${NEW_COLOR} wget -qO- http://localhost:8080/actuator/health | grep -q UP; then
    echo "health ok"; break
  fi
  sleep 2
  if [ $i -eq 30 ]; then echo "health timeout"; exit 1; fi
done

# Bump nginx by sending a header-based route (simple approach: restart is enough)
docker compose -f deploy/docker-compose.prod.yml restart nginx

# Stop old color
if [ "$NEW_COLOR" = "blue" ]; then
  docker compose -f deploy/docker-compose.prod.yml stop backend_green || true
else
  docker compose -f deploy/docker-compose.prod.yml stop backend_blue || true
fi

echo "$NEW_COLOR" > "$ACTIVE_FILE"
echo "[switch] active=$NEW_COLOR"
EOF
chmod +x deploy/scripts/blue_green_switch.sh

# === Jenkinsfile ===
mkdir -p deploy/jenkins
cat > deploy/Jenkinsfile << 'EOF'
pipeline {
  agent any
  environment {
    GIT_SHA = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
  }
  stages {
    stage('Frontend Build') {
      steps { dir('frontend'){ sh 'npm i && npm run build' } }
    }
    stage('Backend Build') {
      steps { dir('backend'){ sh './gradlew clean test bootJar' } }
    }
    stage('Docker Build') {
      steps {
        sh '''
          docker build -t hack-frontend:${GIT_SHA} -f deploy/docker/frontend.Dockerfile .
          docker build -t hack-backend:${GIT_SHA}  -f deploy/docker/backend.Dockerfile .
          docker build -t hack-nginx:${GIT_SHA}    -f deploy/docker/nginx.Dockerfile .
        '''
      }
    }
    stage('Deploy Blue/Green') {
      steps {
        sh 'bash deploy/scripts/blue_green_switch.sh ${GIT_SHA}'
      }
    }
  }
}
EOF

echo ""
echo "[✓] Done. Next steps:"
echo "1) cd ${REPO_NAME}"
echo "2) Frontend dev:   (cd frontend && npm i && npm run dev)"
echo "3) Backend dev:    (cd backend && ./gradlew bootRun) [Gradle wrapper will be generated on first run if not present]"
echo "4) Fill deploy/env/.env.prod with real RDS values"
echo "5) On server with Docker & certs mounted at /etc/letsencrypt, run:"
echo "   docker compose -f deploy/docker-compose.prod.yml up -d"
