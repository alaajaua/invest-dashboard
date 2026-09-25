const BASE_URL = "https://www.alphavantage.co/query";

export class RateLimitError extends Error {
  constructor(message: string, readonly daily: boolean) {
    super(message);
  }
}

// Alpha Vantage는 오류도 HTTP 200 + {"Information" | "Note" | "Error Message"}로 돌려준다.
export async function avFetch(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", process.env.ALPHAVANTAGE_API_KEY!);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;

  const info = (json["Information"] ?? json["Note"]) as string | undefined;
  if (info) throw new RateLimitError(info, /per day|daily/i.test(info));
  if (json["Error Message"]) throw new Error(String(json["Error Message"]));
  return json;
}

export type Bar = { date: string; open: number; high: number; low: number; close: number; volume: number };

export function parseDaily(json: Record<string, unknown>): Bar[] {
  const series = (json["Time Series (Daily)"] ?? {}) as Record<string, Record<string, string>>;
  return Object.entries(series)
    .map(([date, v]) => ({
      date,
      open: Number(v["1. open"]),
      high: Number(v["2. high"]),
      low: Number(v["3. low"]),
      close: Number(v["4. close"]),
      volume: Number(v["5. volume"]),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  sentiment: number;
  tickers: { ticker: string; relevance: number; sentiment: number }[];
};

type RawNews = {
  title: string;
  url: string;
  source: string;
  time_published: string;
  summary: string;
  overall_sentiment_score: number;
  ticker_sentiment?: { ticker: string; relevance_score: string; ticker_sentiment_score: string }[];
};

export function parseNews(json: Record<string, unknown>): NewsItem[] {
  return ((json["feed"] ?? []) as RawNews[]).map((n) => ({
    title: n.title,
    url: n.url,
    source: n.source,
    // 20240115T133000 → 2024-01-15T13:30:00Z
    publishedAt: n.time_published.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6Z"),
    summary: n.summary,
    sentiment: Number(n.overall_sentiment_score),
    tickers: (n.ticker_sentiment ?? []).map((t) => ({
      ticker: t.ticker,
      relevance: Number(t.relevance_score),
      sentiment: Number(t.ticker_sentiment_score),
    })),
  }));
}

export type Point = { date: string; value: number };

// 거시경제 지표(CPI, 금리 등) 공통 형식: { data: [{ date, value }] }
export function parseEconomic(json: Record<string, unknown>): Point[] {
  return ((json["data"] ?? []) as { date: string; value: string }[])
    .filter((d) => d.value !== ".")
    .map((d) => ({ date: d.date, value: Number(d.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
