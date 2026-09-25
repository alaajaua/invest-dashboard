"use server";

import { revalidatePath } from "next/cache";
import { collect, type CollectResult } from "@/lib/market/collector";
import { createClient } from "@/lib/supabase/server";

export async function refreshData(): Promise<CollectResult | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const result = await collect({ reserve: 0, deadlineMs: 50_000 });
  revalidatePath("/");
  return result;
}
