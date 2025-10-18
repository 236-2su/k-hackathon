import type { ReactNode } from "react";
import "./gameModals.css";

interface GameResultModalProps {
  open: boolean;
  gameName: string;
  earnedGold: number;
  success: boolean;
  highlights: string[];
  details?: ReactNode;
  submitting?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onRetry?: () => void;
  confirmLabel?: string;
  retryLabel?: string;
}

export function GameResultModal({
  open,
  gameName,
  earnedGold,
  success,
  highlights,
  details,
  submitting,
  error,
  onConfirm,
  onRetry,
  confirmLabel,
  retryLabel,
}: GameResultModalProps) {
  if (!open) return null;

  return (
    <div className="game-modal-overlay">
      <div className="game-modal-card">
        <header className="game-modal-header">
          <h2>{gameName} 결과</h2>
          <p>{success ? "축하합니다! 보상을 획득했습니다." : "아쉽지만 목표에 도달하지 못했습니다."}</p>
        </header>
        <section className="result-body">
          <div className="result-money">
            <img src="/money.png" alt="획득 골드" />
            <span className="result-amount">
              {success ? `+${earnedGold.toLocaleString()} 골드` : "+0 골드"}
            </span>
          </div>
          <ul className="result-highlights">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {details && <div className="result-details">{details}</div>}
          {error && <div className="result-error">{error}</div>}
        </section>
        <footer className="game-modal-actions">
          {onRetry && (
            <button type="button" className="secondary" onClick={onRetry} disabled={submitting}>
              {retryLabel ?? "다시 도전하기"}
            </button>
          )}
          <button
            type="button"
            className="primary"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "보상 처리 중..." : confirmLabel ?? "닫기"}
          </button>
        </footer>
      </div>
    </div>
  );
}
