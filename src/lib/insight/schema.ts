// Claude 예약 작업이 매일 market_cache('insight:map')에 저장하는 데이터 형식.
// 예약 작업 지시문(docs/ROUTINE.md)의 JSON 형식과 반드시 같이 바꿀 것.
export const INSIGHT_KEY = "insight:map";

export type Status = "tailwind" | "headwind" | "mixed";

export type Insight = {
  headline: string;
  summary: string;
  weather: { state: "sunny" | "cloudy" | "stormy"; label: string; explanation: string };
  factors: {
    id: string;
    name: string;
    kind: "macro" | "theme";
    status: Status;
    now: string;
    why: string;
    evidence: string[];
  }[];
  holdings: { symbol: string; name: string; status: Status; oneLiner: string; flow: string; watch: string[] }[];
  links: {
    from: string;
    to: string;
    effect: "positive" | "negative";
    strength: "weak" | "medium" | "strong";
    why: string;
  }[];
  glossary: { term: string; easy: string }[];
};

export type InsightRecord = { generatedAt: string; insight: Insight };

// 종목 상세 화면용. 예약 작업이 종목마다 market_cache('stock:<SYMBOL>')에 저장한다.
export const stockKey = (symbol: string) => `stock:${symbol}`;

export type Impact = "positive" | "negative" | "neutral";

export type StockDetail = {
  symbol: string;
  name: string;
  intro: { what: string; howMoney: string; sector: string };
  prices: { date: string; close: number }[];
  events: { date: string; title: string; explanation: string; impact: Impact }[];
  drivers: { name: string; status: Status; explanation: string }[];
  scenarios: {
    bull: { conditions: string; meaning: string };
    base: { conditions: string; meaning: string };
    bear: { conditions: string; meaning: string };
  };
  upcoming: { date: string; what: string }[];
  risks: string[];
  news: { date: string; title: string; source: string; url: string; impact: Impact }[];
  glossary: { term: string; easy: string }[];
};

export type StockRecord = { generatedAt: string; detail: StockDetail };
