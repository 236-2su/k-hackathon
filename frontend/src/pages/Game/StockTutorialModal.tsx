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
    title: "게임 구조 이해하기",
    description: "총 10라운드 동안 세 종목의 뉴스를 보고 앞으로의 가격 변화를 예상해요.",
    bulletPoints: [
      "라운드마다 삼성전자·카카오·테슬라 뉴스가 각각 한 건씩 등장해요.",
      "뉴스는 긍정, 부정, 중립 힌트와 예상 변동 폭을 제공해요.",
      "모든 라운드를 마친 뒤 수익률이 +10% 이상이면 승리예요.",
    ],
  },
  {
    title: "뉴스 해석하고 거래하기",
    description: "각 뉴스 카드에서 핵심 요약과 예상 변동 폭을 확인한 뒤 매수·매도를 결정하세요.",
    bulletPoints: [
      "매수는 보유 현금 한도 내에서만 가능하고 수수료가 차감돼요.",
      "매도는 보유 주식 수량까지만 가능해요. 공매도는 지원하지 않아요.",
      "라운드 진행 버튼을 누르면 입력한 주문이 한 번에 실행돼요.",
    ],
  },
  {
    title: "목표 수익률 달성하기",
    description: "라운드 결과와 그래프를 보면서 다음 전략을 세우고 목표 수익률을 노려봐요.",
    bulletPoints: [
      "라운드가 끝나면 주가 변동과 거래 내역이 요약돼요.",
      "현재 자산과 수익률을 항상 확인하며 리스크를 조절하세요.",
      "목표 수익률 10%를 넘기면 승리! 부족하면 다시 도전할 수 있어요.",
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
