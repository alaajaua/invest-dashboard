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
