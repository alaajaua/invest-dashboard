import { collect } from "@/lib/market/collector";

// Vercel Cron이 호출. 수동 새로고침용으로 3회를 남겨 둔다.
export const maxDuration = 300;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await collect({ reserve: 3, deadlineMs: 280_000 });
  return Response.json(result);
}
