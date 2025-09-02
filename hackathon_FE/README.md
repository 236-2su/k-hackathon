# Hackathon FE

React + Vite + TailwindCSS frontend application for hackathon projects.

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your API URL:
```
VITE_API_BASE_URL=http://localhost:8080/api
```

4. Start development server:
```bash
npm run dev
```

Application will be available at http://localhost:3000

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Docker

### Build Docker Image

```bash
docker build -t hackathon-fe .
```

### Run Docker Container

```bash
docker run -p 80:80 hackathon-fe
```

Application will be available at http://localhost

## Features

- ⚡ Vite for fast development
- ⚛️ React 18
- 🎨 TailwindCSS for styling
- 🐳 Docker support with multi-stage build
- 📡 API integration with environment configuration

## Project Structure

```
hackathon_fe/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles with Tailwind
├── public/
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # TailwindCSS configuration
├── postcss.config.js    # PostCSS configuration
├── Dockerfile           # Multi-stage Docker build
├── .env.example         # Environment variables template
└── package.json         # Dependencies and scripts
```