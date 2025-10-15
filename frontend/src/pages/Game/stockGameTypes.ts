export type ImpactHint = "bullish" | "bearish" | "neutral";

export interface ExpectedChangeRange {
  type: "range";
  minPct: number;
  maxPct: number;
}

export interface ExpectedChangeFixed {
  type: "fixed";
  pct: number;
}

export type ExpectedChange = ExpectedChangeRange | ExpectedChangeFixed;

export interface StockNewsItem {
  id: string;
  date: string;
  headline: string;
  summary: string;
  impactHint: ImpactHint;
  expectedChange: ExpectedChange;
  insight?: string;
  source?: string;
}

export interface StockDefinition {
  ticker: string;
  symbol: string;
  displayName: string;
  basePrice: number;
  newsPool: StockNewsItem[];
}

export interface StockGameMetadata {
  currency: string;
  initialCapital: number;
  transactionFee: number;
  goalReturnPct: number;
  fxRates: Record<string, number>;
}

export interface StockGameDataset {
  metadata: StockGameMetadata;
  stocks: StockDefinition[];
}

export interface RoundNewsEntry {
  ticker: string;
  symbol: string;
  displayName: string;
  news: StockNewsItem;
}

export interface RoundPlan {
  index: number;
  entries: RoundNewsEntry[];
}

export type TradeType = "buy" | "sell";

export interface TradeIntent {
  ticker: string;
  type: TradeType;
  quantity: number;
  limitPrice?: number;
}

export type TradeValidationCode =
  | "ROUND_COMPLETED"
  | "UNKNOWN_STOCK"
  | "INVALID_QUANTITY"
  | "INSUFFICIENT_FUNDS"
  | "INSUFFICIENT_SHARES"
  | "INVALID_PRICE";

export interface TradeValidationError {
  ticker?: string;
  code: TradeValidationCode;
  message: string;
}

export interface TradeExecution {
  ticker: string;
  type: TradeType;
  quantity: number;
  price: number;
  fee: number;
  cashImpact: number;
}

export interface HoldingState {
  ticker: string;
  quantity: number;
  avgCost: number;
}

export interface PortfolioSnapshot {
  roundIndex: number;
  cash: number;
  totalValue: number;
  priceByTicker: Record<string, number>;
  holdingsByTicker: Record<string, HoldingState>;
}

export interface ResolvedNewsEntry extends RoundNewsEntry {
  previousPrice: number;
  newPrice: number;
  pctChange: number;
}

export interface RoundResolution {
  roundIndex: number;
  entries: ResolvedNewsEntry[];
}

export interface StockGameState {
  metadata: StockGameMetadata;
  priceByTicker: Record<string, number>;
  holdingsByTicker: Record<string, HoldingState>;
  cash: number;
  rounds: RoundPlan[];
  currentRoundIndex: number;
  snapshots: PortfolioSnapshot[];
  resolvedRounds: RoundResolution[];
  seed?: number | string;
}
