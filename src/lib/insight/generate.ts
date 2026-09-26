import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildContext } from "./context";
import { InsightSchema, type InsightRecord } from "./schema";

export const INSIGHT_KEY = "insight:map";

const SYSTEM = `당신은 투자 초보자에게 시장을 설명하는 친절한 해설가입니다.
사용자는 미국 주식을 수주~수개월 단위로 보유하며, 수익률 숫자보다 "흐름·맥락·영향"을 이해하고 싶어 합니다.

규칙:
- 반드시 제공된 데이터(가격, 뉴스, 실적, 거시지표)에 근거해 설명하세요. 데이터에 없는 사실을 지어내지 마세요.
  데이터가 부족하면 "데이터가 아직 부족하다"고 솔직히 쓰세요.
- 중학생도 이해할 수 있는 쉬운 한국어로, 짧은 문장으로 쓰세요. 전문 용어를 쓰면 glossary에 쉬운 설명을 넣으세요.
- 숫자 나열보다 인과관계("A 때문에 B가 되고, 그래서 내 종목 C에 영향")를 설명하세요.
- factors는 거시(금리·물가·경기 등)와 테마(AI 인프라, 우주산업 등)를 섞어 4~7개로 정리하세요.
- links는 factors[].id에서 holdings[].symbol로만 연결하고, 모든 보유 종목이 최소 1개 연결을 갖게 하세요.
- 매수·매도를 지시하지 말고, 판단에 필요한 관점과 지켜볼 것을 제시하세요.`;

export async function generateInsight(): Promise<InsightRecord> {
  const db = createAdminClient();
  const { data: holdings, error } = await db.from("holdings").select("symbol");
  if (error) throw new Error(`보유 종목 조회 실패: ${error.message}`);
  const symbols = [...new Set((holdings ?? []).map((h) => h.symbol as string))].sort();
  if (!symbols.length) throw new Error("등록된 종목이 없습니다.");

  const context = await buildContext(db, symbols);
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(InsightSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `아래 데이터로 오늘의 영향 지도를 만들어 주세요.\n\n${JSON.stringify(context)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("AI가 요청을 처리하지 못했습니다 (refusal).");
  if (!response.parsed_output) throw new Error(`AI 응답 해석 실패 (stop_reason: ${response.stop_reason})`);

  const record: InsightRecord = { generatedAt: new Date().toISOString(), insight: response.parsed_output };
  const { error: saveError } = await db
    .from("market_cache")
    .upsert({ key: INSIGHT_KEY, data: record, fetched_at: record.generatedAt });
  if (saveError) throw new Error(`결과 저장 실패: ${saveError.message}`);
  return record;
}
