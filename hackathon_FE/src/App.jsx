import { useState, useEffect } from 'react'

function App() {
  const [pingResult, setPingResult] = useState('')
  const [loading, setLoading] = useState(false)

  const pingAPI = async () => {
    setLoading(true)
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL
      if (!baseURL) {
        setPingResult('VITE_API_BASE_URL not configured')
        return
      }
      
      const response = await fetch(`${baseURL}/ping`)
      const data = await response.text()
      setPingResult(data)
    } catch (error) {
      setPingResult(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    pingAPI()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Hackathon FE
        </h1>
        <div className="space-y-4">
          <button
            onClick={pingAPI}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded"
          >
            {loading ? 'Pinging...' : 'Ping API'}
          </button>
          <div className="p-4 bg-gray-50 rounded border">
            <p className="text-sm text-gray-600 mb-1">API Response:</p>
            <p className="font-mono text-sm">
              {pingResult || 'No response yet'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App