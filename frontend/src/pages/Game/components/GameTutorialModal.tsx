import "./gameModals.css";

export interface TutorialStep {
  title: string;
  description: string;
}

interface GameTutorialModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  steps: TutorialStep[];
  onStart: () => void;
  startLabel?: string;
}

export function GameTutorialModal({
  open,
  title,
  subtitle,
  steps,
  onStart,
  startLabel = "게임 시작하기",
}: GameTutorialModalProps) {
  if (!open) return null;

  return (
    <div className="game-modal-overlay">
      <div className="game-modal-card tutorial">
        <header className="game-modal-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>
        <section className="tutorial-steps">
          {steps.map((step, index) => (
            <article key={step.title} className="tutorial-step">
              <div className="tutorial-step-index">{index + 1}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </section>
        <footer className="game-modal-actions">
          <button type="button" className="primary" onClick={onStart}>
            {startLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
