export type GameType = "typing" | "calculating" | "stock";

export interface RewardPayload {
  zepUserId: string;
  gameType: GameType;
  success: boolean;
  earnedGold: number;
}

export interface RewardResponse {
  id: number;
  zepUserId: string;
  nickname: string;
  job: string;
  gold: number;
}

export interface ZepContext {
  zepUserId: string;
  nickname: string;
  job: string;
}

export function getZepContext(): ZepContext {
  try {
    const params = new URLSearchParams(window.location.search);
    const zepUserId = params.get("zep_user_id") || "local-debug";
    const nickname = params.get("nickname") || "방문자";
    const job = params.get("job") || "";
    return { zepUserId, nickname, job };
  } catch (err) {
    console.warn("Failed to parse ZEP query parameters:", err);
    return { zepUserId: "local-debug", nickname: "방문자", job: "" };
  }
}

export async function postReward(payload: RewardPayload): Promise<RewardResponse> {
  const response = await fetch("/api/users/rewards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const reason = await safeReadText(response);
    throw new Error(reason || "보상 요청을 처리하지 못했습니다.");
  }

  return (await response.json()) as RewardResponse;
}

async function safeReadText(response: Response): Promise<string | null> {
  try {
    return await response.text();
  } catch {
    return null;
  }
}
