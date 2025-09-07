import { useEffect, useState } from 'react'
import { FileUpload } from './components/FileUpload'

export default function App() {
  const [health, setHealth] = useState<string>('checking...')

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.text())
      .then(setHealth)
      .catch(() => setHealth('down'))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              🚀 <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Hack MVP Platform
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              완전 자동화된 개발 환경으로 빠르게 프로토타입을 만들어보세요
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
                <div className={"h-3 w-3 rounded-full " + (health === 'UP' ? 'bg-green-400' : 'bg-red-400')}></div>
                <span className="text-white font-mono text-sm">
                  System: {health}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              ⚡ 강력한 기능들
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              개발부터 배포까지 모든 것이 자동화되어 있습니다
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-8">
            <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">빠른 배포</h3>
              <p className="text-gray-300 text-center">Git push 한 번으로 Jenkins가 자동으로 빌드하고 배포합니다</p>
            </div>

            <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                <span className="text-3xl">🔧</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">완전 자동화</h3>
              <p className="text-gray-300 text-center">Docker 컨테이너화와 CI/CD 파이프라인이 모두 구성되어 있습니다</p>
            </div>

            <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                <span className="text-3xl">📁</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">파일 관리</h3>
              <p className="text-gray-300 text-center">이미지와 파일 업로드 API가 내장되어 바로 사용 가능합니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Section */}
      <div className="py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              🎮 라이브 데모
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              실시간으로 파일 업로드 기능을 테스트해보세요
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              📁 파일 업로드 테스트
            </h3>
            <FileUpload />
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="py-16 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-8">🛠️ 기술 스택</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {['React + TypeScript', 'Spring Boot', 'Docker', 'Jenkins CI/CD', 'Nginx', 'MySQL', 'TailwindCSS'].map((tech) => (
                <span key={tech} className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-2">
              🚀 Hack MVP Platform
            </p>
            <p className="text-sm text-gray-500">
              Git push만으로 자동 배포되는 완전 자동화 개발 환경 • Jenkins + Docker + React + Spring Boot
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
