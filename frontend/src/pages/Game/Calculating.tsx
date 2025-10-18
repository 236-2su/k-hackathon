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
const MIN_SUCCESS_COUNT = 6;

const tutorialSteps: TutorialStep[] = [
  {
    title: "주문?��? 꼼꼼???�인?�세??,
    description: "?�님??부?�한 메뉴?� ?�량??기억???�고 ?�확???�계�?계산?�니??",
  },
  {
    title: "모든 문제??10�??�한?�에??,
    description: "??문제�??� ?�마??10�??�에 ?�을 ?�력?�야 ?�음 주문?�로 ?�어�????�어??",
  },
  {
    title: "?�답 개수???�라 보상??받아??,
    description: "?�답 6�??�상?�면 ?�공! 주문 ?�량 × 300골드�??�득?�니??",
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
        throw new Error("문제�?불러?��? 못했?�니??");
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
        highlights: ["문제�?불러?��? 못했?�니?? ?�시 ???�시 ?�도??주세??"],
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
      if (!response.ok) throw new Error("결과�??�출?��? 못했?�니??");
      const data = (await response.json()) as GameResultResponse;

      const totalItems = problems
        .flatMap((problem) => problem.orders)
        .reduce((acc, order) => acc + order.quantity, 0);

      const success = data.correctCount >= MIN_SUCCESS_COUNT;
      const earnedGold = success ? totalItems * GOLD_PER_ITEM : 0;
      const orderSummary = buildOrderSummary(problems);

      setResult({
        earnedGold,
        success,
        highlights: [
          `?�답 ?? ${data.correctCount} / ${problems.length}`,
          `�?주문 ?�량: ${totalItems}�?,
        ],
        details: orderSummary,
      });

      setIsGameRunning(false);
      setIsGameEnded(true);
    } catch (error) {
      console.error(error);
      setIsGameRunning(false);
      setResult({
        earnedGold: 0,
        success: false,
        highlights: ["결과�??�출?��? 못했?�니?? ?�시 ???�시 ?�도??주세??"],
        details: null,
      });
    }
  }, [answers, problems, zepUserId]);

  const handleNextProblem = useCallback(() => {
    if (!isGameRunning || problems.length === 0) return;

    const currentProblem =\n    currentProblemIndex >= 0 && currentProblemIndex < problems.length\n      ? problems[currentProblemIndex]\n      : undefined;
    const userAnswer = parseInt(inputValue, 10);\n    const cur = (currentProblemIndex >=0 && currentProblemIndex < problems.length) ? problems[currentProblemIndex] : undefined;\n    if (!cur) return;\n    const isCorrect = userAnswer === cur.answer;

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

  const currentProblem =\n    currentProblemIndex >= 0 && currentProblemIndex < problems.length\n      ? problems[currentProblemIndex]\n      : undefined;

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
        <p className="text-center py-4 text-[#666]">?�영?�자가 ?�어 ?�확?�게 주문??계산??주세??</p>
      </div>

      <div className="flex flex-col items-center justify-center mt-8 relative">
        {!isGameRunning && !isGameEnded && !showTutorial && (
          <button
            onClick={() => setShowTutorial(true)}
            className="bg-[#326256] text-white px-6 py-3 rounded-lg text-lg font-semibold"
          >
            ?�토리얼 보기
          </button>
        )}

        {isGameRunning && currentProblem && (
          <div className="flex flex-col items-center w-full gap-6">
            <div className="flex items-baseline gap-3">
              <div className="text-2xl font-bold">
                문제 {currentProblemIndex + 1} / {problems.length}
              </div>
              <div className="text-xl text-[#e74c3c]">{timeLeft}�?/div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 w-full">
              <div className="flex gap-4 items-start">
                <img
                  src="/character.png"
                  alt="?�님"
                  className="w-56 h-56 object-contain"
                />
                <div className="relative bg-blue-100 p-4 rounded-lg shadow-md min-w-[220px]">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-blue-100"></div>
                  <p className="text-lg font-semibold">주문 목록</p>
                  <ul className="mt-2">
                    {currentProblem.orders.map((order, index) => (
                      <li key={index} className="text-md">
                        {order.menuName} {order.quantity}�?주세??
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
                        <span>{item.price.toLocaleString()}??/span>
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
                ?�답 ?�출
              </button>
            </div>

            {feedback && (
              <div
                className={`mt-2 text-2xl font-bold ${
                  feedback === "correct" ? "text-green-600" : "text-red-600"
                }`}
              >
                {feedback === "correct" ? "?�답!" : "?�답!"}
              </div>
            )}
          </div>
        )}
      </div>

      <GameTutorialModal
        open={showTutorial}
        title="계산 게임 가?�드"
        subtitle="3?�계 ?�토리얼???�인????게임???�작?�세??"
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
        confirmLabel={result?.success ? "보상 받기" : "?�기"}
        retryLabel="?�시 계산?�기"
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
      <p className="font-semibold mb-2">�?주문 ?�약</p>
      <ul className="space-y-1">
        {entries.map(([name, qty]) => (
          <li key={name}>
            {name} × {qty}�?          </li>
        ))}
      </ul>
    </div>
  );
}

