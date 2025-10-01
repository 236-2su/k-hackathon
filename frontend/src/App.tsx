import { useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "");

type HealthStatus = "checking" | "UP" | "down";

export default function App() {
  const [health, setHealth] = useState<HealthStatus>("checking");
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`요청이 실패했습니다. (status ${response.status})`);
      }
      const result = await response.text();
      setHealth(result === "UP" ? "UP" : "down");
    } catch (err) {
      setHealth("down");
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setChecking(false);
      setLastCheckedAt(new Date());
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-8 py-16 px-4">
      <section className="w-full max-w-xl border border-slate-700 rounded-xl p-6 bg-slate-900/60 shadow-lg space-y-6">
        <header>
          <h1 className="text-3xl font-bold mb-3">백엔드 Health 체크</h1>
          <p className="text-sm text-slate-400">API 엔드포인트: {`${API_BASE_URL}/health`}</p>
        </header>

        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${health === "UP" ? "bg-emerald-400" : "bg-rose-400"}`}
            aria-hidden
          />
          <span className="text-lg font-medium">
            {health === "checking" && "상태 확인 전입니다."}
            {health === "UP" && "서비스가 정상입니다."}
            {health === "down" && "상태를 확인할 수 없습니다."}
          </span>
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        {lastCheckedAt && (
          <p className="text-xs text-slate-500">
            마지막 확인: {lastCheckedAt.toLocaleTimeString()} ({lastCheckedAt.toLocaleDateString()})
          </p>
        )}

        <button
          onClick={checkHealth}
          disabled={checking}
          className="w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-400 rounded-md text-base font-semibold disabled:opacity-60"
        >
          {checking ? "확인 중..." : "Health 체크 실행"}
        </button>
      </section>
    </main>
  );
}