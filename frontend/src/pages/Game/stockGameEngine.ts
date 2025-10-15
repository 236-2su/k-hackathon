import type {
  HoldingState,
  PortfolioSnapshot,
  ResolvedNewsEntry,
  RoundPlan,
  RoundResolution,
  StockGameState,
  TradeExecution,
  TradeIntent,
  TradeValidationError,
  ExpectedChange,
} from "./stockGameTypes";
import { createRng } from "./stockGameLoader";
import type { Rng } from "./stockGameLoader";

const EPSILON = 1e-6;

export interface AdvanceRoundOptions {
  rng?: Rng;
}

export interface AdvanceRoundResult {
  nextState: StockGameState;
  tradeExecutions: TradeExecution[];
  tradeErrors: TradeValidationError[];
  resolution?: RoundResolution;
  roundCompleted: boolean;
}

export function advanceRound(
  state: StockGameState,
  intents: TradeIntent[],
  options?: AdvanceRoundOptions,
): AdvanceRoundResult {
  if (state.currentRoundIndex >= state.rounds.length) {
    return {
      nextState: state,
      tradeExecutions: [],
      tradeErrors: [
        {
          code: "ROUND_COMPLETED",
          message: "All rounds have already been completed.",
        },
      ],
      resolution: undefined,
      roundCompleted: true,
    };
  }

  const roundPlan = state.rounds[state.currentRoundIndex];
  const rng =
    options?.rng ??
    (state.seed !== undefined
      ? createRng(`${state.seed}:${state.currentRoundIndex}`)
      : Math.random);

  const holdings = cloneHoldingsMap(state.holdingsByTicker);
  const priceByTicker = clonePriceMap(state.priceByTicker);
  let cash = state.cash;
  const feeRate = state.metadata.transactionFee;
  const tradeExecutions: TradeExecution[] = [];

  for (const intent of intents) {
    const validationError = validateIntent(intent, holdings, priceByTicker, cash, feeRate);
    if (validationError) {
      return {
        nextState: state,
        tradeExecutions: [],
        tradeErrors: [validationError],
        resolution: undefined,
        roundCompleted: state.currentRoundIndex >= state.rounds.length,
      };
    }

    const execution = applyTrade(intent, holdings, priceByTicker, feeRate);
    cash += execution.cashImpact;
    tradeExecutions.push(execution);
    if (cash < -EPSILON) {
      return {
        nextState: state,
        tradeExecutions: [],
        tradeErrors: [
          {
            code: "INSUFFICIENT_FUNDS",
            message: "Trade processing resulted in negative cash balance.",
            ticker: execution.ticker,
          },
        ],
        resolution: undefined,
        roundCompleted: state.currentRoundIndex >= state.rounds.length,
      };
    }
  }

  const { resolution, updatedPrices } = resolveRound(roundPlan, priceByTicker, rng);
  const nextPriceMap = updatedPrices;

  const totalValue = calculateTotalValue(nextPriceMap, holdings, cash);
  const nextSnapshot: PortfolioSnapshot = {
    roundIndex: state.currentRoundIndex + 1,
    cash,
    totalValue,
    priceByTicker: clonePriceMap(nextPriceMap),
    holdingsByTicker: cloneHoldingsMap(holdings),
  };

  const nextState: StockGameState = {
    ...state,
    priceByTicker: nextPriceMap,
    holdingsByTicker: holdings,
    cash,
    currentRoundIndex: Math.min(state.currentRoundIndex + 1, state.rounds.length),
    snapshots: [...state.snapshots, nextSnapshot],
    resolvedRounds: [...state.resolvedRounds, resolution],
  };

  return {
    nextState,
    tradeExecutions,
    tradeErrors: [],
    resolution,
    roundCompleted: nextState.currentRoundIndex >= nextState.rounds.length,
  };
}

function validateIntent(
  intent: TradeIntent,
  holdings: Record<string, HoldingState>,
  priceByTicker: Record<string, number>,
  currentCash: number,
  feeRate: number,
): TradeValidationError | undefined {
  const holding = holdings[intent.ticker];
  if (!holding) {
    return {
      code: "UNKNOWN_STOCK",
      message: `Ticker ${intent.ticker} is not available in this game.`,
      ticker: intent.ticker,
    };
  }

  if (!Number.isFinite(intent.quantity) || intent.quantity <= 0 || !Number.isInteger(intent.quantity)) {
    return {
      code: "INVALID_QUANTITY",
      message: "Trade quantity must be a positive whole number.",
      ticker: intent.ticker,
    };
  }

  const price = resolvePriceForIntent(intent, priceByTicker);
  if (!Number.isFinite(price) || price <= 0) {
    return {
      code: "INVALID_PRICE",
      message: "Trade price must be a positive number.",
      ticker: intent.ticker,
    };
  }

  const grossAmount = price * intent.quantity;
  const fee = grossAmount * feeRate;

  if (intent.type === "buy") {
    if (grossAmount + fee > currentCash + EPSILON) {
      return {
        code: "INSUFFICIENT_FUNDS",
        message: "Not enough cash to execute the buy order.",
        ticker: intent.ticker,
      };
    }
  } else {
    if (intent.quantity > holding.quantity) {
      return {
        code: "INSUFFICIENT_SHARES",
        message: "Cannot sell more shares than currently held.",
        ticker: intent.ticker,
      };
    }
  }

  return undefined;
}

