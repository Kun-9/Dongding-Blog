/**
 * Claude Code 루틴 즉시 실행 — "AI에게 맡기기"를 누르면 정각을 기다리지 않고
 * 실행기 루틴을 그 주제 하나만 맡아 돌도록 바로 깨운다. kakepu·Plate 와 같은 방식.
 *
 * 루틴 API 트리거(research preview)를 쓴다. claude.ai/code/routines 에서 루틴에
 * API 트리거를 추가하면 트리거 id 와 토큰이 나온다. 둘 다 서버 환경변수로만 둔다.
 *
 *   ROUTINE_TRIGGER_ID  trig_…
 *   ROUTINE_FIRE_TOKEN  루틴 API 토큰
 *
 * 설정이 없거나 호출이 실패하면 요청은 queued 로 남아 루틴의 정기 실행이 집어 간다.
 * 실행기는 claim 으로 하나씩만 집으므로 즉시 실행과 정기 실행이 겹쳐도 같은
 * 주제를 두 번 처리하지 않는다.
 */
import "server-only";

/** 문서에 적힌 베타 헤더. 바뀌면 이전 두 버전까지는 받아 준다. */
const BETA = "experimental-cc-routine-2026-04-01";

export type FireResult =
  | { fired: true; sessionUrl: string | null }
  | { fired: false; reason: string };

export async function fireReleaseRoutine(text: string): Promise<FireResult> {
  const trigger = process.env.ROUTINE_TRIGGER_ID;
  const token = process.env.ROUTINE_FIRE_TOKEN;
  if (!trigger || !token) return { fired: false, reason: "즉시 실행이 설정되지 않음" };

  let res: Response;
  try {
    res = await fetch(`https://api.anthropic.com/v1/claude_code/routines/${trigger}/fire`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "anthropic-beta": BETA,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ text }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    // 시간만 다 됐으면 요청은 이미 닿았을 수 있다. 안 닿았어도 정기 실행이 집어 간다.
    if (e instanceof DOMException && e.name === "TimeoutError") return { fired: true, sessionUrl: null };
    return { fired: false, reason: "루틴 호출 실패 (응답 없음)" };
  }
  if (!res.ok) {
    console.error("[routine] fire", res.status, await res.text().catch(() => ""));
    return {
      fired: false,
      reason:
        res.status === 429
          ? "루틴 호출 한도 초과"
          : res.status === 401 || res.status === 403
            ? "루틴 토큰 만료"
            : `루틴 호출 실패 (${res.status})`,
    };
  }
  const body = (await res.json().catch(() => ({}))) as { claude_code_session_url?: string };
  return { fired: true, sessionUrl: body.claude_code_session_url ?? null };
}
