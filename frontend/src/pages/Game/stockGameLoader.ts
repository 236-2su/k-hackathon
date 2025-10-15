import stockNewsRaw from "../../data/stock-news.json?raw";
import type {
  HoldingState,
  PortfolioSnapshot,
  RoundPlan,
  RoundNewsEntry,
  StockDefinition,
  StockGameDataset,
  StockGameMetadata,
  StockGameState,
  StockNewsItem,
} from "./stockGameTypes";

export type Rng = () => number;

const parsedDataset: StockGameDataset = JSON.parse(stockNewsRaw);

function cloneMetadata(metadata: StockGameMetadata): StockGameMetadata {
  return {
    currency: metadata.currency,
    initialCapital: metadata.initialCapital,
    transactionFee: metadata.transactionFee,
    goalReturnPct: metadata.goalReturnPct,
    fxRates: { ...metadata.fxRates },
  };
}

function cloneNewsItem(item: StockNewsItem): StockNewsItem {
  return {
    ...item,
    expectedChange:
      item.expectedChange.type === "range"
        ? {
            type: "range",
            minPct: item.expectedChange.minPct,
            maxPct: item.expectedChange.maxPct,
          }
        : {
            type: "fixed",
            pct: item.expectedChange.pct,
          },
  };
}

function cloneStockDefinition(stock: StockDefinition): StockDefinition {
  return {
    ticker: stock.ticker,
    symbol: stock.symbol,
    displayName: stock.displayName,
    basePrice: stock.basePrice,
    newsPool: stock.newsPool.map(cloneNewsItem),
  };
}

export function loadStockGameDataset(): StockGameDataset {
  return {
    metadata: cloneMetadata(parsedDataset.metadata),
    stocks: parsedDataset.stocks.map(cloneStockDefinition),
  };
}

export function createRng(seed: number | string): Rng {
  let t = typeof seed === "number" ? seed : hashString(seed);
  return function rng() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
  }
  return hash;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateRoundSchedule(
  dataset: StockGameDataset,
  rounds = 10,
  rng: Rng = Math.random,
): RoundPlan[] {
  if (rounds <= 0) {
    throw new Error("rounds must be greater than zero");
  }

  const roundPlans: RoundPlan[] = Array.from({ length: rounds }, (_, index) => ({
    index,
    entries: [] as RoundNewsEntry[],
  }));

  dataset.stocks.forEach((stock) => {
    if (stock.newsPool.length < rounds) {
      throw new Error(
        `Stock ${stock.symbol} has insufficient news items (${stock.newsPool.length}) for ${rounds} rounds.`,
      );
    }

    const shuffled = shuffle(stock.newsPool, rng).slice(0, rounds);
    shuffled.forEach((news, idx) => {
      roundPlans[idx].entries.push({
        ticker: stock.ticker,
        symbol: stock.symbol,
        displayName: stock.displayName,
        news,
      });
    });
  });

  return roundPlans;
}

function buildInitialHoldings(stocks: StockDefinition[]): Record<string, HoldingState> {
  return stocks.reduce<Record<string, HoldingState>>((acc, stock) => {
    acc[stock.ticker] = {
      ticker: stock.ticker,
      quantity: 0,
      avgCost: 0,
    };
    return acc;
  }, {});
}

function buildInitialPrices(stocks: StockDefinition[]): Record<string, number> {
  return stocks.reduce<Record<string, number>>((acc, stock) => {
    acc[stock.ticker] = stock.basePrice;
    return acc;
  }, {});
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

export function createInitialGameState(
  dataset: StockGameDataset,
  options?: { rounds?: number; seed?: number | string },
): StockGameState {
  const rounds = options?.rounds ?? 10;
  const seed = options?.seed;
  const rng = seed !== undefined ? createRng(seed) : Math.random;

  const clones = {
    metadata: cloneMetadata(dataset.metadata),
    stocks: dataset.stocks.map(cloneStockDefinition),
  };

  const roundPlans = generateRoundSchedule(
    { metadata: clones.metadata, stocks: clones.stocks },
    rounds,
    rng,
  );

  const holdings = buildInitialHoldings(clones.stocks);
  const prices = buildInitialPrices(clones.stocks);

  const initialSnapshot: PortfolioSnapshot = {
    roundIndex: 0,
    cash: clones.metadata.initialCapital,
    totalValue: clones.metadata.initialCapital,
    priceByTicker: clonePriceMap(prices),
    holdingsByTicker: cloneHoldingsMap(holdings),
  };

  return {
    metadata: clones.metadata,
    priceByTicker: prices,
    holdingsByTicker: holdings,
    cash: clones.metadata.initialCapital,
    rounds: roundPlans,
    currentRoundIndex: 0,
    snapshots: [initialSnapshot],
    resolvedRounds: [],
    seed,
  };
}
