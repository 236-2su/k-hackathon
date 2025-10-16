import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import {
  createInitialGameState,
  loadStockGameDataset,
} from "./stockGameLoader";
import { advanceRound } from "./stockGameEngine";
import type {
  RoundResolution,
  StockDefinition,
  StockGameState,
  TradeExecution,
  TradeIntent,
  TradeType,
} from "./stockGameTypes";
import { StockTutorialModal } from "./StockTutorialModal";

const DEFAULT_ROUNDS = 10;
const TUTORIAL_STORAGE_KEY = "stock-game/tutorialSeen";

interface OrderDraft {
  type: TradeType | null;
  quantity: number;
}

export default function Stock() {
  const { dataset, initialState } = useMemo(() => {
    const loadedDataset = loadStockGameDataset();
    const state = createInitialGameState(loadedDataset, {
      rounds: DEFAULT_ROUNDS,
    });
    return { dataset: loadedDataset, initialState: state };
  }, []);

  const firstTicker = dataset.stocks[0]?.ticker ?? "";

  const [gameState, setGameState] = useState<StockGameState>(initialState);
  const [orderDraft, setOrderDraft] = useState<OrderDraft>({
    type: null,
    quantity: 0,
  });
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

  const isGameOver = gameState.currentRoundIndex >= gameState.rounds.length;
  const currentRound = !isGameOver
    ? gameState.rounds[gameState.currentRoundIndex]
    : undefined;
  const currentEntry = currentRound?.entries[0] ?? null;

  const latestSnapshot =
    gameState.snapshots[gameState.snapshots.length - 1] ?? null;
  const initialCapital = gameState.metadata.initialCapital;

  const currentReturnPct = latestSnapshot
    ? computeReturnPct(latestSnapshot.totalValue, initialCapital)
    : 0;
  const goalValue =
    initialCapital * (1 + gameState.metadata.goalReturnPct);
  const victoryAchieved =
    isGameOver && latestSnapshot
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
    } catch {
      setShowTutorial(true);
    }
  }, []);

  const handleSelectType = (type: TradeType) => {
    setOrderDraft((prev) => ({
      ...prev,
      type,
    }));
  };

  const handleQuantityChange = (value: string) => {
    const parsed = Math.max(0, Math.floor(Number(value) || 0));
    setOrderDraft((prev) => ({
      ...prev,
      quantity: parsed,
    }));
  };

  const handleResetDraft = () => {
    setOrderDraft({ type: null, quantity: 0 });
    setErrorMessage(null);
    setTradeMessage(null);
  };

  const handleAdvanceRound = () => {
    if (isGameOver) {
      return;
    }

    const intents: TradeIntent[] = [];
    if (
      orderDraft.type !== null &&
      orderDraft.quantity > 0 &&
      currentEntry
    ) {
      intents.push({
        ticker: currentEntry.ticker,
        type: orderDraft.type,
        quantity: orderDraft.quantity,
      });
    }

    const result = advanceRound(gameState, intents);
    if (result.tradeErrors.length > 0) {
      setErrorMessage(result.tradeErrors[0].message);
      setTradeMessage(null);
      return;
    }

    setGameState(result.nextState);
    setLastResolution(result.resolution);
    setLastTrades(result.tradeExecutions);
    setOrderDraft({ type: null, quantity: 0 });
    setErrorMessage(null);

    if (result.tradeExecutions.length > 0) {
      const execution = result.tradeExecutions[0];
      const stockName =
        stocksByTicker[execution.ticker]?.displayName ?? execution.ticker;
      const action = execution.type === "buy" ? "매수" : "매도";
      setTradeMessage(`${stockName} ${action} ${execution.quantity}주를 완료했어요.`);
    } else {
      setTradeMessage("이번 라운드는 관망했어요.");
    }
  };

  const handleRestart = () => {
    const nextState = createInitialGameState(dataset, {
      rounds: DEFAULT_ROUNDS,
      seed: Date.now(),
    });
    setGameState(nextState);
    setOrderDraft({ type: null, quantity: 0 });
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
      } catch {
        // ignore
      }
    }
  };

  const holding = gameState.holdingsByTicker[firstTicker];
  const currentPrice = gameState.priceByTicker[firstTicker] ?? 0;
  const holdingQuantity = holding?.quantity ?? 0;
  const holdingValue = holdingQuantity * currentPrice;
  const cash = gameState.cash;
  const totalAsset = holdingValue + cash;

  const assetColorClass =
    currentReturnPct > 0
      ? "border-red-200 bg-red-50 text-red-600"
      : currentReturnPct < 0
        ? "border-blue-200 bg-blue-50 text-blue-600"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 text-slate-800">
      <header className="flex flex-col items-center gap-2">
        <div className="flex w-full items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
            돌아가기
          </Link>
          <button
            type="button"
            onClick={handleOpenTutorial}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
          >
            {hasSeenTutorial ? "다시 보기" : "처음 안내"}
          </button>
        </div>
        <h1 className="text-center text-3xl font-bold text-slate-900">
          첫걸음 그룹 모의 투자
        </h1>
        <p className="text-center text-sm text-slate-600">
          10라운드 동안 뉴스 한 개씩 살펴보고 매수·매도를 선택해 보세요.
        </p>
      </header>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {tradeMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {tradeMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,1fr)_minmax(340px,1.4fr)_minmax(240px,1fr)]">
        <section className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">보유 현황</h2>
          <dl className="mt-4 space-y-2 text-sm text-slate-600">
            <InfoRow
              label="현재 라운드"
              value={`${Math.min(
                gameState.currentRoundIndex + 1,
                gameState.rounds.length,
              )} / ${gameState.rounds.length}`}
            />
            <InfoRow
              label="현금"
              value={formatCurrency(cash)}
            />
            <InfoRow
              label="보유 주식"
              value={`${holdingQuantity.toLocaleString()}주`}
            />
            <InfoRow
              label="현재 주가"
              value={formatCurrency(currentPrice)}
            />
            <InfoRow
              label="주식 평가"
              value={formatCurrency(holdingValue)}
            />
            <InfoRow
              label="총 자산"
              value={formatCurrency(totalAsset)}
            />
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!isGameOver && currentRound && currentEntry ? (
            <>
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    라운드 {currentRound.index + 1}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {currentEntry.displayName}
                  </h2>
                </div>
              </header>

              <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                <p className="font-semibold text-slate-900">
                  {currentEntry.news.headline}
                </p>
                <p>{currentEntry.news.summary}</p>
                <p className="text-xs text-slate-500">
                  출처 {currentEntry.news.source ?? "알 수 없음"} · {formatDate(currentEntry.news.date)}
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="font-semibold text-slate-700">현재 가격</dt>
                  <dd className="mt-1 text-sm">
                    {formatCurrency(currentPrice)}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-800">
                  이번 라운드 선택
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectType("buy")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      orderDraft.type === "buy"
                        ? "border-red-500 bg-red-50 text-red-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-red-400"
                    }`}
                  >
                    매수
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectType("sell")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      orderDraft.type === "sell"
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-400"
                    }`}
                  >
                    매도
                  </button>
                </div>
                <label className="mt-4 block text-xs font-semibold text-slate-700">
                  수량 (정수 입력)
                  <input
                    type="number"
                    min={0}
                    value={orderDraft.quantity}
                    onChange={(event) => handleQuantityChange(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </label>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetDraft}
                    className="text-xs text-slate-500 underline transition hover:text-slate-700"
                  >
                    입력 비우기
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleAdvanceRound}
                  className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-600 sm:w-auto sm:px-6"
                >
                  다음 라운드 시작
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <h2 className="text-2xl font-bold text-slate-900">
                게임이 끝났어요!
              </h2>
              {latestSnapshot && (
                <div className="space-y-1 text-sm text-slate-600">
                  <p>최종 자산: {formatCurrency(latestSnapshot.totalValue)}</p>
                  <p>수익률: {formatPercent(currentReturnPct)}</p>
                </div>
              )}
              <p className="text-lg font-semibold text-slate-700">
                {victoryAchieved
                  ? "축하해요! 목표였던 10% 수익을 달성했어요."
                  : "아쉽지만 목표 수익률 10%에 닿지 못했어요. 다시 도전해 볼까요?"}
              </p>
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-lg border border-blue-500 px-6 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
              >
                초기 상태로 다시 시작
              </button>
            </div>
          )}
        </section>

        <aside className="flex h-full flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              최근 라운드 정리
            </h2>
            {lastResolution ? (
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                {lastResolution.entries.map((entry) => (
                  <div
                    key={entry.news.id}
                    className="rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <p className="font-semibold text-slate-800">
                      {stocksByTicker[entry.ticker]?.displayName ?? entry.ticker}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCurrency(entry.previousPrice)} →{" "}
                      {formatCurrency(entry.newPrice)} (
                      {formatPercent(entry.pctChange)})
                    </p>
                  </div>
                ))}
                <div className="rounded-lg border border-slate-100 px-3 py-2">
                  <p className="font-semibold text-slate-800">거래 내역</p>
                  {lastTrades.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      지난 라운드에서는 거래가 없었어요.
                    </p>
                  ) : (
                    lastTrades.map((trade, index) => (
                      <p key={`${trade.ticker}-${index}`} className="mt-1 text-xs text-slate-500">
                        {trade.type === "buy" ? "매수" : "매도"} {trade.quantity}주 · 체결가{" "}
                        {formatCurrency(trade.price)}
                      </p>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                라운드를 진행하면 가격 변화와 거래 결과가 여기에 정리돼요.
              </p>
            )}
          </section>

          <section
            className={`mt-auto rounded-2xl border px-5 py-4 shadow-sm ${assetColorClass}`}
          >
            <h2 className="text-lg font-semibold">현재 자산</h2>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(latestSnapshot?.totalValue ?? initialCapital)}
            </p>
            <p className="mt-1 text-sm font-semibold">
              수익률 {formatPercent(currentReturnPct)}
            </p>
            <p className="mt-3 text-xs text-slate-600">
              목표 수익률: 10% 이상 달성 시 승리!
            </p>
          </section>
        </aside>
      </div>

      <StockTutorialModal open={showTutorial} onClose={handleCloseTutorial} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
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

function formatDate(value: string | undefined): string {
  if (!value) {
    return "날짜 정보 없음";
  }
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return formatter.format(parsed);
  } catch {
    return value;
  }
}
