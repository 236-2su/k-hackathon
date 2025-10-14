import { Link } from "react-router-dom";
import { ChevronLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

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

interface GameResult {
  correctCount: number;
  score: number;
}

export default function Calculating() {
  const [menuBoard, setMenuBoard] = useState<MenuBoard | null>(null);
  const [problems, setProblems] = useState<ProblemResponse[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [inputValue, setInputValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(10); // 제한 시간 10초 고정
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchProblems = async () => {
    try {
      const response = await fetch('/api/games/calculating/start');
      if (!response.ok) throw new Error('Server error');
      const data: ProblemResponse[] = await response.json();
      setProblems(data);
      if (data.length > 0) {
        setMenuBoard(data[0].menuBoard);
      }
      setCurrentProblemIndex(0);
      setInputValue('');
      setAnswers([]);
      setIsGameRunning(true);
      setIsGameEnded(false);
      setGameResult(null);
      setFeedback(null);
      setTimeLeft(10); // 게임 시작 시 타이머 초기화
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

  const handleNextProblem = () => {
    const currentProblem = problems[currentProblemIndex];
    const userAnswer = parseInt(inputValue, 10);
    const isCorrect = userAnswer === currentProblem.answer;

    setAnswers((prevAnswers) => [...prevAnswers, { answer: isNaN(userAnswer) ? 0 : userAnswer }]);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setInputValue('');

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentProblemIndex < problems.length - 1) {
        setCurrentProblemIndex((prevIndex) => prevIndex + 1);
        setTimeLeft(10); // 다음 문제로 넘어갈 때 타이머 초기화
      } else {
        submitAnswers();
      }
    }, 1000); // 1초 후에 다음 문제로 넘어감
  };

  useEffect(() => {
    if (isGameRunning && problems.length > 0 && currentProblemIndex < problems.length) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (timeLeft > 0) {
        timerRef.current = setInterval(() => {
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              clearInterval(timerRef.current!);
              return 0;
            }
          return prevTime - 1;
        });
      }, 1000);
      }
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
  }, [isGameRunning, problems, currentProblemIndex, isGameEnded, timeLeft]);

  useEffect(() => {
    if (isGameRunning && timeLeft === 0 && currentProblemIndex < problems.length) {
      handleNextProblem();
    }
  }, [isGameRunning, timeLeft, currentProblemIndex, problems.length]);

  useEffect(() => {
    if (problems.length > 0 && currentProblemIndex < problems.length) {
      setMenuBoard(problems[currentProblemIndex].menuBoard);
    }
  }, [currentProblemIndex, problems]);

  const currentProblem = problems[currentProblemIndex];

  return (
    <div className="p-4 w-full">
      <div className="relative text-center">
        <h1 className="title text-[28px]">계산 게임</h1>
        <Link to="/" className="absolute top-0 left-0"><ChevronLeft /></Link>
      </div>
      <p className="text-center py-4 text-[#666]">당신은 자영업자! 손님들의 계산을 정확하게 도와주세요~!</p>

      <div className="flex flex-col items-center justify-center mt-8 relative">
        {!isGameRunning && !isGameEnded && (
          <button onClick={fetchProblems} className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg font-semibold">
            게임 시작
          </button>
        )}

        {isGameRunning && currentProblem && (
          <div className="flex flex-col items-center w-full">
            {/* Problem / Time display */}
            <div className="flex items-baseline mb-4">
              <div className="text-2xl font-bold mr-2">문제 {currentProblemIndex + 1} / {problems.length}</div>
              <div className="text-xl"> {timeLeft}초</div>
            </div>

            {/* Main game area: Character, Speech Bubble, Menu Board */}
            <div className="flex justify-between items-start w-full mb-8">
              {/* Character */}
              <div className="ml-0">
                <img src="/character.png" alt="Character" className="w-72 h-72 object-contain" />
              </div>

              {/* Speech bubble (centered within its flexible space) */}
              <div className="relative bg-blue-100 p-4 rounded-lg shadow-md max-w-md mx-auto">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-blue-100"></div>
                <p className="text-lg font-semibold">주문:</p>
                <ul>
                  {currentProblem.orders.map((order, index) => (
                    <li key={index} className="text-md">{order.menuName} {order.quantity}개 주세요.</li>
                  ))}
                </ul>
              </div>

              {/* 메뉴판 */}
              {menuBoard && (
                <div className="bg-gray-100 p-4 rounded-lg shadow-md w-48 mr-4">
                  <h2 className="text-lg font-bold mb-2">{menuBoard.name}</h2>
                  <ul>
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

            {/* Input field below speech bubble (now centered relative to the overall game area) */}
            <input
              ref={inputRef}
              type="number"
              className="border-2 border-gray-300 p-3 rounded-lg text-center text-2xl w-48 mb-4"
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

            {feedback && (
              <div className={`mt-4 text-2xl font-bold ${feedback === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                {feedback === 'correct' ? '정답!' : '오답!'}
              </div>
            )}
          </div>
        )}

        {isGameEnded && gameResult && (
          <div className="flex flex-col items-center w-full">
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