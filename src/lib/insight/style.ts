import type { Impact, Status } from "./schema";

// 상태 색은 항상 기호·글자와 함께 쓴다 (색만으로 의미를 전달하지 않음)
export const STATUS: Record<Status, { color: string; icon: string; label: string }> = {
  tailwind: { color: "#0ca30c", icon: "▲", label: "순풍" },
  headwind: { color: "#d03b3b", icon: "▼", label: "역풍" },
  mixed: { color: "#fab219", icon: "◆", label: "혼재" },
};

export const IMPACT: Record<Impact, { color: string; icon: string; label: string }> = {
  positive: { color: "#0ca30c", icon: "▲", label: "호재" },
  negative: { color: "#d03b3b", icon: "▼", label: "악재" },
  neutral: { color: "#898781", icon: "●", label: "중립" },
};
