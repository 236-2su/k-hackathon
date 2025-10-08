import React, { useState, useEffect, useRef } from 'react';
import { Link } from "react-router-dom";
import { ChevronLeft } from 'lucide-react';
import './Typing.css';

export default function Typing() {
    const GAME_TIME_SECONDS = 180;

    const [sentence, setSentence] = useState('게임을 시작하려면 아래 버튼을 누르세요.');
    const [currentSentenceId, setCurrentSentenceId] = useState<number | null>(null);
    const [usedSentenceIds, setUsedSentenceIds] = useState<number[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null); // null: 아직 입력 안 함, true: 맞음, false: 틀림
    const [completedCount, setCompletedCount] = useState(0);
    const [totalMoneyEarned, setTotalMoneyEarned] = useState(0);
    const [time, setTime] = useState(GAME_TIME_SECONDS);
    const [isGameRunning, setIsGameRunning] = useState(false);
    const [isGameEnded, setIsGameEnded] = useState(false); // 게임 종료 상태 추가
    const inputRef = useRef<HTMLInputElement>(null);

    // 임시 사용자 ID (실제 앱에서는 로그인 유저 ID 사용)
    const userId = 1; 

    const fetchNewSentence = async () => {
        try {
            const queryParams = new URLSearchParams();
            usedSentenceIds.forEach(id => queryParams.append('excludeIds', id.toString()));
            const response = await fetch(`/api/games/typing/sentence?${queryParams.toString()}`);
            if (!response.ok) throw new Error('Server error');
            const data = await response.json();
            setSentence(data.content);
            setCurrentSentenceId(data.id);
            setUsedSentenceIds(prev => [...prev, data.id]);
        } catch (error) {
            console.error("Error fetching sentence:", error);
            setSentence("새 문장을 불러오는 데 실패했습니다.");
            setIsGameRunning(false);
        }
    };

    const startGame = () => {
        setIsGameRunning(true);
        setIsGameEnded(false); // 게임 시작 시 게임 종료 상태 초기화
        setCompletedCount(0);
        setTime(GAME_TIME_SECONDS);
        setInputValue('');
        setIsCorrect(null);
        setTotalMoneyEarned(0);
        setUsedSentenceIds([]); // 게임 시작 시 사용된 문장 ID 초기화
        fetchNewSentence();
        inputRef.current?.focus();
    };

    const endGame = () => {
        setIsGameRunning(false);
        setIsGameEnded(true); // 게임 종료 시 상태 변경
        setTotalMoneyEarned(completedCount * 100);
        // alert(`게임 종료! 3분 동안 ${completedCount}개의 문장을 정확히 완성했습니다. 총 ${completedCount * 100}원을 획득했습니다!`);
        // TODO: 결과 저장 API 호출
    };

    const updateUserGold = async () => {
        try {
            const response = await fetch(`/api/users/${userId}/gold`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ goldAmount: totalMoneyEarned }),
            });
            if (!response.ok) throw new Error('Failed to update user gold');
            console.log('User gold updated successfully!');
            // 골드 업데이트 성공 후 홈으로 이동하거나 다른 액션 수행
            // 예: navigate('/');
        } catch (error) {
            console.error("Error updating user gold:", error);
        }
    };

    // 문장 제출 처리 함수
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); // Form의 기본 제출 동작(새로고침) 방지
        if (!isGameRunning || !inputValue) return;

        // 정답 비교
        if (inputValue === sentence) {
            setCompletedCount(prev => prev + 1);
            setIsCorrect(true);
        } else {
            setIsCorrect(false);
        }
        
        // 다음 문장으로 이동
        setInputValue('');
        fetchNewSentence();
    };

    useEffect(() => {
        let interval: number;
        if (isGameRunning && time > 0) {
            interval = setInterval(() => {
                setTime(prevTime => prevTime - 1);
            }, 1000);
        } else if (time === 0 && isGameRunning) {
            endGame();
        }
        return () => clearInterval(interval);
    }, [isGameRunning, time]);

    return (
        <div className="typing-game-container">
            <div className="relative text-center">
                <h1 className="text-xl font-bold">타이핑 게임</h1>
                <Link to="/" className="absolute top-0 left-0"><ChevronLeft /></Link>
            </div>
            <p className="text-center py-4 text-[#666]">당신은 회사원! 빠른 손으로 부장님께 사랑을 받으세요~!</p>

            {!isGameEnded ? (
                <div className="game-area">
                    <div className="timer">
                        남은 시간: {Math.floor(time / 60)}분 {time % 60}초
                    </div>
                    <div className="sentence-display">
                        <p>{sentence}</p>
                    </div>
                    {isGameRunning && isCorrect !== null && (
                        <div className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                            {isCorrect ? '정답!' : '오답!'}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="typing-form">
                        <input
                            ref={inputRef}
                            type="text"
                            className="typing-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={isGameRunning ? "위 문장을 따라 입력하세요" : "게임이 시작되면 여기에 입력합니다."}
                            disabled={!isGameRunning}
                        />
                        <button type="submit" className="submit-button" disabled={!isGameRunning}>
                            확인
                        </button>
                    </form>

                    <div className="game-info">
                        <p>완성한 문장 수: {completedCount}</p>
                    </div>
                    {!isGameRunning && (
                        <button onClick={startGame} className="start-button">
                            게임 시작
                        </button>
                    )}
                </div>
            ) : (
                <div className="game-result-area">
                    <h2>게임 종료!</h2>
                    <p>총 완성 문장 수: {completedCount}</p>
                    <p>획득한 돈: {totalMoneyEarned}원</p>
                    <button onClick={updateUserGold} className="confirm-button">
                        확인
                    </button>
                    <button onClick={startGame} className="start-button">
                        다시 시작
                    </button>
                </div>
            )}
        </div>
    );
}