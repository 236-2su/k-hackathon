import React, { useState, useEffect, useRef } from 'react';
import { Link } from "react-router-dom";
import { ChevronLeft } from 'lucide-react';
import './Typing.css';

type SentenceItem = { id: number; content: string };

export default function Typing() {
  const GAME_TIME_SECONDS = 180;

  // 세 줄 고정 구조
  const [prevSentence, setPrevSentence] = useState<SentenceItem | null>(null);
  const [currentSentence, setCurrentSentence] = useState<SentenceItem | null>(null);
  const [nextSentence, setNextSentence] = useState<SentenceItem | null>(null);

  const [usedSentenceIds, setUsedSentenceIds] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [time, setTime] = useState(GAME_TIME_SECONDS);

  const [isGameRunning, setIsGameRunning] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const userId = 1;
  void userId;

  const fetchSentence = async (excludeIds: number[] = []) => {
    const query = new URLSearchParams();
    excludeIds.forEach(id => query.append('excludeIds', id.toString()));
    const res = await fetch(`/api/games/typing/sentence?${query.toString()}`);
    if (!res.ok) throw new Error('Server error');
    return await res.json() as SentenceItem;
  };

  const startGame = async () => {
    setIsGameRunning(true);
    setIsGameEnded(false);
    setCompletedCount(0);
    setTime(GAME_TIME_SECONDS);
    setUsedSentenceIds([]);
    setInputValue('');
    setIsCorrect(null);
    setPrevSentence(null);
    setCurrentSentence(null);
    setNextSentence(null);

    // 현재/다음 선점
    try {
      const first = await fetchSentence();
      const second = await fetchSentence([first.id]);
      setCurrentSentence(first);
      setNextSentence(second);
      setUsedSentenceIds([first.id, second.id]);
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e) {
      console.error(e);
      setIsGameRunning(false);
    }
  };

  const endGame = () => {
    setIsGameRunning(false);
    setIsGameEnded(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGameRunning || !currentSentence) return;
    const correct = inputValue === currentSentence.content;
    setIsCorrect(correct);
    if (correct) setCompletedCount(c => c + 1);

    // 현재 → 이전, 다음 → 현재
    setPrevSentence(currentSentence);
    setCurrentSentence(nextSentence);
    setInputValue('');
    inputRef.current?.focus();

    // 새 '다음' 가져오기
    try {
      const newNext = await fetchSentence(usedSentenceIds);
      setNextSentence(newNext);
      setUsedSentenceIds(prev => [...prev, newNext.id]);
    } catch (e) {
      console.error(e);
      setNextSentence(null);
    }
  };

  // 타이머
  useEffect(() => {
    let interval: number;
    if (isGameRunning && time > 0) {
      interval = window.setInterval(() => setTime(t => t - 1), 1000);
    } else if (time === 0 && isGameRunning) {
      endGame();
    }
    return () => clearInterval(interval);
  }, [isGameRunning, time]);

  const showStartScreen = !isGameRunning && !isGameEnded;

  return (
    <div className="typing-game-container">
      <div className="relative text-center">
        <h1 className="text-xl font-bold">타이핑 게임</h1>
        <Link to="/" className="absolute top-0 left-0" aria-label="뒤로가기">
          <ChevronLeft />
        </Link>
      </div>
      <p className="text-center py-4 text-[#666]">
        당신은 회사원! 빠른 손으로 부장님께 사랑을 받으세요~!
      </p>

      {showStartScreen ? (
        /* ====== 시작 화면: 큰 버튼만 ====== */
        <div className="start-hero">
          <div className="start-title" style={{display:'none'}} aria-hidden>타이핑 게임</div>
          <div className="start-desc" style={{display:'none'}} aria-hidden>
            당신은 회사원! 빠른 손으로 부장님께 사랑을 받으세요~!
          </div>
          <button className="start-button-lg" onClick={startGame}>게임 시작</button>
        </div>
      ) : !isGameEnded ? (
        /* ====== 게임 진행 화면 ====== */
        <div className="game-area">
          <div className="timer">남은 시간: {Math.floor(time / 60)}분 {time % 60}초</div>

          {/* 이전 / 현재 / 다음 (항상 3줄 유지, 없으면 공백) */}
          <div className="sentence-context">
            <div className="sentence-line prev">{prevSentence?.content ?? ''}</div>
            <div className="sentence-line current">{currentSentence?.content ?? ''}</div>
            <div className="sentence-line next">{nextSentence?.content ?? ''}</div>
          </div>

          {/* 입력 카드 + 중앙 배지 */}
          <div className="input-card">
            {isCorrect !== null && (
              <div className="feedback-wrap">
                <span className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                  {isCorrect ? '정답!' : '오답!'}
                </span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="typing-form">
              <input
                ref={inputRef}
                type="text"
                className="typing-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="위 문장을 그대로 입력하세요"
                disabled={!isGameRunning}
                autoComplete="off"
              />
              <button type="submit" className="submit-button" disabled={!isGameRunning}>
                확인
              </button>
            </form>
          </div>

          <div className="game-info">완성한 문장 수: {completedCount}</div>
        </div>
      ) : (
        /* ====== 결과 화면 ====== */
        <div className="game-area">
          <h2>게임 종료!</h2>
          <p>총 완성 문장 수: {completedCount}</p>
          <button className="start-button-lg" onClick={startGame}>다시 시작</button>
        </div>
      )}
    </div>
  );
}
