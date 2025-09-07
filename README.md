# 🚀 K-Hackathon 배포 가이드

> Jenkins CI/CD + Blue/Green 무중단 배포 시스템 완전 가이드

## 📋 현재 상태

**프로덕션 환경:** http://3.26.8.188 (정상 운영 중)

**현재 배포된 서비스:**
- ✅ Frontend: React + Vite + Tailwind CSS  
- ✅ Backend: Spring Boot + MySQL
- ✅ Infrastructure: Docker + nginx + Blue/Green 배포
- ✅ CI/CD: Jenkins 파이프라인 구축 완료

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Jenkins     │───▶│   AWS EC2       │───▶│   AWS RDS       │
│   (CI/CD 서버)   │    │ (Docker Host)   │    │   (MySQL DB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │      nginx      │ ◄── 리버스 프록시
                    │  (포트 80/443)   │
                    └─────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
        ┌─────────────────┐      ┌─────────────────┐
        │   Frontend      │      │ Backend (Blue/  │
        │ (React 앱)      │      │ Green 배포)     │
        └─────────────────┘      └─────────────────┘
```

## 🚀 배포 방법

### 1️⃣ 자동 배포 (Jenkins CI/CD)

**추천 방법 - 가장 간단함**

1. 코드를 GitHub에 푸시:
   ```bash
   git add .
   git commit -m "your changes"
   git push origin master
   ```

2. Jenkins에서 자동으로 배포 실행됨:
   - Frontend 빌드
   - Backend 빌드 및 테스트
   - Docker 이미지 생성
   - Blue/Green 무중단 배포

### 2️⃣ 수동 배포 (서버에서 직접)

**Jenkins 없이 배포하는 방법**

```bash
# 1. EC2 서버 접속
ssh -i hack-keypair.pem ubuntu@3.26.8.188

# 2. 최신 코드 가져오기
cd ~/k-hackathon
git pull origin master

# 3. Blue/Green 배포 실행
bash deploy/scripts/blue_green_switch.sh latest
```

## 🔄 Blue/Green 배포 시스템

### 작동 원리
1. **Blue** 환경에서 서비스 중 → **Green** 환경에 새 버전 배포
2. Health Check 통과 시 트래픽을 Green으로 전환
3. Blue 환경 중지 → 다음 배포 시에는 Blue가 새 환경이 됨

### 현재 활성 환경 확인
```bash
# EC2 서버에서
cat ~/deployment/active_color
# 결과: blue 또는 green
```

### 수동 스위치
```bash
# Blue ↔ Green 전환
cd ~/k-hackathon
bash deploy/scripts/blue_green_switch.sh [버전태그]
```

## 🐳 Docker 컨테이너 관리

### 현재 실행 중인 컨테이너 확인
```bash
docker ps
```

### 컨테이너 로그 확인
```bash
# nginx 로그
docker logs hack-nginx

# 백엔드 로그 (Blue 환경)
docker logs hack-backend-blue

# 백엔드 로그 (Green 환경)  
docker logs hack-backend-green

# 프론트엔드 로그
docker logs hack-frontend
```

### 서비스 재시작
```bash
cd ~/k-hackathon

# nginx만 재시작
docker compose -f deploy/docker-compose.prod.yml restart nginx

# 전체 스택 재시작
docker compose -f deploy/docker-compose.prod.yml down
docker compose -f deploy/docker-compose.prod.yml up -d
```

## 🔧 문제 해결

### ❌ 웹사이트에 접속이 안 될 때

1. **컨테이너 상태 확인:**
   ```bash
   docker ps -a
   ```

2. **nginx 로그 확인:**
   ```bash
   docker logs hack-nginx --tail=50
   ```

3. **nginx 재시작:**
   ```bash
   cd ~/k-hackathon
   docker compose -f deploy/docker-compose.prod.yml restart nginx
   ```

### ❌ Backend API 오류 (502 Bad Gateway)

1. **백엔드 컨테이너 상태 확인:**
   ```bash
   docker ps | grep backend
   ```

2. **백엔드 로그 확인:**
   ```bash
   # 현재 활성 환경 확인 후 해당 로그 확인
   cat ~/deployment/active_color
   docker logs hack-backend-blue --tail=50  # 또는 green
   ```

3. **데이터베이스 연결 확인:**
   ```bash
   # 환경변수 파일 확인
   cat ~/k-hackathon/deploy/env/.env.prod
   ```

### ❌ Jenkins 빌드 실패

1. **Jenkins 웹 인터페이스에서 Console Output 확인**

2. **일반적인 해결 방법:**
   ```bash
   # Jenkins 서버에서 Docker 권한 확인
   sudo usermod -aG docker jenkins
   sudo systemctl restart jenkins
   ```

### ❌ 전체 시스템 재시작이 필요한 경우

```bash
# EC2 서버에서
cd ~/k-hackathon

# 모든 컨테이너 중지 및 제거
docker compose -f deploy/docker-compose.prod.yml down

# 이미지 다시 빌드하며 시작
docker compose -f deploy/docker-compose.prod.yml up -d --build

# Blue/Green 배포 초기화
echo "blue" > ~/deployment/active_color
```

## 📊 상태 확인 명령어

### Health Check
```bash
# 프론트엔드 접속 테스트
curl -I http://3.26.8.188/

# 백엔드 API 테스트
curl http://3.26.8.188/api/health
# 응답: UP

# 백엔드 상세 헬스체크
curl http://3.26.8.188/api/actuator/health
```

### 시스템 리소스 확인
```bash
# 디스크 사용량
df -h

# 메모리 사용량
free -h

# Docker 이미지 및 컨테이너 용량
docker system df
```

## 📁 중요 파일 및 디렉토리

```
~/k-hackathon/                    # 메인 프로젝트
├── deploy/
│   ├── docker-compose.prod.yml   # Docker Compose 설정
│   ├── scripts/blue_green_switch.sh  # Blue/Green 배포 스크립트
│   ├── env/.env.prod             # 환경변수 (DB 설정 등)
│   └── Jenkinsfile               # Jenkins 파이프라인

~/deployment/                     # Jenkins 배포 작업 디렉토리
├── active_color                  # 현재 활성 환경 (blue/green)
├── docker-compose.prod.yml       # 배포용 설정 (복사본)
└── *.tar                        # Docker 이미지 파일들
```

## 🔐 환경변수 설정

**중요 설정 파일:** `~/k-hackathon/deploy/env/.env.prod`

```env
# 데이터베이스 설정
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=3306
DB_NAME=hackathon
DB_USER=root
DB_PASS=your-password

# 애플리케이션 설정
JWT_SECRET=your-jwt-secret-key
CORS_ALLOWED_ORIGINS=http://3.26.8.188
```

## 🆘 긴급 상황 대응

### 🚨 사이트 다운 시 즉시 복구
```bash
# 1. EC2 접속
ssh -i hack-keypair.pem ubuntu@3.26.8.188

# 2. 빠른 재시작
cd ~/k-hackathon
docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate

# 3. 5분 후에도 안 되면 전체 재시작
sudo reboot
```

### 🚨 롤백 (이전 버전으로 되돌리기)
```bash
# 현재 환경의 반대로 전환 (이전 버전이 남아있음)
cd ~/k-hackathon
bash deploy/scripts/blue_green_switch.sh previous
```

## 📞 연락처

**문제 발생 시 연락:**
- 개발팀 Slack 채널
- 또는 GitHub Issues에 문제 상황 등록

---

## 💡 팁

1. **정기 백업:** 매일 RDS 스냅샷 자동 생성 설정됨
2. **로그 관리:** Docker 로그는 자동으로 로테이션됨
3. **모니터링:** CloudWatch로 시스템 메트릭 확인 가능
4. **보안:** 정기적으로 Docker 이미지 업데이트 권장

⭐ **이 가이드로 문제가 해결되지 않으면 개발팀에 연락주세요!**