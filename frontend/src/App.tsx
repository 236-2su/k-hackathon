import { useEffect, useState } from 'react'
import StarField from './components/StarField'
import MeteorShower from './components/MeteorShower'

interface User {
  id: number;
  name: string;
  email: string;
}

export default function App() {
  const [health, setHealth] = useState<string>('checking...')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.text())
      .then(setHealth)
      .catch(() => setHealth('down'))
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative">
      {/* Beautiful Star Animations */}
      <StarField />
      <MeteorShower />
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl animate-pulse">
              🚀 <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient bg-300% bg-gradient-to-r">
                ✨ Hack MVP Platform ✨
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              완전 자동화된 개발 환경으로 빠르게 프로토타입을 만들어보세요
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
                <div className={`h-3 w-3 rounded-full ${health === 'UP' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-white font-mono text-sm">
                  Backend: {health}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              ⚡ 강력한 기능들
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              로컬 개발부터 자동 배포까지 완전 자동화
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-8">
            <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 animate-float hover:scale-105">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 animate-sparkle">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Git Push 배포</h3>
              <p className="text-gray-300 text-center">Git commit & push만으로 Jenkins가 자동 빌드하고 배포합니다</p>
            </div>

            <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 animate-float hover:scale-105" style={{animationDelay: '0.5s'}}>
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 animate-sparkle" style={{animationDelay: '0.5s'}}>
                <span className="text-3xl">🔧</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">완전 자동화</h3>
              <p className="text-gray-300 text-center">Docker 컨테이너화와 CI/CD 파이프라인이 모두 구성됨</p>
            </div>

            <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 animate-float hover:scale-105" style={{animationDelay: '1s'}}>
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 animate-sparkle" style={{animationDelay: '1s'}}>
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">실시간 API</h3>
              <p className="text-gray-300 text-center">Spring Boot REST API가 준비되어 바로 개발 가능</p>
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
              실시간으로 백엔드 API를 테스트해보세요
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                👥 사용자 API 테스트
              </h3>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 shadow-lg font-semibold"
              >
                {loading ? '🔄 로딩중...' : '📊 API 호출하기'}
              </button>
            </div>
            
            {users.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-gray-300 text-xl">API 호출 버튼을 눌러보세요!</p>
                <p className="text-gray-400 text-sm mt-2">Spring Boot 백엔드에서 데이터를 가져옵니다</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-white/20">
                <table className="w-full">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">이름</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">이메일</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/5 divide-y divide-white/10">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                <span key={tech} className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20 hover:bg-white/20 transition-colors">
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
              🚀 자동 배포 테스트 - Jenkins 8080 포트!
            </p>
            <p className="text-sm text-gray-500">
              Jenkins + Docker + React + Spring Boot로 구축된 완전 자동화 개발 환경
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}