import { z } from "zod";

const Status = z.enum(["tailwind", "headwind", "mixed"]);

export const InsightSchema = z.object({
  headline: z.string().describe("오늘 포트폴리오를 한 문장으로"),
  summary: z.string().describe("3~5문장. 무슨 일이 있었고 왜 중요한지"),
  weather: z.object({
    state: z.enum(["sunny", "cloudy", "stormy"]),
    label: z.string().describe("예: 흐림, 가끔 소나기"),
    explanation: z.string(),
  }),
  factors: z
    .array(
      z.object({
        id: z.string().describe("영문 소문자 식별자, 예: rates"),
        name: z.string().describe("짧은 이름, 예: 금리"),
        kind: z.enum(["macro", "theme"]),
        status: Status,
        now: z.string().describe("지금 상황 1~2문장"),
        why: z.string().describe("왜 내 종목에 중요한지 1~2문장"),
        evidence: z.array(z.string()).describe("근거가 된 데이터·뉴스 (날짜 포함)"),
      }),
    )
    .describe("내 종목을 움직이는 4~7개 요인"),
  holdings: z.array(
    z.object({
      symbol: z.string(),
      name: z.string(),
      status: Status,
      oneLiner: z.string().describe("이 회사가 무엇이고 지금 어떤 이야기 속에 있는지"),
      flow: z.string().describe("최근 1개월 흐름과 그 이유"),
      watch: z.array(z.string()).describe("앞으로 지켜볼 것 1~3개"),
    }),
  ),
  links: z.array(
    z.object({
      from: z.string().describe("factors[].id"),
      to: z.string().describe("holdings[].symbol"),
      effect: z.enum(["positive", "negative"]),
      strength: z.enum(["weak", "medium", "strong"]),
      why: z.string().describe("연결 이유 한 문장"),
    }),
  ),
  glossary: z
    .array(z.object({ term: z.string(), easy: z.string() }))
    .describe("본문에 나온 어려운 용어와 쉬운 설명"),
});

export type Insight = z.infer<typeof InsightSchema>;
export type InsightRecord = { generatedAt: string; insight: Insight };
