import { useEffect, useState } from "react";

interface StockTutorialModalProps {
  open: boolean;
  onClose: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  bulletPoints: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "게임 흐름 알아보기",
    description: "첫걸음 그룹 한 종목으로 10라운드를 진행해요. 뉴스 한 건을 보고 다음 움직임을 정하면 됩니다.",
    bulletPoints: [
      "라운드가 끝날 때마다 주가가 바뀌고 보유 자산이 계산돼요.",
      "목표는 초기 자산보다 10% 이상 수익을 내는 것이에요.",
      "중간에 다시 보고 싶으면 상단의 안내 버튼을 눌러요.",
    ],
  },
  {
    title: "뉴스 읽고 선택하기",
    description: "뉴스에서 핵심 요약과 예상 변동 폭을 확인한 뒤 매수 또는 매도를 고르세요.",
    bulletPoints: [
      "매수는 가진 현금 안에서만 가능하고 수수료가 조금 빠져요.",
      "매도는 보유한 주식 수량까지만 할 수 있어요.",
      "결정을 입력하고 ‘다음 라운드 시작’을 누르면 주문이 실행돼요.",
    ],
  },
  {
    title: "결과 확인하고 다시 도전하기",
    description: "라운드가 끝나면 가격 변화와 거래 내역을 확인하고 다음 전략을 생각해요.",
    bulletPoints: [
      "최근 라운드 요약에서 가격 변화와 내 거래 내용을 살펴봐요.",
      "현재 자산 카드에서 총 자산과 수익률을 확인할 수 있어요.",
      "목표를 이루지 못했으면 다시 시작해서 더 나은 선택을 해봐요.",
    ],
  },
];

export function StockTutorialModal({ open, onClose }: StockTutorialModalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const currentStep = tutorialSteps[stepIndex];
  const totalSteps = tutorialSteps.length;
  const isLastStep = stepIndex === totalSteps - 1;

  const goToPrevious = () => {
    setStepIndex((index) => Math.max(0, index - 1));
  };

  const goToNext = () => {
    setStepIndex((index) => Math.min(totalSteps - 1, index + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              튜토리얼 {stepIndex + 1} / {totalSteps}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {currentStep.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="튜토리얼 닫기"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="sr-only">닫기</span>
            ✕
          </button>
        </header>

        <main className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-slate-700">{currentStep.description}</p>
          <ul className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            {currentStep.bulletPoints.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </main>

        <footer className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {tutorialSteps.map((_, index) => (
              <span
                key={index}
                className={`h-2 w-10 rounded-full transition ${
                  index === stepIndex ? "bg-blue-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={goToPrevious}
              disabled={stepIndex === 0}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              이전
            </button>
            {isLastStep ? (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 sm:flex-none"
              >
                시작하기
              </button>
            ) : (
              <button
                type="button"
                onClick={goToNext}
                className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 sm:flex-none"
              >
                다음
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
