import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Send, Loader2 } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface FinanceChatResponse {
  sessionId: string;
  reply: string;
  financeRelated: boolean;
}

function generateId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    if (typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    if (typeof globalThis.crypto.getRandomValues === "function") {
      const buffer = new Uint32Array(4);
      globalThis.crypto.getRandomValues(buffer);
      return Array.from(buffer)
        .map((value) => value.toString(16).padStart(8, "0"))
        .join("-");
    }
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function FinanceChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") {
      return generateId();
    }
    const stored = window.localStorage.getItem("financeChatSessionId");
    if (stored) {
      return stored;
    }
    const generated = generateId();
    window.localStorage.setItem("financeChatSessionId", generated);
    return generated;
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || loading) {
      return;
    }

    const question = input.trim();
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/finance-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question, sessionId }),
      });

      if (!response.ok) {
        throw new Error("서버에서 응답을 받지 못했어요.");
      }

      const data = (await response.json()) as FinanceChatResponse;
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: data.reply,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError("다시 한 번 시도해 주세요. 문제가 지속되면 운영팀에 알려 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">홈</Link>
        <span className="text-slate-400">/</span>
        <h1 className="text-xl font-bold text-slate-800">금융 Q&A 챗봇</h1>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">
        적금, 예금, 투자, 소비습관 등 금융과 관련된 궁금증을 자유롭게 물어보세요. 금융 주제와 무관한 질문에는 답변이 제한될 수 있어요.
      </p>

      <div
        ref={containerRef}
        className="h-[420px] overflow-y-auto rounded-2xl bg-slate-50 p-6 shadow-inner"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            첫 질문을 입력해 보세요!
          </div>
        )}
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-slate-700 border border-slate-100"
                }`}
              >
                {message.content.split("\n").map((line, index) => (
                  <p key={index} className={index > 0 ? "mt-2" : undefined}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
          placeholder="예) 대학생을 위한 초보 투자 방법이 있을까?"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:bg-slate-300"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              보내는 중...
            </>
          ) : (
            <>
              전송
              <Send className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}