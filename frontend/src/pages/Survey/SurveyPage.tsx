import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, ChevronLeft } from "lucide-react";

interface SurveyOption {
  id: string;
  label: string;
}

interface SurveyQuestion {
  id: string;
  title: string;
  description?: string | null;
  multiSelect: boolean;
  options: SurveyOption[];
}

interface SurveyAnswerPayload {
  questionId: string;
  selectedOptionIds: string[];
}

interface RecommendationResponse {
  summary: string;
  recommendations: unknown[];
}

export default function SurveyPage() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/survey");
        if (!response.ok) {
          throw new Error("설문 정보를 불러오지 못했어요.");
        }
        const data = (await response.json()) as SurveyQuestion[];
        setQuestions(data);
      } catch (err) {
        console.error(err);
        setError("설문 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);

  const handleSelect = (optionId: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const current = prev[currentQuestion.id] ?? [];
      if (currentQuestion.multiSelect) {
        return {
          ...prev,
          [currentQuestion.id]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId].slice(0, 5),
        };
      }
      return {
        ...prev,
        [currentQuestion.id]: [optionId],
      };
    });
  };

  const handlePrev = () => {
    setError(null);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = async () => {
    if (!currentQuestion) return;
    const selected = answers[currentQuestion.id] ?? [];
    if (selected.length === 0) {
      setError("한 가지 이상 선택해 주세요.");
      return;
    }

    setError(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    setSubmitting(true);
    try {
      const payload: SurveyAnswerPayload[] = questions.map((question) => ({
        questionId: question.id,
        selectedOptionIds: answers[question.id] ?? [],
      }));

      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers: payload }),
      });

      if (!response.ok) {
        throw new Error("추천을 생성하지 못했어요.");
      }

      const data = (await response.json()) as RecommendationResponse;

      const enrichedAnswers = questions
        .map((question) => {
          const selectedIds = answers[question.id] ?? [];
          if (selectedIds.length === 0) {
            return null;
          }

          const selections = selectedIds.map((optionId) => {
            const option = question.options.find((item) => item.id === optionId);
            return {
              id: optionId,
              label: option ? option.label : optionId,
            };
          });

          return {
            id: question.id,
            title: question.title,
            description: question.description ?? undefined,
            multiSelect: question.multiSelect,
            selections,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      const surveyContext = {
        summary: data.summary,
        answers: enrichedAnswers,
        rawAnswerIds: payload,
        generatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem("financeSurveyContext", JSON.stringify(surveyContext));

      navigate("/survey/result", { state: data });
    } catch (err) {
      console.error(err);
      setError("추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        질문을 불러오는 중입니다...
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="rounded-xl bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
        질문 데이터를 불러오지 못했어요.
      </div>
    );
  }

  const selectedOptions = answers[currentQuestion.id] ?? [];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">홈</Link>
        <span className="text-slate-400">/</span>
        <h1 className="text-xl font-bold text-slate-800">청소년 금융상품 설문</h1>
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-100">
        <div
          className="h-2 bg-blue-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-blue-500">
          질문 {currentIndex + 1} / {questions.length}
        </span>
        <h2 className="mt-3 text-lg font-semibold text-slate-800">{currentQuestion.title}</h2>
        {currentQuestion.description && (
          <p className="mt-2 text-sm text-slate-500">{currentQuestion.description}</p>
        )}

        <div className="mt-6 grid gap-3">
          {currentQuestion.options.map((option) => {
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
            {currentIndex === questions.length - 1 ? "결과 보기" : "다음"}
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
