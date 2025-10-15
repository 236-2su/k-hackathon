import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import {
  createInitialGameState,
  loadStockGameDataset,
} from "./stockGameLoader";
import { advanceRound } from "./stockGameEngine";
import type {
  ImpactHint,
  RoundPlan,
  RoundResolution,
  StockDefinition,
  StockGameState,
  TradeExecution,
  TradeIntent,
  ExpectedChange,
} from "./stockGameTypes";
import { StockTutorialModal } from "./StockTutorialModal";
import { StockAnalytics } from "./StockAnalytics";

const DEFAULT_ROUNDS = 10;
const TUTORIAL_STORAGE_KEY = "stock-game/tutorialSeen";

type DraftOrders = Record<string, { buy: number; sell: number }>;

export default function Stock() {
  const { dataset, initialState } = useMemo(() => {
    const dataset = loadStockGameDataset();
    const state = createInitialGameState(dataset, { rounds: DEFAULT_ROUNDS });
    return { dataset, initialState: state };
  }, []);

  const [gameState, setGameState] = useState<StockGameState>(initialState);
  const [draftOrders, setDraftOrders] = useState<DraftOrders>(() =>
    createDraftOrders(dataset.stocks),
  );
  const [lastResolution, setLastResolution] = useState<RoundResolution>();
  const [lastTrades, setLastTrades] = useState<TradeExecution[]>([]);
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const stocksByTicker = useMemo(
    () => buildStockMap(dataset.stocks),
    [dataset.stocks],
  );

  const upcomingRounds = useMemo<RoundPlan[]>(() => {
    return gameState.rounds.slice(
      gameState.currentRoundIndex,
      gameState.currentRoundIndex + 3,
    );
  }, [gameState.rounds, gameState.currentRoundIndex]);

  const isGameOver = gameState.currentRoundIndex >= gameState.rounds.length;
  const currentRound = !isGameOver
    ? gameState.rounds[gameState.currentRoundIndex]
    : undefined;
  const latestSnapshot =
    gameState.snapshots[gameState.snapshots.length - 1] ?? null;
  const currentReturnPct = latestSnapshot
    ? computeReturnPct(
        latestSnapshot.totalValue,
        gameState.metadata.initialCapital,
      )
    : 0;
  const goalValue =
    gameState.metadata.initialCapital *
    (1 + gameState.metadata.goalReturnPct);
  const victoryAchieved = isGameOver && latestSnapshot
    ? latestSnapshot.totalValue >= goalValue
    : false;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(TUTORIAL_STORAGE_KEY);
      const seen = stored === "seen";
      setHasSeenTutorial(seen);
      if (!seen) {
        setShowTutorial(true);
      }
    } catch (error) {
      console.warn("Failed to load tutorial state", error);
      setShowTutorial(true);
    }
  }, []);

  const handleQuantityChange = (
    ticker: string,
    field: "buy" | "sell",
    rawValue: string,
  ) => {
    const parsed = Math.max(0, Math.floor(Number(rawValue) || 0));
    setDraftOrders((prev) => ({
      ...prev,
      [ticker]: {
        ...prev[ticker],
        [field]: parsed,
      },
    }));
  };

  const handleResetDrafts = () => {
    setDraftOrders(createDraftOrders(dataset.stocks));
    setErrorMessage(null);
    setTradeMessage(null);
  };

  const handleAdvanceRound = () => {
    if (isGameOver) {
      return;
    }
    const intents: TradeIntent[] = [];
    Object.entries(draftOrders).forEach(([ticker, draft]) => {
      if (draft.buy > 0) {
        intents.push({ ticker, type: "buy", quantity: draft.buy });
      }
      if (draft.sell > 0) {
        intents.push({ ticker, type: "sell", quantity: draft.sell });
      }
    });

    const result = advanceRound(gameState, intents);
    if (result.tradeErrors.length > 0) {
      setErrorMessage(result.tradeErrors[0].message);
      setTradeMessage(null);
      return;
    }

    setGameState(result.nextState);
    setLastResolution(result.resolution);
    setLastTrades(result.tradeExecutions);
    setDraftOrders(createDraftOrders(dataset.stocks));
    setErrorMessage(null);

    if (result.tradeExecutions.length > 0) {
      const summary = result.tradeExecutions
        .map((exec) => {
          const stock = stocksByTicker[exec.ticker];
          const name = stock?.displayName ?? exec.ticker;
          const action = exec.type === "buy" ? "매수" : "매도";
          return `${name} ${action} ${exec.quantity}주`;
        })
        .join(", ");
      setTradeMessage(
        result.roundCompleted
          ? `마지막 라운드에서 ${summary}을(를) 수행했어요.`
          : `${summary}을(를) 실행했어요.`,
      );
    } else {
      setTradeMessage(
        result.roundCompleted
          ? "거래 없이 마지막 라운드를 마쳤어요."
          : "거래 없이 라운드를 진행했어요.",
      );
    }
  };

  const handleRestart = () => {
    const nextState = createInitialGameState(dataset, {
      rounds: DEFAULT_ROUNDS,
      seed: Date.now(),
    });
    setGameState(nextState);
    setDraftOrders(createDraftOrders(dataset.stocks));
    setLastResolution(undefined);
    setLastTrades([]);
    setTradeMessage(null);
    setErrorMessage(null);
  };

  const handleOpenTutorial = () => {
    setShowTutorial(true);
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    setHasSeenTutorial(true);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "seen");
      } catch (error) {
        console.warn("Failed to persist tutorial state", error);
      }
    }
  };

  return (
    <div className="w-full p-4">
      <div className="relative text-center">
        <h1 className="title text-[28px]">주식 게임</h1>
        <Link to="/" className="absolute left-0 top-0">
          <ChevronLeft />
        </Link>
      </div>
      <p className="py-4 text-center text-[#666]">
        10라운드 동안 삼성전자·카카오·테슬라 뉴스를 읽고 예상되는 주가 흐름을 기반으로
        매수/매도를 결정해 보세요.
      </p>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleOpenTutorial}
          className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
        >
          튜토리얼 {hasSeenTutorial ? "다시 보기" : "보기"}
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">게임 기본 정보</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-600">
            <InfoRow
              label="초기 자본"
              value={formatCurrency(gameState.metadata.initialCapital)}
            />
            <InfoRow
              label="거래 수수료"
              value={`${(gameState.metadata.transactionFee * 100).toFixed(2)}%`}
            />
            <InfoRow
              label="목표 수익률"
              value={`${(gameState.metadata.goalReturnPct * 100).toFixed(1)}%`}
            />
            <InfoRow
              label="현재 라운드"
              value={`${Math.min(
                gameState.currentRoundIndex + 1,
                gameState.rounds.length,
              )} / ${gameState.rounds.length}`}
            />
            <InfoRow
              label="현재 자산"
              value={
                latestSnapshot
                  ? formatCurrency(latestSnapshot.totalValue)
                  : formatCurrency(gameState.metadata.initialCapital)
              }
            />
            <InfoRow
              label="현재 수익률"
              value={`${formatPercent(currentReturnPct)}`}
            />
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">보유 현황</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-600">
            <InfoRow label="현금" value={formatCurrency(gameState.cash)} />
            {Object.entries(gameState.holdingsByTicker).map(([ticker, holding]) => {
              const stock = stocksByTicker[ticker];
              const name = stock?.displayName ?? ticker;
              const price = gameState.priceByTicker[ticker] ?? 0;
              const marketValue = holding.quantity * price;
              return (
                <InfoRow
                  key={ticker}
                  label={`${name} (${ticker})`}
                  value={`${holding.quantity.toLocaleString()}주 · ${formatCurrency(
                    marketValue,
                  )}`}
                />
              );
            })}
          </dl>
        </div>
      </section>

      {!isGameOver && currentRound && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              라운드 {currentRound.index + 1} 뉴스 & 거래
            </h2>
            <button
              type="button"
              onClick={handleResetDrafts}
              className="text-sm text-slate-500 underline hover:text-slate-700"
            >
              입력 초기화
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {currentRound.entries.map((entry) => {
              const drafted = draftOrders[entry.ticker] ?? { buy: 0, sell: 0 };
              return (
                <article
                  key={entry.news.id}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`rounded px-2 py-1 ${impactBadgeClass(entry.news.impactHint)}`}>
                        {impactLabel(entry.news.impactHint)}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {entry.displayName}
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-slate-800">
                      {entry.news.headline}
                    </h3>
                    <p className="mt-2 text-sm leading-snug text-slate-600">
                      {entry.news.summary}
                    </p>
                    {entry.news.insight && (
                      <p className="mt-2 text-xs italic text-emerald-700">
                        Insight: {entry.news.insight}
                      </p>
                    )}
                    <dl className="mt-3 space-y-1 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <dt>예상 변동폭</dt>
                        <dd>{formatExpectedChange(entry.news.expectedChange)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>현재가</dt>
                        <dd>{formatCurrency(gameState.priceByTicker[entry.ticker] ?? 0)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs font-semibold text-slate-700">
                      매수 수량
                      <input
                        type="number"
                        min={0}
                        value={drafted.buy}
                        onChange={(event) =>
                          handleQuantityChange(entry.ticker, "buy", event.target.value)
                        }
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      매도 수량
                      <input
                        type="number"
                        min={0}
                        value={drafted.sell}
                        onChange={(event) =>
                          handleQuantityChange(entry.ticker, "sell", event.target.value)
                        }
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleAdvanceRound}
              className="rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-600"
            >
              라운드 진행
            </button>
          </div>
        </section>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {tradeMessage && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {tradeMessage}
        </div>
      )}

      {lastResolution && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-800">
            최근 라운드 결과
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">주가 변동</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {lastResolution.entries.map((entry) => {
                  const name =
                    stocksByTicker[entry.ticker]?.displayName ?? entry.ticker;
                  return (
                    <li key={entry.news.id} className="flex flex-col rounded border border-slate-100 p-2">
                      <span className="font-semibold text-slate-800">
                        {name} ({entry.ticker})
                      </span>
                      <span>
                        {formatCurrency(entry.previousPrice)} →{" "}
                        {formatCurrency(entry.newPrice)} (
                        {formatPercent(entry.pctChange)})
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">거래 내역</h3>
              {lastTrades.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">
                  이번 라운드에서는 거래를 수행하지 않았어요.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {lastTrades.map((trade, index) => {
                    const name =
                      stocksByTicker[trade.ticker]?.displayName ?? trade.ticker;
                    const action = trade.type === "buy" ? "매수" : "매도";
                    return (
                      <li key={`${trade.ticker}-${index}`} className="flex flex-col rounded border border-slate-100 p-2">
                        <span className="font-semibold text-slate-800">
                          {name} {action} {trade.quantity}주
                        </span>
                        <span>
                          체결가 {formatCurrency(trade.price)} · 수수료{" "}
                          {formatCurrency(trade.fee)} · 현금 변화{" "}
                          {formatCurrency(trade.cashImpact)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {isGameOver && latestSnapshot && (
        <section className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">게임 종료</h2>
          <p className="mt-2 text-sm text-slate-600">
            최종 자산 {formatCurrency(latestSnapshot.totalValue)} · 수익률{" "}
            {formatPercent(currentReturnPct)}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-700">
            {victoryAchieved
              ? "축하합니다! 목표 수익률을 달성했어요."
              : "아쉽지만 목표 수익률에 도달하지 못했어요. 다음에 다시 도전해 보세요!"}
          </p>
          <button
            type="button"
            onClick={handleRestart}
            className="mt-4 rounded-lg border border-blue-500 px-6 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            게임 다시 시작
          </button>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800">
          다가올 라운드 미리보기
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          다음 라운드 이후에 어떤 뉴스 카드가 등장할지 미리 파악해 보세요.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {upcomingRounds.map((round) => (
            <div key={round.index} className="rounded-lg border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">
                라운드 {round.index + 1}
              </h3>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                {round.entries.map((entry) => (
                  <li key={entry.news.id} className="border-l-2 border-slate-200 pl-3">
                    <p className="font-semibold text-slate-800">
                      {entry.displayName} · {impactLabel(entry.news.impactHint)}
                    </p>
                    <p className="mt-1 leading-snug text-slate-600">
                      {entry.news.headline}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <StockAnalytics
        snapshots={gameState.snapshots}
        holdings={gameState.holdingsByTicker}
        prices={gameState.priceByTicker}
        stocks={stocksByTicker}
        formatCurrency={formatCurrency}
      />
      <StockTutorialModal open={showTutorial} onClose={handleCloseTutorial} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function createDraftOrders(stocks: StockDefinition[]): DraftOrders {
  return stocks.reduce<DraftOrders>((acc, stock) => {
    acc[stock.ticker] = { buy: 0, sell: 0 };
    return acc;
  }, {});
}

function buildStockMap(
  stocks: StockDefinition[],
): Record<string, StockDefinition> {
  return stocks.reduce<Record<string, StockDefinition>>((acc, stock) => {
    acc[stock.ticker] = stock;
    return acc;
  }, {});
}

function computeReturnPct(value: number, base: number): number {
  if (base === 0) {
    return 0;
  }
  return value / base - 1;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const formatted = (value * 100).toFixed(2);
  return `${value >= 0 ? "+" : ""}${formatted}%`;
}

function formatExpectedChange(expected: ExpectedChange): string {
  if (expected.type === "fixed") {
    return formatPercent(expected.pct);
  }
  return `${formatPercent(expected.minPct)} ~ ${formatPercent(expected.maxPct)}`;
}

function impactLabel(impact: ImpactHint): string {
  switch (impact) {
    case "bullish":
      return "상승 재료";
    case "bearish":
      return "하락 재료";
    default:
      return "중립";
  }
}

function impactBadgeClass(impact: ImpactHint): string {
  switch (impact) {
    case "bullish":
      return "bg-emerald-100 text-emerald-700";
    case "bearish":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}
