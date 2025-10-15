import type {
  HoldingState,
  PortfolioSnapshot,
  StockDefinition,
} from "./stockGameTypes";

interface StockAnalyticsProps {
  snapshots: PortfolioSnapshot[];
  holdings: Record<string, HoldingState>;
  prices: Record<string, number>;
  stocks: Record<string, StockDefinition>;
  formatCurrency: (value: number) => string;
}

export function StockAnalytics({
  snapshots,
  holdings,
  prices,
  stocks,
  formatCurrency,
}: StockAnalyticsProps) {
  if (snapshots.length === 0) {
    return null;
  }

  const latestSnapshot = snapshots[snapshots.length - 1];
  const startValue = snapshots[0]?.totalValue ?? 0;
  const endValue = latestSnapshot.totalValue;
  const pctChange = startValue === 0 ? 0 : endValue / startValue - 1;

  const lineChart = buildLineChartData(snapshots);
  const holdingMetrics = buildHoldingMetrics(holdings, prices, stocks);
  const hasHoldings = holdingMetrics.length > 0;

  return (
    <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">자산 추이 & 종목 성과</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">포트폴리오 가치</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(endValue)}</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-sm font-semibold ${pctChange >= 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
              {formatPercent(pctChange)}
            </div>
          </div>
          <PortfolioLineChart data={lineChart} />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>시작: {formatCurrency(startValue)}</span>
            <span>최근 라운드: {formatCurrency(endValue)}</span>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">종목별 손익</p>
          {hasHoldings ? (
            <ul className="mt-3 space-y-3">
              {holdingMetrics.map((metric) => (
                <li key={metric.ticker} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                    <span>{metric.displayName}</span>
                    <span>{formatPercent(metric.pnlPct)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                    <span>평균 단가 {formatCurrency(metric.avgCost)}</span>
                    <span>시장가 {formatCurrency(metric.marketPrice)}</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${metric.pnlPct >= 0 ? "bg-blue-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, Math.abs(metric.pnlPct) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-600">보유 {metric.quantity.toLocaleString()}주</span>
                    <span className={metric.pnl >= 0 ? "text-blue-600" : "text-red-600"}>
                      {metric.pnl >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(metric.pnl))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              보유 중인 종목이 없어요. 거래를 진행하면 손익 차트가 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

interface LineChartPoint {
  x: number;
  y: number;
  value: number;
}

const CHART_WIDTH = 540;
const CHART_HEIGHT = 160;

function buildLineChartData(snapshots: PortfolioSnapshot[]): LineChartPoint[] {
  const values = snapshots.map((snapshot) => snapshot.totalValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(1, maxValue - minValue);
  const count = values.length;
  const xStep = count > 1 ? CHART_WIDTH / (count - 1) : 0;

  return values.map((value, index) => {
    const normalized = (value - minValue) / range;
    const x = index * xStep;
    const y = CHART_HEIGHT - normalized * CHART_HEIGHT;
    return { x, y, value };
  });
}

function PortfolioLineChart({ data }: { data: LineChartPoint[] }) {
  if (data.length === 0) {
    return null;
  }

  const path = data
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-48 w-full">
        <defs>
          <linearGradient id="portfolioLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${data[data.length - 1].x.toFixed(2)} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`}
          fill="url(#portfolioLineGradient)"
        />
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={3} strokeLinecap="round" />
        {data.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={4} fill="#2563eb" />
        ))}
      </svg>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>라운드 0</span>
        <span>라운드 {data.length - 1}</span>
      </div>
    </div>
  );
}

interface HoldingMetric {
  ticker: string;
  displayName: string;
  quantity: number;
  avgCost: number;
  marketPrice: number;
  pnl: number;
  pnlPct: number;
}

function buildHoldingMetrics(
  holdings: Record<string, HoldingState>,
  prices: Record<string, number>,
  stocks: Record<string, StockDefinition>,
): HoldingMetric[] {
  const metrics: HoldingMetric[] = [];

  Object.values(holdings).forEach((holding) => {
    if (holding.quantity <= 0) {
      return;
    }
    const price = prices[holding.ticker] ?? 0;
    const costBasis = holding.avgCost * holding.quantity;
    const marketValue = price * holding.quantity;
    const pnl = marketValue - costBasis;
    const pnlPct =
      costBasis === 0 ? 0 : marketValue / Math.max(1, costBasis) - 1;
    const stock = stocks[holding.ticker];

    metrics.push({
      ticker: holding.ticker,
      displayName: stock?.displayName ?? holding.ticker,
      quantity: holding.quantity,
      avgCost: holding.avgCost,
      marketPrice: price,
      pnl,
      pnlPct,
    });
  });

  return metrics.sort((a, b) => b.pnlPct - a.pnlPct);
}

function formatPercent(value: number): string {
  const formatted = (value * 100).toFixed(2);
  return `${value >= 0 ? "+" : ""}${formatted}%`;
}
