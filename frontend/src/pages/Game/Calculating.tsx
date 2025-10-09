import { Link } from "react-router-dom";
import { ChevronLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface ProblemResponse {
  question: string;
  timeLimit: number;
}

interface UserAnswer {
  answer: number;
}

interface GameResult {
  correctCount: number;
  score: number;
}

export default function Calculating() {
  const [problems, setProblems] = useState<ProblemResponse[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [inputValue, setInputValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchProblems = async () => {
    try {
      const response = await fetch('/api/games/calculating/start');
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      setProblems(data);
      setCurrentProblemIndex(0);
      setInputValue('');
      setAnswers([]);
      setIsGameRunning(true);
      setIsGameEnded(false);
      setGameResult(null);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error fetching problems:', error);
      setIsGameRunning(false);
    }
  };

  const submitAnswers = async () => {
    try {
      const response = await fetch('/api/games/calculating/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answers),
      });
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      setGameResult(data);
      setIsGameEnded(true);
      setIsGameRunning(false);
    } catch (error) {
      console.error('Error submitting answers:', error);
      setIsGameRunning(false);
    }
  };

  const handleNextProblem = (timeUp: boolean = false) => {
    const answer = timeUp ? 0 : parseInt(inputValue, 10);
    setAnswers((prevAnswers) => [...prevAnswers, { answer: isNaN(answer) ? 0 : answer }]);
    setInputValue('');

    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex((prevIndex) => prevIndex + 1);
    } else {
      submitAnswers();
    }
  };

  useEffect(() => {
    if (isGameRunning && problems.length > 0 && currentProblemIndex < problems.length) {
      const currentProblem = problems[currentProblemIndex];
      setTimeLeft(currentProblem.timeLimit);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            handleNextProblem(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (!isGameRunning && isGameEnded) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGameRunning, problems, currentProblemIndex, isGameEnded]);

  const currentProblem = problems[currentProblemIndex];

  return (
    <div>
      <div className="relative text-center">
        <h1 className="text-xl font-bold">계산 게임</h1>
        <Link to="/" className="absolute top-0 left-0"><ChevronLeft /></Link>
      </div>
      <p className="text-center py-4 text-[#666]">당신은 자영업자! 손님들의 계산을 정확하게 도와주세요~!</p>

      <div className="flex flex-col items-center justify-center mt-8">
        {!isGameRunning && !isGameEnded && (
          <button onClick={fetchProblems} className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg font-semibold">
            게임 시작
          </button>
        )}

        {isGameRunning && currentProblem && (
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold mb-4">문제 {currentProblemIndex + 1} / {problems.length}</div>
            <div className="text-4xl font-bold mb-8">{currentProblem.question}</div>
            <div className="text-xl mb-4">남은 시간: {timeLeft}초</div>
            <input
              ref={inputRef}
              type="number"
              className="border-2 border-gray-300 p-3 rounded-lg text-center text-2xl w-48"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleNextProblem();
                }
              }}
              autoFocus
            />
            <button onClick={() => handleNextProblem()} className="mt-6 bg-green-500 text-white px-6 py-3 rounded-lg text-lg font-semibold">
              정답 제출
            </button>
          </div>
        )}

        {isGameEnded && gameResult && (
          <div className="flex flex-col items-center">
            <h2 className="text-3xl font-bold mb-4">게임 종료!</h2>
            <p className="text-xl mb-2">맞힌 개수: {gameResult.correctCount} / {problems.length}</p>
            <p className="text-xl mb-4">획득한 돈: {gameResult.score}원</p>
            <button onClick={fetchProblems} className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg font-semibold">
              다시 시작
            </button>
          </div>
        )}
      </div>
    </div>
  );
}