# 🚀 K-Hackathon Full Stack Application

> 완전한 CI/CD 파이프라인과 Blue/Green 배포를 갖춘 현대적인 웹 애플리케이션

## 📋 프로젝트 개요

**Tech Stack:**
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Spring Boot 3.3 (Java 17) + JPA + MySQL
- **Database**: AWS RDS MySQL 8.0
- **Infrastructure**: AWS EC2 + Docker + nginx
- **CI/CD**: Jenkins + Blue/Green Deployment

**Live URL:** http://3.26.8.188

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Jenkins     │    │   AWS EC2       │    │   AWS RDS       │
│   CI/CD Server  │───▶│  Docker Host    │───▶│   MySQL DB      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │      nginx      │ ◄── Reverse Proxy
                    │   Load Balancer │
                    └─────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
        ┌─────────────────┐      ┌─────────────────┐
        │    Frontend     │      │ Backend (Blue/  │
        │ React + Vite    │      │ Green Deploy)   │
        └─────────────────┘      └─────────────────┘
```

## 📁 프로젝트 구조

```
├── frontend/                 # React 프론트엔드
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/                  # Spring Boot 백엔드
│   ├── src/main/java/
│   ├── src/main/resources/
│   └── build.gradle
├── deploy/                   # 배포 관련 파일
│   ├── docker/              # Dockerfile 모음
│   │   ├── frontend.Dockerfile
│   │   ├── backend.Dockerfile
│   │   └── nginx.Dockerfile
│   ├── nginx/               # nginx 설정
│   │   └── default.conf
│   ├── env/                 # 환경변수
│   │   └── .env.prod
│   ├── scripts/             # 배포 스크립트
│   │   └── blue_green_switch.sh
│   ├── Jenkinsfile          # Jenkins 파이프라인
│   └── docker-compose.prod.yml
└── README.md
```

## 🚀 로컬 개발 환경

### Prerequisites
- Node.js 20+
- Java 17+
- Docker & Docker Compose
- MySQL (선택사항)

### Frontend 개발
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### Backend 개발
```bash
cd backend
./gradlew bootRun
# http://localhost:8080
```

### 전체 로컬 실행
```bash
docker compose -f deploy/docker-compose.prod.yml up -d
# http://localhost
```

## 🏭 프로덕션 배포

### 환경 설정
1. `deploy/env/.env.prod` 파일 생성:
```env
# === DB ===
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=3306
DB_NAME=hackdb
DB_USER=hackuser
DB_PASS=your-password

# === App ===
JWT_SECRET=your-jwt-secret
CORS_ALLOWED_ORIGINS=http://your-ec2-ip
```

### Jenkins CI/CD 파이프라인

#### 파이프라인 단계:
1. **Frontend Build** - React 앱 빌드 및 최적화
2. **Backend Build** - Spring Boot JAR 빌드 및 테스트
3. **Docker Build** - 모든 서비스의 Docker 이미지 생성
4. **Blue/Green Deploy** - 무중단 배포 실행

#### Jenkins 설정 방법:
```bash
# Jenkins 서버에서
1. New Item → Pipeline 선택
2. Pipeline script from SCM 선택
3. Git Repository URL 입력
4. Script Path: deploy/Jenkinsfile
5. Build Now 실행
```

### 수동 배포
```bash
# EC2 서버에서
cd ~/k-hackathon
git pull origin main

# 환경변수 업데이트
cp deploy/env/.env.prod.example deploy/env/.env.prod
# .env.prod 파일 편집

# Blue/Green 배포 실행
bash deploy/scripts/blue_green_switch.sh latest
```

## 🔄 Blue/Green 배포

### 작동 방식
1. **현재 색상 확인**: `deploy/active_color` 파일에서 현재 활성 환경 확인
2. **새 환경 준비**: 비활성 색상의 백엔드 컨테이너 시작
3. **Health Check**: 새 환경이 정상 작동하는지 확인 (최대 60초)
4. **트래픽 전환**: nginx를 재시작하여 트래픽을 새 환경으로 전환
5. **구 환경 정리**: 이전 활성 환경의 컨테이너 중지

### 수동 스위치
```bash
# Blue → Green 또는 Green → Blue
bash deploy/scripts/blue_green_switch.sh [GIT_SHA]

# 현재 활성 환경 확인
cat deploy/active_color
```

## 🐳 Docker Services

### 서비스 구성
- **nginx**: 리버스 프록시 (Port 80, 443)
- **frontend**: React 정적 파일 서빙
- **backend_blue**: Spring Boot 앱 (Blue 환경)
- **backend_green**: Spring Boot 앱 (Green 환경)

### 컨테이너 관리
```bash
# 모든 서비스 시작
docker compose -f deploy/docker-compose.prod.yml up -d

# 특정 서비스만 재시작
docker compose -f deploy/docker-compose.prod.yml restart nginx

# 로그 확인
docker logs hack-backend-blue
docker logs hack-nginx

# 컨테이너 상태 확인
docker ps
```

## 🔧 운영 및 모니터링

### Health Check
```bash
# 프론트엔드 상태
curl -I http://3.26.8.188/

# 백엔드 상태
curl http://3.26.8.188/api/actuator/health

# nginx 상태
docker logs hack-nginx --tail=20
```

### 네트워크 확인
```bash
# 컨테이너 네트워크 정보
docker network inspect deploy_hacknet

# 컨테이너 IP 확인
docker inspect hack-backend-blue | grep IPAddress
```

### 트러블슈팅
```bash
# 502 Bad Gateway 해결
1. 컨테이너 IP 변경 확인
2. nginx 설정 파일 검증
3. 백엔드 컨테이너 health 상태 확인

# DB 연결 문제 해결
1. .env.prod 파일의 DB 설정 확인
2. RDS 보안그룹 확인
3. 백엔드 로그에서 연결 에러 확인
```

## 📊 성능 최적화

### Frontend
- Vite를 사용한 빠른 HMR 개발
- Tailwind CSS Purge로 CSS 최적화
- React 18 Concurrent Features 활용

### Backend
- Spring Boot 3.3 최신 성능 개선사항
- HikariCP 커넥션 풀 최적화
- JPA 쿼리 최적화

### Infrastructure
- nginx gzip 압축 활성화
- Docker multi-stage 빌드로 이미지 크기 최적화
- Blue/Green 배포로 무중단 서비스

## 🔐 보안

- HTTPS 준비 (Let's Encrypt 설정 포함)
- CORS 설정으로 크로스 오리진 요청 제어
- JWT 기반 인증
- nginx 보안 헤더 설정
- 환경변수로 민감정보 관리

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - 자세한 내용은 `LICENSE` 파일을 참고하세요.

## 🆘 문제 해결

**일반적인 문제:**

1. **502 Bad Gateway**
   - nginx 컨테이너 재빌드: `docker compose -f deploy/docker-compose.prod.yml up --build -d nginx`

2. **DB 연결 실패**
   - `.env.prod` 파일의 DB 설정 확인
   - RDS 보안그룹에서 EC2 IP 허용 여부 확인

3. **Jenkins 빌드 실패**
   - Node.js, Java, Docker가 Jenkins 서버에 설치되어 있는지 확인
   - Jenkins 사용자에게 Docker 권한 부여: `sudo usermod -aG docker jenkins`

**도움이 필요한 경우:**
- Issue를 생성하거나
- 개발팀에 직접 문의

---

⭐ **이 프로젝트가 도움이 되었다면 Star를 눌러주세요!**