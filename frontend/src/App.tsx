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
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow p-6 space-y-6">
        <h1 className="text-3xl font-bold">Hack MVP</h1>
        <p className="text-slate-600">Backend health: <span className="font-mono">{health}</span></p>
        
        <div className="border rounded-xl p-4">
          <h2 className="font-semibold mb-2">Stock Chart Placeholder</h2>
          <p className="text-sm text-slate-500">추후 주식 데이터 연동</p>
        </div>

        <div className="border rounded-xl p-4">
          <h2 className="font-semibold mb-4">File Upload Test</h2>
          <FileUpload />
        </div>
      </div>
    </div>
  )
}
