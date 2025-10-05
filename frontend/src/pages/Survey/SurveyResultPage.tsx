import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

interface ProductRecommendation {
  productId: string;
  type: "SAVINGS" | "DEPOSIT" | "CARD";
  name: string;
  headline: string;
  benefits: string[];
  caution: string;
  nextAction: string;
}

interface RecommendationResponse {
  summary: string;
  recommendations: ProductRecommendation[];
}

const typeLabel: Record<ProductRecommendation["type"], string> = {
  SAVINGS: "적금",
  DEPOSIT: "예금",
  CARD: "체크카드",
};

const typeColor: Record<ProductRecommendation["type"], string> = {
  SAVINGS: "bg-emerald-100 text-emerald-700",
  DEPOSIT: "bg-indigo-100 text-indigo-700",
  CARD: "bg-amber-100 text-amber-700",
};

export default function SurveyResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as RecommendationResponse | undefined;

  if (!state) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">설문 결과가 존재하지 않습니다. 설문을 다시 진행해 주세요.</p>
        <button
          onClick={() => navigate("/survey")}
          className="mt-4 rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-sm"
        >
          설문으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">홈으로</Link>
        <span className="text-slate-400">/</span>
        <h1 className="text-xl font-bold text-slate-800">추천 결과</h1>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">맞춤 요약</h2>
            <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {state.summary.trim()}
            </pre>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {state.recommendations.map((item) => (
          <div
            key={item.productId}
            className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${typeColor[item.type]}`}>
                {typeLabel[item.type]}
              </span>
              <span className="text-xs text-slate-400">코드: {item.productId}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-800">{item.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.headline}</p>

            <div className="mt-4 rounded-2xl bg-white/70 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">혜택</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {item.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
              <strong className="font-semibold">주의:</strong> {item.caution}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {item.nextAction}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => navigate("/survey")}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          설문 다시 하기
        </button>
        <Link
          to="/chat/finance"
          className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
        >
          챗봇에게 더 물어보기
        </Link>
      </div>
    </div>
  );
}