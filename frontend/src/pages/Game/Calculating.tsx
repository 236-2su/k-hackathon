import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { GameTutorialModal } from "./components/GameTutorialModal";
import { GameResultModal } from "./components/GameResultModal";
import { getZepContext, postReward } from "./gameApi";
import type { GameType } from "./gameApi";
import type { TutorialStep } from "./components/GameTutorialModal";
import type { ReactNode } from "react";

interface MenuItem {
  name: string;
  price: number;
}

interface MenuBoard {
  name: string;
  menuItems: MenuItem[];
}

interface OrderItem {
  menuName: string;
  quantity: number;
}

interface ProblemResponse {
  menuBoard: MenuBoard;
  orders: OrderItem[];
  answer: number;
}

interface UserAnswer {
  answer: number;
}

interface GameResultResponse {
  correctCount: number;
  score: number;
}

interface ResultState {
  earnedGold: number;
  success: boolean;
  highlights: string[];
  details: ReactNode;
}

const GAME_TYPE: GameType = "calculating";
const QUESTION_TIME_LIMIT = 10;
const GOLD_PER_ITEM = 300;
const MIN_SUCCESS_COUNT = 1;

const tutorialSteps: TutorialStep[] = [
  {
    title: "계산 규칙 확인",
    description: "메뉴판과 주문 힌트를 보고 합계를 계산하세요.",
  },
  {
    title: "10문제 진행",
    description: "각 문제의 총합을 입력하면 다음 문제로 넘어갑니다.",
  },
  {
    title: "성공 조건",
    description: "정답 1개 이상이면 성공! 품목 × 300골드가 적립됩니다.",
  },
];

