"use server";

import { revalidatePath } from "next/cache";
import { generateInsight } from "@/lib/insight/generate";
import { collect, type CollectResult } from "@/lib/market/collector";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function refreshData(): Promise<CollectResult | { error: string }> {
  if (!(await requireUser())) return { error: "로그인이 필요합니다." };
  try {
    const result = await collect({ reserve: 0, deadlineMs: 50_000 });
    revalidatePath("/");
    return result;
  } catch (e) {
    console.error("refreshData failed", e);
    return { error: message(e) };
  }
}

export async function refreshInsight(): Promise<{ ok: true } | { error: string }> {
  if (!(await requireUser())) return { error: "로그인이 필요합니다." };
  try {
    await generateInsight();
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("refreshInsight failed", e);
    return { error: message(e) };
  }
}
