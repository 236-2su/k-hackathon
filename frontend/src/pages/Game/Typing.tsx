import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./Typing.css";
import { GameTutorialModal } from "./components/GameTutorialModal";
import { GameResultModal } from "./components/GameResultModal";
import { getZepContext, postReward } from "./gameApi";
import type { GameType } from "./gameApi";
import type { TutorialStep } from "./components/GameTutorialModal";

type SentenceItem = { id: number; content: string };

interface ResultState {
  earnedGold: number;
  success: boolean;
  highlights: string[];
}

const GAME_TYPE: GameType = "typing";
const GAME_TIME_SECONDS = 60;
const GOLD_PER_SENTENCE = 500;

const tutorialSteps: TutorialStep[] = [
  {
    title: "60초 안에 문장을 입력하세요",
    description: "화면에 나온 문장을 그대로 입력하고 엔터를 누르면 다음 문장이 등장해요.",
  },
  {
    title: "정확한 철자가 중요해요",
    description: "띄어쓰기와 문장 부호까지 정확히 입력해야 정답으로 인정돼요.",
  },
  {
    title: "문장 하나당 500골드!",
    description: "시간 안에 더 많은 문장을 완성할수록 누적 보상이 커져요.",
  },
];

export default function Typing() {
  const { zepUserId } = useMemo(() => getZepContext(), []);

  const [prevSentence, setPrevSentence] = useState<SentenceItem | null>(null);
  const [currentSentence, setCurrentSentence] = useState<SentenceItem | null>(null);
  const [nextSentence, setNextSentence] = useState<SentenceItem | null>(null);

  const [usedSentenceIds, setUsedSentenceIds] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME_SECONDS);

  const [isGameRunning, setIsGameRunning] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const [result, setResult] = useState<ResultState | null>(null);
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [rewardSubmitted, setRewardSubmitted] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const completedCountRef = useRef(0);

  useEffect(() => {
    completedCountRef.current = completedCount;
  }, [completedCount]);

  const fetchSentence = useCallback(async (excludeIds: number[] = []) => {
    const query = new URLSearchParams();
    excludeIds.forEach((id) => query.append("excludeIds", id.toString()));
    const response = await fetch(`/api/games/typing/sentence?${query.toString()}`);
    if (!response.ok) {
      throw new Error("문장을 불러오지 못했습니다.");
    }
    return (await response.json()) as SentenceItem;
  }, []);

  const startGame = useCallback(async () => {
    setShowTutorial(false);
    setIsGameRunning(false);
    setIsGameEnded(false);
    setResult(null);
    setRewardSubmitted(false);
    setRewardError(null);

    setPrevSentence(null);
    setCurrentSentence(null);
    setNextSentence(null);
    setUsedSentenceIds([]);
    setInputValue("");
    setIsCorrect(null);
    setCompletedCount(0);
    setTimeLeft(GAME_TIME_SECONDS);

    try {
      const first = await fetchSentence();
      const second = await fetchSentence([first.id]);
      setCurrentSentence(first);
      setNextSentence(second);
      setUsedSentenceIds([first.id, second.id]);
      setIsGameRunning(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      console.error(error);
      setIsGameRunning(false);
      setResult({
        earnedGold: 0,
        success: false,
        highlights: ["문장을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."],
      });
    }
  }, [fetchSentence]);

  const endGame = useCallback(() => {
    if (isGameEnded) return;
    setIsGameRunning(false);
    setIsGameEnded(true);

    const finalCount = completedCountRef.current;
    const earnedGold = finalCount * GOLD_PER_SENTENCE;

    setResult({
      earnedGold,
      success: true,
      highlights: [
        `완료한 문장: ${finalCount}개`,
        `획득 골드: ${earnedGold.toLocaleString()} 골드`,
      ],
    });
  }, [isGameEnded]);

  useEffect(() => {
    let interval: number | undefined;
    if (isGameRunning && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }
    if (isGameRunning && timeLeft === 0) {
      endGame();
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isGameRunning, timeLeft, endGame]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isGameRunning || !currentSentence) return;

    const correct = inputValue === currentSentence.content;
    setIsCorrect(correct);
    if (correct) {
      setCompletedCount((prev) => prev + 1);
    }

    setPrevSentence(currentSentence);
    setCurrentSentence(nextSentence);
    setInputValue("");
    inputRef.current?.focus();

    try {
      const exclude = new Set(usedSentenceIds);
      exclude.add(currentSentence.id);
      if (nextSentence) exclude.add(nextSentence.id);
      const newSentence = await fetchSentence(Array.from(exclude));
      setNextSentence(newSentence);
      setUsedSentenceIds(Array.from(exclude).concat(newSentence.id));
    } catch (error) {
      console.error(error);
      setNextSentence(null);
    }
  };

  const handleTutorialStart = () => {
    void startGame();
  };

  const notifyZep = useCallback((success: boolean, earnedGold: number) => {
    if (typeof window === "undefined") return;
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

  const timeMinutes = Math.floor(timeLeft / 60);
  const timeSeconds = timeLeft % 60;

  return (
    <div className="typing-game-container">
      <div className="typing-header">
        <h1 className="title text-[28px]">타이핑 게임</h1>
        <p className="subtitle">1분 동안 문장을 정확하게 입력해 골드를 모아보세요!</p>
      </div>

      <div className="game-area">
        {isGameRunning && (
          <>
            <div className="timer">
              남은 시간: {timeMinutes}:{timeSeconds.toString().padStart(2, "0")}
            </div>

            <div className="sentence-context">
              <div className="sentence-line prev">{prevSentence?.content ?? ""}</div>
              <div className="sentence-line current">{currentSentence?.content ?? ""}</div>
              <div className="sentence-line next">{nextSentence?.content ?? ""}</div>
            </div>

            <div className="input-card">
              {isCorrect !== null && (
                <div className="feedback-wrap">
                  <span className={`feedback ${isCorrect ? "correct" : "incorrect"}`}>
                    {isCorrect ? "정답!" : "오답!"}
                  </span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="typing-form">
                <input
                  ref={inputRef}
                  type="text"
                  className="typing-input"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="표시된 문장을 그대로 입력하세요."
                  disabled={!isGameRunning}
                  autoComplete="off"
                />
                <button type="submit" className="submit-button" disabled={!isGameRunning}>
                  확인
                </button>
              </form>
            </div>

            <div className="game-info">완료한 문장 수: {completedCount}</div>
          </>
        )}

        {!isGameRunning && !isGameEnded && !showTutorial && (
          <div className="start-hero">
            <p>튜토리얼을 다시 보고 시작해 보세요.</p>
            <button className="start-button-lg" onClick={() => setShowTutorial(true)}>
              튜토리얼 보기
            </button>
          </div>
        )}
      </div>

      <GameTutorialModal
        open={showTutorial}
        title="타이핑 게임 가이드"
        subtitle="3단계 튜토리얼을 확인한 뒤 게임을 시작하세요."
        steps={tutorialSteps}
        onStart={handleTutorialStart}
      />

      <GameResultModal
        open={result !== null}
        gameName="타이핑 게임"
        earnedGold={result?.earnedGold ?? 0}
        success={result?.success ?? false}
        highlights={result?.highlights ?? []}
        submitting={rewardSubmitting}
        error={rewardError}
        onConfirm={handleResultConfirm}
        onRetry={result?.success ? handleRetry : undefined}
        confirmLabel={result?.success ? "보상 받기" : "닫기"}
        retryLabel="다시 타이핑하기"
      />
    </div>
  );
}
