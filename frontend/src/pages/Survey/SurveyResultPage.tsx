import { useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Lightbulb, PiggyBank, CreditCard, Smartphone } from "lucide-react";

interface ProductRecommendation {
  productId: string;
  type: "SAVINGS" | "DEPOSIT" | "CARD";
  name: string;
  headline: string;
  benefits: string[];
  caution: string;
  nextAction: string;
  minMonthlyAmount?: number | null;
  maxMonthlyAmount?: number | null;
  guardianRequired: boolean;
  highlightCategories: string[];
  digitalFriendly: boolean;
}

interface RecommendationResponse {
  summary: string;
  insights: string[];
  savings: ProductRecommendation[];
  cards: ProductRecommendation[];
}

interface LegacyRecommendationResponse {
  summary?: string;
  insights?: string[];
  savings?: ProductRecommendation[];
  cards?: ProductRecommendation[];
  recommendations?: ProductRecommendation[];
}

interface StoredSurveyContext extends RecommendationResponse {
  generatedAt?: string;
  promptParams?: Record<string, string>;
  answers?: unknown;
  rawAnswerIds?: unknown;
}

function formatMonthlyRange(min?: number | null, max?: number | null) {
  if (min == null && max == null) {
    return null;
  }
  if (min != null && max != null) {
    return `${min.toLocaleString()}원~${max.toLocaleString()}원 월 적립`;
  }
  if (min != null) {
    return `${min.toLocaleString()}원 이상 적립`;
  }
  return `${max?.toLocaleString()}원 이하 적립 추천`;
}

function splitRecommendations(items?: ProductRecommendation[]) {
  if (!items || items.length === 0) {
    return { savings: [] as ProductRecommendation[], cards: [] as ProductRecommendation[] };
  }
  const savings = items.filter(item => item.type === "SAVINGS" || item.type === "DEPOSIT");
  const cards = items.filter(item => item.type === "CARD");
  return { savings, cards };
}

function dedupeByProductId(items: ProductRecommendation[]): ProductRecommendation[] {
  const map = new Map<string, ProductRecommendation>();
  items.forEach(item => {
    if (!map.has(item.productId)) {
      map.set(item.productId, item);
    }
  });
  return Array.from(map.values());
}

function ProductBadgeList({ item }: { item: ProductRecommendation }) {
  const badges: React.ReactNode[] = [];
  const monthlyRange = formatMonthlyRange(item.minMonthlyAmount, item.maxMonthlyAmount);

  if (monthlyRange) {
    badges.push(
      <span key="range" className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
        {monthlyRange}
      </span>
    );
  }

  if (item.highlightCategories.length > 0) {
    badges.push(
      <span key="highlight" className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
        추천 혜택: {item.highlightCategories.join(", ")}
      </span>
    );
  }

  if (item.digitalFriendly) {
    badges.push(
      <span key="digital" className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-600">
        <Smartphone className="h-3 w-3" /> 모바일 우대
      </span>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  return <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>;
}

function ProductCard({ item }: { item: ProductRecommendation }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">ID: {item.productId}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-slate-800">{item.name}</h3>
      <p className="mt-1 text-sm text-slate-600">{item.headline}</p>

      <ProductBadgeList item={item} />

      <div className="mt-4 rounded-2xl bg-white/70 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">주요 혜택</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {item.benefits.map((benefit, index) => (
            <li key={index}>{benefit}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl bg-white/70 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">유의 사항</h4>
        <p className="mt-2 text-sm text-slate-600">{item.caution}</p>
      </div>
    </div>
  );
}

function ProductSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: ProductRecommendation[];
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        {icon}
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(item => (
          <ProductCard key={item.productId} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function SurveyResultPage() {
  const topRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = (location.state ?? null) as LegacyRecommendationResponse | RecommendationResponse | null;

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "auto" });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  const storedContext: StoredSurveyContext | null = useMemo(() => {
    try {
      const raw = window.localStorage.getItem("financeSurveyContext");
      if (!raw) return null;
      return JSON.parse(raw) as StoredSurveyContext;
    } catch (err) {
      console.warn("Failed to parse stored survey context", err);
      return null;
    }
  }, []);

  const resolvedSummary = useMemo(() => {
    const fromState = locationState && "summary" in locationState ? locationState.summary ?? "" : "";
    if (fromState.trim()) {
      return fromState.trim();
    }
    const fromStorage = storedContext?.summary ?? "";
    if (fromStorage.trim()) {
      return fromStorage.trim();
    }
    return "추천 요약을 불러오지 못했습니다. 아래 추천 상품을 확인해 보세요.";
  }, [locationState, storedContext]);

  const resolvedInsights = useMemo(() => {
    const base = locationState && "insights" in locationState ? locationState.insights ?? [] : [];
    const fallback = base.length > 0 ? base : storedContext?.insights ?? [];
    return Array.from(new Set(fallback.map(line => line.trim()).filter(Boolean)));
  }, [locationState, storedContext]);

  const { savings, cards } = useMemo(() => {
    let savingsList: ProductRecommendation[] = [];
    let cardsList: ProductRecommendation[] = [];

    if (locationState) {
      if ("savings" in locationState && Array.isArray(locationState.savings)) {
        savingsList = locationState.savings ?? [];
      }
      if ("cards" in locationState && Array.isArray(locationState.cards)) {
        cardsList = locationState.cards ?? [];
      }
      if (savingsList.length === 0 && cardsList.length === 0 && "recommendations" in locationState && locationState.recommendations) {
        const splitted = splitRecommendations(locationState.recommendations);
        savingsList = splitted.savings;
        cardsList = splitted.cards;
      }
    }

    if (savingsList.length === 0 && storedContext?.savings) {
      savingsList = storedContext.savings;
    }
    if (cardsList.length === 0 && storedContext?.cards) {
      cardsList = storedContext.cards;
    }

    return {
      savings: dedupeByProductId(savingsList ?? []),
      cards: dedupeByProductId(cardsList ?? []),
    };
  }, [locationState, storedContext]);

  const hasAnyRecommendation = savings.length > 0 || cards.length > 0;

  if (!hasAnyRecommendation && resolvedInsights.length === 0 && !resolvedSummary) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">추천 데이터를 찾지 못했습니다. 설문을 다시 진행해 주세요.</p>
        <button
          onClick={() => navigate("/survey", { replace: true })}
          className="mt-4 rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-sm"
        >
          설문 다시 하기
        </button>
      </div>
    );
  }

  return (
    <div ref={topRef} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
          홈으로 가기
        </Link>
        <span className="text-slate-400">/</span>
        <h1 className="text-xl font-bold text-slate-800">맞춤 추천 결과</h1>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-800">한눈에 보는 요약</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{resolvedSummary}</p>
          </div>
        </div>
      </div>

      {resolvedInsights.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-800">이렇게 활용해 보세요</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {resolvedInsights.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <ProductSection
        title="추천 적금·예금"
        icon={<PiggyBank className="h-5 w-5 text-emerald-500" />}
        items={savings}
      />

      <ProductSection
        title="추천 체크카드"
        icon={<CreditCard className="h-5 w-5 text-indigo-500" />}
        items={cards}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
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
          금융 챗봇에게 이어서 물어보기
        </Link>
      </div>
    </div>
  );
}
