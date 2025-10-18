import { ReactNode, useEffect, useMemo, useState } from "react";
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
import { GameResultModal } from "./components/GameResultModal";
import { getZepContext, postReward } from "./gameApi";
import type { GameType } from "./gameApi";

const DEFAULT_ROUNDS = 10;
const GAME_TYPE: GameType = "stock";
const SUCCESS_REWARD = 4000;
interface OrderDraft {
  type: TradeType | null;
  quantity: number;
}

interface ResultState {
  earnedGold: number;
  success: boolean;
  highlights: string[];
  details: ReactNode;
}
type HoldingInfo = StockGameState["holdingsByTicker"][string];

export default function Stock() {
  const { dataset, initialState } = useMemo(() => {
    const loadedDataset = loadStockGameDataset();
    const state = createInitialGameState(loadedDataset, {
      rounds: DEFAULT_ROUNDS,
    });
    return { dataset: loadedDataset, initialState: state };
  }, []);

  const { zepUserId } = useMemo(() => getZepContext(), []);
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
  const [showTutorial, setShowTutorial] = useState(true);
  const [result, setResult] = useState<ResultState | null>(null);
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [rewardSubmitted, setRewardSubmitted] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

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
    if (!isGameOver || !latestSnapshot) {
      return;
    }
    if (result) {
      return;
    }
    const earnedGold = victoryAchieved ? SUCCESS_REWARD : 0;
    setResult({
      earnedGold,
      success: victoryAchieved,
      highlights: [
        `\uCD5C\uC885 \uC790\uC0B0: ${formatCurrency(latestSnapshot.totalValue)}`,
        `\uC218\uC775\uB960: ${formatPercent(currentReturnPct)}`,
      ],
      details: buildStockResultDetails(gameState, stocksByTicker),
    });
  }, [
    isGameOver,
    latestSnapshot,
    victoryAchieved,
    currentReturnPct,
    gameState,
    stocksByTicker,
    result,
  ]);
  const notifyZep = (success: boolean, earnedGold: number) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.parent?.postMessage(
        { type: 'gameResult', success, gold: earnedGold, gameType: GAME_TYPE },
        '*',
      );
    } catch (err) {
      console.warn('Failed to post result to ZEP:', err);
    }
  };
  const transactionFee = gameState.metadata.transactionFee;
  const holding = gameState.holdingsByTicker[firstTicker];
  const currentPrice = gameState.priceByTicker[firstTicker] ?? 0;
  const holdingQuantity = holding?.quantity ?? 0;
  const cash = gameState.cash;
  const totalAsset = (holdingQuantity * currentPrice) + cash;

  const maxBuyQuantity = computeMaxBuyQuantity(
    cash,
    currentPrice,
    transactionFee,
  );

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
      if (
        orderDraft.type === "buy" &&
        orderDraft.quantity > maxBuyQuantity
      ) {
        setErrorMessage(
          `현재 보유 현금으로는 최대 ${maxBuyQuantity.toLocaleString()}주까지 매수할 수 있어요.`,
        );
        setTradeMessage(null);
        return;
      }
      if (
        orderDraft.type === "sell" &&
        orderDraft.quantity > holdingQuantity
      ) {
        setErrorMessage(
          `보유 수량은 ${holdingQuantity.toLocaleString()}주예요.`,
        );
        setTradeMessage(null);
        return;
      }

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
      setTradeMessage(`${stockName} ${action} ${execution.quantity}주를 체결했습니다.`);
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
    setResult(null);
    setRewardSubmitted(false);
    setRewardError(null);
    setShowTutorial(true);
  };

  const handleOpenTutorial = () => {
    setShowTutorial(true);
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
  };

  const handleResultConfirm = async () => {
    if (!result) {
      return;
    }
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
  };

  const handleRetry = () => {
    handleRestart();
  };
  const holdingValue = holdingQuantity * currentPrice;

  const assetColorClass =
    currentReturnPct > 0
      ? "border-red-200 bg-red-50 text-red-600"
      : currentReturnPct < 0
        ? "border-blue-200 bg-blue-50 text-blue-600"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 text-slate-800">      <header className="flex flex-col items-center gap-3">
        <h1 className="text-center text-3xl font-bold text-slate-900">첫걸음그룹 모의 투자</h1>
        <p className="text-center text-sm text-slate-600">10라운드 동안 뉴스와 시장 상황을 살피며 10% 수익률에 도전하세요.</p>
        <button
          type="button"
          onClick={handleOpenTutorial}
          className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
        >
          튜토리얼 다시 보기
        </button>
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
              label="보유 현금"
              value={formatCurrency(cash)}
            />
            <InfoRow
              label="보유 주식 수"
              value={`${holdingQuantity.toLocaleString()}주`}
            />
            <InfoRow
              label="현재 주가"
              value={formatCurrency(currentPrice)}
            />
            <InfoRow
              label="주식 평가액"
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
                  출처 {currentEntry.news.source ?? "출처 없음"} · {formatDate(currentEntry.news.date)}
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
                  수량 (주 단위)
                  <input
                    type="number"
                    min={0}
                    value={orderDraft.quantity}
                    onChange={(event) => handleQuantityChange(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  {orderDraft.type === "buy"
                    ? `최대 매수 가능 수량: ${maxBuyQuantity.toLocaleString()}주`
                    : orderDraft.type === "sell"
                      ? `보유 수량: ${holdingQuantity.toLocaleString()}주`
                      : "매수 또는 매도를 선택해 주세요."}
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetDraft}
                    className="text-xs text-slate-500 underline transition hover:text-slate-700"
                  >
                    입력 초기화
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleAdvanceRound}
                  className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-600 sm:w-auto sm:px-6"
                >
                  다음 라운드 진행
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
                  ? "축하합니다! 목표 수익률 10%를 달성했어요."
                  : "아쉽지만 목표 수익률 10%를 달성하지 못했어요. 다시 도전해 볼까요?"}
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
                      {formatCurrency(entry.previousPrice)} → {formatCurrency(entry.newPrice)} (
                      {formatPercent(entry.pctChange)})
                    </p>
                  </div>
                ))}
                <div className="rounded-lg border border-slate-100 px-3 py-2">
                  <p className="font-semibold text-slate-800">거래 내역</p>
                  {lastTrades.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      지난 라운드에는 거래가 없었어요.
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
                라운드를 진행하면 각 종목의 거래 결과가 여기 정리돼요.
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
              목표 수익률 10% 이상을 달성해 보세요!
            </p>
          </section>
        </aside>
      </div>

      <GameResultModal
        open={result !== null}
        gameName="주식 게임"
        earnedGold={result?.earnedGold ?? 0}
        success={result?.success ?? false}
        highlights={result?.highlights ?? []}
        details={result?.details}
        submitting={rewardSubmitting}
        error={rewardError}
        onConfirm={handleResultConfirm}
        onRetry={handleRetry}
        confirmLabel={result?.success ? "보상 받기" : "닫기"}
        retryLabel="새로운 게임 도전"
      />
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

function buildStockResultDetails(
  gameState: StockGameState,
  stocksByTicker: Record<string, StockDefinition>,
): ReactNode {
  const entries = Object.entries(gameState.holdingsByTicker) as Array<[string, HoldingInfo]>;
  const nonZero = entries.filter(([, holding]) => holding.quantity > 0);
  if (nonZero.length === 0) {
    return <p className="text-sm text-slate-600">보유 중인 주식이 없습니다.</p>;
  }
  return (
    <div>
      <p className="font-semibold mb-2">보유 종목 요약</p>
      <ul className="space-y-1">
        {nonZero.map(([ticker, holding]) => {
          const stock = stocksByTicker[ticker];
          const displayName = stock?.displayName ?? ticker;
          const price = gameState.priceByTicker[ticker] ?? 0;
          const valuation = holding.quantity * price;
          return (
            <li key={ticker}>
              {displayName} {holding.quantity.toLocaleString()}주 · 평가금액 {formatCurrency(valuation)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
function computeMaxBuyQuantity(
  cash: number,
  price: number,
  feeRate: number,
): number {
  if (!Number.isFinite(cash) || !Number.isFinite(price)) {
    return 0;
  }
  if (price <= 0 || cash <= 0) {
    return 0;
  }
  const effectivePrice = price * (1 + Math.max(0, feeRate));
  if (effectivePrice <= 0) {
    return 0;
  }
  return Math.max(0, Math.floor(cash / effectivePrice));
}