export default function Calculating() {
  const { zepUserId } = useMemo(() => getZepContext(), []);

  const [menuBoard, setMenuBoard] = useState<MenuBoard | null>(null);
  const [problems, setProblems] = useState<ProblemResponse[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const [result, setResult] = useState<ResultState | null>(null);
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [rewardSubmitted, setRewardSubmitted] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setMenuBoard(null);
    setProblems([]);
    setCurrentProblemIndex(0);
    setInputValue("");
    setTimeLeft(QUESTION_TIME_LIMIT);
    setIsGameRunning(false);
    setIsGameEnded(false);
    setAnswers([]);
    setFeedback(null);
    setResult(null);
    setRewardError(null);
    setRewardSubmitted(false);
  }, []);

  const fetchProblems = useCallback(async () => {
    resetState();
    setShowTutorial(false);
    try {
      const response = await fetch("/api/games/calculating/start");
      if (!response.ok) {
        throw new Error("문제를 불러오지 못했습니다.");
      }
      const data = (await response.json()) as ProblemResponse[];
      setProblems(data);
      if (data.length > 0) {
        setMenuBoard(data[0].menuBoard);
      }
      setCurrentProblemIndex(0);
      setInputValue("");
      setAnswers([]);
      setFeedback(null);
      setTimeLeft(QUESTION_TIME_LIMIT);
      setIsGameRunning(true);
      setIsGameEnded(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      console.error(error);
      setIsGameRunning(false);
      setResult({
        earnedGold: 0,
        success: false,
        highlights: ["문제를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."],
        details: null,
      });
    }
  }, [resetState]);

  const submitAnswers = useCallback(async () => {
    try {
      const response = await fetch("/api/games/calculating/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": zepUserId,
        },
        body: JSON.stringify(answers),
      });
      if (!response.ok) throw new Error("결과를 제출하지 못했습니다.");
      const data = (await response.json()) as GameResultResponse;

      const totalItems = problems
        .flatMap((problem) => problem.orders)
        .reduce((acc, order) => acc + order.quantity, 0);

      const success = data.correctCount >= MIN_SUCCESS_COUNT;
      const earnedGold = success ? totalItems * GOLD_PER_ITEM : 0;
      // 상세 합계 표시는 생략합니다.

      setResult({
        earnedGold,
        success,
        highlights: [
          `정답 수: ${data.correctCount} / ${problems.length}`,
        ],
        details: null,
      });

      setIsGameRunning(false);
      setIsGameEnded(true);
    } catch (error) {
      console.error(error);
      setIsGameRunning(false);
      setResult({
        earnedGold: 0,
        success: false,
        highlights: ["결과를 제출하지 못했습니다. 잠시 후 다시 시도해주세요."],
        details: null,
      });
    }
  }, [answers, problems, zepUserId]);

  const handleNextProblem = useCallback(() => {
    if (!isGameRunning || problems.length === 0) return;

    if (currentProblemIndex < 0 || currentProblemIndex >= problems.length) return;
    const cur = problems[currentProblemIndex];
    const userAnswer = parseInt(inputValue, 10);
    const isCorrect = userAnswer === cur.answer;

    setAnswers((prev) => [...prev, { answer: Number.isNaN(userAnswer) ? 0 : userAnswer }]);
    setFeedback(isCorrect ? "correct" : "wrong");
    setInputValue("");

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentProblemIndex < problems.length - 1) {
        setCurrentProblemIndex((prevIndex) => prevIndex + 1);
        setTimeLeft(QUESTION_TIME_LIMIT);
        inputRef.current?.focus();
      } else {
        submitAnswers();
      }
    }, 800);
  }, [isGameRunning, problems, currentProblemIndex, inputValue, submitAnswers]);

  useEffect(() => {
    if (!isGameRunning) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleNextProblem();
          return QUESTION_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGameRunning, handleNextProblem]);

  useEffect(() => {
    if (problems.length > 0 && currentProblemIndex < problems.length) {
      setMenuBoard(problems[currentProblemIndex].menuBoard);
    }
  }, [currentProblemIndex, problems]);
  // 현재 문제(안전 가드 포함)
  const currentProblem =
    currentProblemIndex >= 0 && currentProblemIndex < problems.length
      ? problems[currentProblemIndex]
      : undefined;


  

  const notifyZep = useCallback((success: boolean, earnedGold: number) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.parent?.postMessage(
        { type: "gameResult", success, gold: earnedGold, gameType: GAME_TYPE },
        "*",
      );
    } catch (err) {
      console.warn("Failed to post result to ZEP:", err);
    }
  }, []);

  const handleResultConfirm = async () => {
    if (!result) return;

    if (!rewardSubmitted) {
      setRewardSubmitting(true);
      setRewardError(null);
      try {
        await postReward({
          zepUserId,
          gameType: GAME_TYPE,
          success: result.success,
          earnedGold: result.earnedGold,
        });
        setRewardSubmitted(true);
        notifyZep(result.success, result.earnedGold);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setRewardError(message);
        setRewardSubmitting(false);
        return;
      }
      setRewardSubmitting(false);
    }

    setResult(null);
    setIsGameEnded(false);
  };

  const handleRetry = () => {
    setResult(null);
    setIsGameEnded(false);
    setRewardSubmitted(false);
    setRewardError(null);
    setShowTutorial(true);
  };

  return (
    <div className="p-4 w-full max-w-5xl mx-auto">
      <div className="relative text-center">
        <h1 className="title text-[28px]">계산 게임</h1>
        <p className="text-center py-4 text-[#666]">메뉴판을 보고 합계를 계산해 정답을 제출하세요.</p>
      </div>

      <div className="flex flex-col items-center justify-center mt-8 relative">
        {!isGameRunning && !isGameEnded && !showTutorial && (
          <button
            onClick={() => setShowTutorial(true)}
            className="bg-[#326256] text-white px-6 py-3 rounded-lg text-lg font-semibold"
          >
            튜토리얼 보기
          </button>
        )}

        {isGameRunning && currentProblem && (
          <div className="flex flex-col items-center w-full gap-6">
            <div className="flex items-baseline gap-3">
              <div className="text-2xl font-bold">
                문제 {currentProblemIndex + 1} / {problems.length}
              </div>
              <div className="text-xl text-[#e74c3c]">{timeLeft}초</div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 w-full">
              <div className="flex gap-4 items-start">
                <img
                  src="/character.png"
                  alt="캐릭터"
                  className="w-56 h-56 object-contain"
                />
                <div className="relative bg-blue-100 p-4 rounded-lg shadow-md min-w-[220px]">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-blue-100"></div>
                  <p className="text-lg font-semibold">주문 목록</p>
                  <ul className="mt-2">
                    {currentProblem.orders.map((order, index) => (
                      <li key={index} className="text-md">
                        {order.menuName} {order.quantity}개
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {menuBoard && (
                <div className="bg-gray-100 p-4 rounded-lg shadow-md w-56">
                  <h2 className="text-lg font-bold mb-2">{menuBoard.name}</h2>
                  <ul className="space-y-1">
                    {menuBoard.menuItems.map((item, index) => (
                      <li key={index} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span>{item.price.toLocaleString()}원</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-4 items-center">
              <input
                ref={inputRef}
                type="number"
                className="border-2 border-gray-300 p-3 rounded-lg text-center text-2xl w-48"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleNextProblem();
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleNextProblem}
                className="bg-[#326256] text-white px-6 rounded-lg text-md font-semibold"
              >
                정답 제출
              </button>
            </div>

            {feedback && (
              <div
                className={`mt-2 text-2xl font-bold ${
                  feedback === "correct" ? "text-green-600" : "text-red-600"
                }`}
              >
                {feedback === "correct" ? "정답!" : "오답!"}
              </div>
            )}
          </div>
        )}
      </div>

      <GameTutorialModal
        open={showTutorial}
        title="계산 게임 가이드"
        subtitle="3단계 튜토리얼을 확인하고 게임을 시작하세요."
        steps={tutorialSteps}
        onStart={() => {
          void fetchProblems();
        }}
      />

      <GameResultModal
        open={result !== null}
        gameName="계산 게임"
        earnedGold={result?.earnedGold ?? 0}
        success={result?.success ?? false}
        highlights={result?.highlights ?? []}
        details={result?.details}
        submitting={rewardSubmitting}
        error={rewardError}
        onConfirm={handleResultConfirm}
        onRetry={result?.success ? handleRetry : undefined}
        confirmLabel={result?.success ? "확인" : "닫기"}
        retryLabel="다시 하기"
      />
    </div>
  );
}

function buildOrderSummary(problems: ProblemResponse[]): ReactNode {
  if (problems.length === 0) {
    return null;
  }
  const totals = new Map<string, number>();
  problems.forEach((problem) => {
    problem.orders.forEach((order) => {
      totals.set(order.menuName, (totals.get(order.menuName) ?? 0) + order.quantity);
    });
  });
  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <p className="font-semibold mb-2">총 주문 합계</p>
      <ul className="space-y-1">
        {entries.map(([name, qty]) => (
          <li key={name}>
            {name} × {qty}개
          </li>
        ))}
      </ul>
    </div>
  );
}






