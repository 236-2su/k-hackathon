import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ChevronLeft, Info } from "lucide-react";

type AnswerState = Record<string, string[]>;

type PromptParamMap = Record<string, string>;

interface SurveyOption {
  id: string;
  label: string;
}

interface SurveyQuestion {
  id: string;
  title: string;
  description?: string | null;
  type: "single" | "multi";
  multiSelect: boolean;
  maxSelections?: number | null;
  options: SurveyOption[];
}

interface SurveyAnswerPayload {
  questionId: string;
  selectedOptionIds: string[];
}

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

function buildPromptParams(answers: AnswerState): PromptParamMap {
  const first = (id: string) => answers[id]?.[0];
  const categories = answers["spend-focus"] ?? [];
  const age = first("age-band");
  const risk = first("risk-attitude");

  const tone = (() => {
    if (age === "middle-1-2" || age === "middle-3") return "friendly";
    if (risk === "growth") return "energetic";
    return "calm";
  })();

  const map: PromptParamMap = {
    customer_age_band: age ?? "",
    allowance_bracket: first("monthly-funds") ?? "",
    goal_theme: first("saving-goal") ?? "",
    saving_horizon: first("horizon") ?? "",
    risk_profile: risk ?? "",
    top_spending_categories: categories.join(","),
    digital_native: first("digital-behavior") ?? "",
    requires_guardian: first("guardian-preference") ?? "",
    tone,
  };

  return Object.fromEntries(
    Object.entries(map).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export default function SurveyPage() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.localStorage.removeItem("financeSurveyContext");
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/survey");
        if (!response.ok) {
          throw new Error("설문 문항을 불러오지 못했습니다.");
        }
        const data = (await response.json()) as SurveyQuestion[];
        setQuestions(data);
      } catch (err) {
        console.error(err);
        setError("설문 문항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, []);

  const currentQuestion = useMemo(
    () => questions[currentIndex],
    [questions, currentIndex]
  );

  const handleSelect = (optionId: string) => {
    if (!currentQuestion) return;
    setError(null);

    setAnswers(prev => {
      const current = prev[currentQuestion.id] ?? [];

      if (currentQuestion.multiSelect) {
        const limit = currentQuestion.maxSelections ?? currentQuestion.options.length;
        if (current.includes(optionId)) {
          return {
            ...prev,
            [currentQuestion.id]: current.filter(id => id !== optionId),
          };
        }
        if (current.length >= limit) {
          return prev;
        }
        return {
          ...prev,
          [currentQuestion.id]: [...current, optionId],
        };
      }

      return {
        ...prev,
        [currentQuestion.id]: [optionId],
      };
    });
  };

  const handlePrev = () => {
    setCurrentIndex(index => Math.max(index - 1, 0));
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    const selected = answers[currentQuestion.id] ?? [];
    if (selected.length === 0) {
      setError("선택지를 하나 이상 선택해 주세요.");
      return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(index => Math.min(index + 1, questions.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    void submitAnswers();
  };

  const submitAnswers = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const payload: SurveyAnswerPayload[] = questions.map(question => ({
      questionId: question.id,
      selectedOptionIds: answers[question.id] ?? [],
    }));

    const promptParams = buildPromptParams(answers);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers: payload, promptParams }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const body = await response.json();
          setError(body?.message ?? "추천 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        } else {
          setError("추천 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
        return;
      }

      const data = (await response.json()) as RecommendationResponse;

      const enrichedAnswers = questions
        .map(question => {
          const selectedIds = answers[question.id] ?? [];
          if (selectedIds.length === 0) {
            return null;
          }
          return {
            id: question.id,
            title: question.title,
            selections: question.options.filter(option => selectedIds.includes(option.id)),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      const surveyContext = {
        summary: data.summary,
        insights: data.insights,
        savings: data.savings,
        cards: data.cards,
        answers: enrichedAnswers,
        rawAnswerIds: payload,
        promptParams,
        generatedAt: new Date().toISOString(),
      };

      window.localStorage.setItem("financeSurveyContext", JSON.stringify(surveyContext));
      navigate("/survey/result", { state: data });
    } catch (err) {
      console.error(err);
      setError("추천 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        설문 문항을 불러오는 중입니다...
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="rounded-xl bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
        설문 문항을 불러오지 못했습니다.
      </div>
    );
  }

  const selectedOptions = answers[currentQuestion.id] ?? [];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const maxSelections = currentQuestion.maxSelections ?? undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
          홈
        </Link>
        <span className="text-slate-400">/</span>
        <h1 className="text-xl font-bold text-slate-800">청소년 금융 생활 설문</h1>
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-100">
        <div className="h-2 bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-blue-500">
          질문 {currentIndex + 1} / {questions.length}
        </span>
        <h2 className="mt-3 text-lg font-semibold text-slate-800">{currentQuestion.title}</h2>
        {currentQuestion.description && (
          <p className="mt-2 text-sm text-slate-500">{currentQuestion.description}</p>
        )}
        {currentQuestion.type === "multi" && maxSelections && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
            <Info className="h-3 w-3" /> 최대 {maxSelections}개까지 선택할 수 있어요.
          </p>
        )}

        <div className="mt-6 grid gap-3">
          {currentQuestion.options.map(option => {
            const isSelected = selectedOptions.includes(option.id);
            return (
              <button
                type="button"
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <span className="text-xs">선택됨</span>}
              </button>
            );
          })}
        </div>

        {currentQuestion.type === "multi" && maxSelections && (
          <div className="mt-3 text-right text-xs text-slate-400">
            선택 {selectedOptions.length}/{maxSelections}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0 || submitting}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            이전 질문
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:bg-slate-300"
          >
            {currentIndex === questions.length - 1 ? "답변 제출" : "다음"}
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
