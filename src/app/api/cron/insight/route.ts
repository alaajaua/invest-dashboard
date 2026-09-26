import { generateInsight } from "@/lib/insight/generate";

// Vercel Cron이 데이터 수집 이후(한국 아침) 호출. AI 생성은 1분 이상 걸릴 수 있다.
export const maxDuration = 300;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { generatedAt } = await generateInsight();
    return Response.json({ generatedAt });
  } catch (e) {
    console.error("cron insight failed", e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
