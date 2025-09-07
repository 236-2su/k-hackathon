# 🏗️ Jenkins CI/CD 설정 가이드

> K-Hackathon 프로젝트를 위한 완전한 Jenkins CI/CD 파이프라인 설정 방법

## 📋 목차

1. [Jenkins 서버 설정](#jenkins-서버-설정)
2. [필요한 플러그인 설치](#필요한-플러그인-설치)
3. [시스템 설정](#시스템-설정)
4. [파이프라인 생성](#파이프라인-생성)
5. [환경변수 설정](#환경변수-설정)
6. [웹훅 설정](#웹훅-설정)
7. [모니터링 및 알림](#모니터링-및-알림)
8. [트러블슈팅](#트러블슈팅)

---

## 🚀 Jenkins 서버 설정

### 1. Jenkins 설치 (Ubuntu/EC2)

```bash
# Java 17 설치
sudo apt update
sudo apt install openjdk-17-jdk -y

# Jenkins 저장소 추가
curl -fsSL https://pkg.jenkins.io/debian/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null
  
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

# Jenkins 설치
sudo apt update
sudo apt install jenkins -y

# Jenkins 서비스 시작
sudo systemctl enable jenkins
sudo systemctl start jenkins
sudo systemctl status jenkins
```

### 2. 초기 설정

```bash
# 초기 관리자 비밀번호 확인
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Jenkins 웹 인터페이스 접속
# http://your-jenkins-server:8080
```

### 3. 필수 도구 설치

```bash
# Docker 설치
sudo apt install docker.io -y
sudo usermod -aG docker jenkins

# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 권한 설정
sudo systemctl restart jenkins
```

---

## 🔌 필요한 플러그인 설치

**Jenkins 관리 → 플러그인 관리 → Available Plugins**에서 다음 플러그인들을 설치:

### 핵심 플러그인
- **Pipeline** - 파이프라인 지원
- **Git** - Git 저장소 연동
- **Docker Pipeline** - Docker 빌드 지원
- **Blue Ocean** - 모던한 파이프라인 UI
- **Workspace Cleanup** - 빌드 후 정리

### 배포 및 알림 플러그인
- **Slack Notification** - Slack 알림
- **Email Extension** - 이메일 알림
- **Build Timestamp** - 빌드 타임스탬프
- **AnsiColor** - 컬러 로그 출력

### 보안 플러그인
- **Credentials** - 인증 정보 관리
- **Role-based Authorization** - 역할 기반 권한 관리

```bash
# 플러그인 설치 후 Jenkins 재시작
sudo systemctl restart jenkins
```

---

## ⚙️ 시스템 설정

### 1. Global Tool Configuration

**Jenkins 관리 → Global Tool Configuration**

#### Git 설정
```
Name: Default
Path to Git executable: git
```

#### JDK 설정
```
Name: Java-17
JAVA_HOME: /usr/lib/jvm/java-17-openjdk-amd64
```

#### Node.js 설정
```
Name: NodeJS-20
Installation directory: /usr/bin
```

#### Docker 설정
```
Name: Docker
Installation root: /usr/bin/docker
```

### 2. 시스템 설정

**Jenkins 관리 → 시스템 설정**

#### 환경변수 설정
```
DOCKER_HOST: unix:///var/run/docker.sock
NODE_ENV: production
```

#### Jenkins URL 설정
```
Jenkins URL: http://your-jenkins-server:8080
```

---

## 🔨 파이프라인 생성

### 1. 새 파이프라인 Job 생성

1. **Jenkins 대시보드 → New Item**
2. **Item 이름**: `k-hackathon-cicd`
3. **Pipeline** 선택 → OK

### 2. Pipeline 설정

#### General 탭
```
✅ GitHub project
Project url: https://github.com/your-username/k-hackathon

✅ This project is parameterized
String Parameter:
- Name: BRANCH
- Default Value: main
- Description: Git branch to build
```

#### Build Triggers 탭
```
✅ GitHub hook trigger for GITScm polling
✅ Poll SCM
Schedule: H/5 * * * *
```

#### Pipeline 탭
```
Definition: Pipeline script from SCM

SCM: Git
Repository URL: https://github.com/your-username/k-hackathon.git
Credentials: (GitHub 인증 정보)
Branch Specifier: */${BRANCH}

Script Path: deploy/Jenkinsfile
```

### 3. 인증 정보 설정

**Jenkins 관리 → Credentials → System → Global credentials**

#### GitHub 인증 정보
```
Kind: Username with password
Username: your-github-username
Password: your-github-token
ID: github-credentials
Description: GitHub Access Token
```

#### Docker Registry 인증 정보 (선택사항)
```
Kind: Username with password
Username: your-dockerhub-username
Password: your-dockerhub-password
ID: dockerhub-credentials
Description: DockerHub Credentials
```

---

## 🌍 환경변수 설정

### 1. Jenkins 환경변수

**파이프라인 설정 → Environment Variables**

```bash
# 프로덕션 환경변수
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=3306
DB_NAME=hackdb
DB_USER=hackuser
DB_PASS=your-db-password

# 애플리케이션 설정
JWT_SECRET=your-jwt-secret-key
CORS_ALLOWED_ORIGINS=http://your-ec2-ip

# Docker 설정
DOCKER_REGISTRY=hack
GIT_SHA=${BUILD_NUMBER}

# 알림 설정
SLACK_CHANNEL=#deployment
SLACK_WEBHOOK=your-slack-webhook-url
```

### 2. Credentials에서 민감한 정보 관리

```bash
# Secret text로 저장
- JWT_SECRET: ID = jwt-secret
- DB_PASS: ID = db-password
- SLACK_WEBHOOK: ID = slack-webhook
```

### 3. Jenkinsfile에서 사용

```groovy
environment {
    JWT_SECRET = credentials('jwt-secret')
    DB_PASS = credentials('db-password')
}
```

---

## 🔗 웹훅 설정

### 1. GitHub 웹훅 설정

**GitHub Repository → Settings → Webhooks → Add webhook**

```
Payload URL: http://your-jenkins-server:8080/github-webhook/
Content type: application/json
Secret: (선택사항)

Which events:
✅ Just the push event
✅ Pull requests
```

### 2. Jenkins에서 웹훅 확인

**Jenkins 관리 → System Log → All Jenkins Logs**

웹훅이 정상적으로 수신되는지 확인

---

## 📊 모니터링 및 알림

### 1. Slack 알림 설정

**Jenkins 관리 → 시스템 설정 → Slack**

```
Workspace: your-workspace
Credential: slack-webhook
Default channel: #deployment
```

### 2. 이메일 알림 설정

**Jenkins 관리 → 시스템 설정 → Extended E-mail Notification**

```
SMTP Server: smtp.gmail.com
SMTP Port: 587
User Name: your-gmail@gmail.com
Password: your-app-password
Use SSL: ✅
```

### 3. Blue Ocean 사용

```
http://your-jenkins-server:8080/blue
```

더 나은 파이프라인 시각화와 로그 확인 가능

---

## 🚀 파이프라인 실행

### 1. 수동 실행

1. **Jenkins 대시보드 → k-hackathon-cicd**
2. **Build with Parameters**
3. **BRANCH**: main 선택
4. **Build** 클릭

### 2. 자동 실행

- **Git push** 시 자동 실행
- **Pull Request** 생성/업데이트 시 실행

### 3. 파이프라인 단계 확인

```
✅ Preparation - 환경 확인
✅ Frontend Build - React 앱 빌드
✅ Backend Build & Test - Spring Boot 빌드/테스트
✅ Docker Build - 이미지 생성 (병렬)
✅ Security Scan - 보안 스캔
✅ Deploy to Staging - 스테이징 배포
✅ Deploy to Production - 프로덕션 배포 (Blue/Green)
✅ Health Check - 배포 후 상태 확인
```

---

## 📈 성능 최적화

### 1. Jenkins 성능 튜닝

```bash
# /etc/default/jenkins 또는 systemd 설정
JAVA_ARGS="-Xmx2048m -Xms512m -Djava.awt.headless=true"
```

### 2. 파이프라인 최적화

```groovy
options {
    // 병렬 빌드 수 제한
    parallelsAlwaysFailFast()
    
    // 빌드 타임아웃 설정
    timeout(time: 30, unit: 'MINUTES')
    
    // 이전 빌드 기록 관리
    buildDiscarder(logRotator(numToKeepStr: '10'))
}
```

### 3. Docker 최적화

```bash
# Docker 빌드 캐시 활용
docker build --cache-from hack-backend:latest -t hack-backend:${GIT_SHA} .

# 멀티스테이지 빌드 사용
# 이미 deploy/docker/에 구현됨
```

---

## 🔒 보안 설정

### 1. Jenkins 보안

**Jenkins 관리 → Security**

```
Security Realm: Jenkins' own user database
Authorization: Matrix-based security

Admin 권한:
- Overall/Administer
- Overall/Read
- Job/Build, Configure, Read

Developer 권한:
- Overall/Read  
- Job/Build, Read
```

### 2. Credentials 보안

```bash
# 중요한 정보는 모두 Credentials에 저장
- 데이터베이스 비밀번호
- JWT 시크릿
- Docker Registry 인증정보
- Slack 웹훅 URL
```

### 3. 네트워크 보안

```bash
# Jenkins 포트 제한 (방화벽 설정)
sudo ufw allow from your-ip-range to any port 8080

# HTTPS 설정 (Let's Encrypt)
sudo certbot --nginx -d jenkins.your-domain.com
```

---

## 🆘 트러블슈팅

### 일반적인 문제들

#### 1. "Permission denied" 오류
```bash
# Jenkins 사용자에게 Docker 권한 부여
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins

# 파일 권한 확인
sudo chown jenkins:jenkins /var/lib/jenkins/workspace/
```

#### 2. Node.js/npm 관련 오류
```bash
# Node.js PATH 설정 확인
sudo su - jenkins
which node  # /usr/bin/node 확인
which npm   # /usr/bin/npm 확인
```

#### 3. Docker 빌드 실패
```bash
# Docker 데몬 상태 확인
sudo systemctl status docker

# Docker 로그 확인
sudo journalctl -u docker.service

# 디스크 공간 확인
df -h
docker system df
```

#### 4. Git 인증 실패
```bash
# SSH 키 설정
sudo su - jenkins
ssh-keygen -t rsa -b 4096 -C "jenkins@your-domain.com"

# GitHub에 공개키 등록
cat ~/.ssh/id_rsa.pub
```

#### 5. 파이프라인 Timeout
```groovy
// Jenkinsfile에 타임아웃 설정
options {
    timeout(time: 45, unit: 'MINUTES')
}
```

### 로그 확인 방법

```bash
# Jenkins 로그
sudo journalctl -u jenkins -f

# 파이프라인 로그
Jenkins UI → Build → Console Output

# Docker 컨테이너 로그
docker logs hack-backend-blue
docker logs hack-nginx
```

---

## 📚 추가 자료

### 공식 문서
- [Jenkins 공식 문서](https://www.jenkins.io/doc/)
- [Pipeline 문법 가이드](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Blue Ocean 사용 가이드](https://www.jenkins.io/doc/book/blueocean/)

### 유용한 명령어
```bash
# Jenkins 관리
sudo systemctl status jenkins
sudo systemctl restart jenkins
sudo tail -f /var/log/jenkins/jenkins.log

# 빌드 디렉토리 정리
sudo rm -rf /var/lib/jenkins/workspace/*

# Jenkins 설정 백업
sudo tar -czf jenkins-backup.tar.gz /var/lib/jenkins/
```

### 모니터링 도구
- **Jenkins Monitoring Plugin**: 시스템 리소스 모니터링
- **Prometheus + Grafana**: 상세한 메트릭 수집 및 대시보드
- **ELK Stack**: 로그 집중화 및 분석

---

## 🎯 결론

이 가이드를 따라하면 완전한 CI/CD 파이프라인을 구축할 수 있습니다:

✅ **자동화된 빌드 및 테스트**  
✅ **Blue/Green 무중단 배포**  
✅ **보안 및 권한 관리**  
✅ **모니터링 및 알림**  
✅ **확장 가능한 아키텍처**

문제가 발생하면 위의 트러블슈팅 섹션을 참고하거나 Jenkins 커뮤니티에 도움을 요청하세요.

---

📝 **이 문서는 K-Hackathon 프로젝트에 특화되었지만, 다른 프로젝트에도 적용 가능합니다.**