function applyTrade(
  intent: TradeIntent,
  holdings: Record<string, HoldingState>,
  priceByTicker: Record<string, number>,
  feeRate: number,
): TradeExecution {
  const price = resolvePriceForIntent(intent, priceByTicker);
  const grossAmount = price * intent.quantity;
  const fee = grossAmount * feeRate;
  const holding = holdings[intent.ticker];

  if (intent.type === "buy") {
    const newQuantity = holding.quantity + intent.quantity;
    const currentCostBasis = holding.avgCost * holding.quantity;
    const totalCost = currentCostBasis + grossAmount + fee;
    holdings[intent.ticker] = {
      ticker: intent.ticker,
      quantity: newQuantity,
      avgCost: newQuantity > 0 ? totalCost / newQuantity : 0,
    };
    return {
      ticker: intent.ticker,
      type: intent.type,
      quantity: intent.quantity,
      price,
      fee,
      cashImpact: -(grossAmount + fee),
    };
  }

  const remainingQuantity = holding.quantity - intent.quantity;
  holdings[intent.ticker] = {
    ticker: intent.ticker,
    quantity: remainingQuantity,
    avgCost: remainingQuantity > 0 ? holding.avgCost : 0,
  };

  return {
    ticker: intent.ticker,
    type: intent.type,
    quantity: intent.quantity,
    price,
    fee,
    cashImpact: grossAmount - fee,
  };
}

function resolvePriceForIntent(
  intent: TradeIntent,
  priceByTicker: Record<string, number>,
): number {
  if (intent.limitPrice !== undefined) {
    return intent.limitPrice;
  }
  return priceByTicker[intent.ticker];
}

function resolveRound(
  round: RoundPlan,
  currentPrices: Record<string, number>,
  rng: Rng,
): {
  resolution: RoundResolution;
  updatedPrices: Record<string, number>;
} {
  const priceMap = clonePriceMap(currentPrices);
  const resolvedEntries: ResolvedNewsEntry[] = [];

  for (const entry of round.entries) {
    const previousPrice = currentPrices[entry.ticker];
    if (!Number.isFinite(previousPrice)) {
      continue;
    }
    const pctChange = pickChange(entry.news.expectedChange, rng);
    const newPrice = Math.max(0, Math.round(previousPrice * (1 + pctChange)));
    priceMap[entry.ticker] = newPrice;
    resolvedEntries.push({
      ...entry,
      previousPrice,
      newPrice,
      pctChange,
    });
  }

  return {
    resolution: {
      roundIndex: round.index,
      entries: resolvedEntries,
    },
    updatedPrices: priceMap,
  };
}

function pickChange(expectedChange: ExpectedChange, rng: Rng): number {
  if (expectedChange.type === "fixed") {
    return expectedChange.pct;
  }
  const min = Math.min(expectedChange.minPct, expectedChange.maxPct);
  const max = Math.max(expectedChange.minPct, expectedChange.maxPct);
  if (Math.abs(max - min) < EPSILON) {
    return min;
  }
  return min + rng() * (max - min);
}

function calculateTotalValue(
  prices: Record<string, number>,
  holdings: Record<string, HoldingState>,
  cash: number,
): number {
  const equityValue = Object.values(holdings).reduce((sum, holding) => {
    const price = prices[holding.ticker] ?? 0;
    return sum + holding.quantity * price;
  }, 0);
  return cash + equityValue;
}

function clonePriceMap(source: Record<string, number>): Record<string, number> {
  return Object.entries(source).reduce<Record<string, number>>((acc, [ticker, price]) => {
    acc[ticker] = price;
    return acc;
  }, {});
}

function cloneHoldingsMap(
  source: Record<string, HoldingState>,
): Record<string, HoldingState> {
  return Object.entries(source).reduce<Record<string, HoldingState>>(
    (acc, [ticker, holding]) => {
      acc[ticker] = { ...holding };
      return acc;
    },
    {},
  );
}
