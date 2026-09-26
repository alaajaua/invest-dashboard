import { collect } from "@/lib/market/collector";

// Vercel Cron이 호출. 수동 새로고침용으로 3회를 남겨 둔다.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json(await collect({ reserve: 3, deadlineMs: 50_000 }));
  } catch (e) {
    console.error("cron collect failed", e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
