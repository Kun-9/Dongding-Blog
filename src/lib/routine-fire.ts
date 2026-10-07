/**
 * Claude Code 루틴 즉시 실행 — "AI에게 맡기기"를 누르면 정각을 기다리지 않고
 * 실행기 루틴을 바로 깨운다.
 *
 * 루틴 API 트리거(research preview)를 쓴다. claude.ai/code/routines 에서
 * 루틴을 편집해 API 트리거를 추가하면 URL 과 토큰이 나온다. 둘 다 서버 환경변수
 * 로만 둔다.
 *
 *   RELEASE_ROUTINE_URL   https://api.anthropic.com/v1/claude_code/routines/<id>/fire
 *   RELEASE_ROUTINE_TOKEN 루틴 API 토큰
 *
 * 설정이 없으면 아무것도 하지 않는다 — 루틴의 정기 실행이 결국 집어 간다.
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
  const url = process.env.RELEASE_ROUTINE_URL;
  const token = process.env.RELEASE_ROUTINE_TOKEN;
  if (!url || !token) return { fired: false, reason: "즉시 실행이 설정되지 않음" };

  try {
    const res = await fetch(url, {
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
    if (!res.ok) {
      // 시간당 100회 한도, 토큰 만료 등. 정기 실행이 남아 있으니 요청은 살린다.
      return { fired: false, reason: `루틴 호출 실패 (${res.status})` };
    }
    const body = (await res.json().catch(() => ({}))) as { claude_code_session_url?: string };
    return { fired: true, sessionUrl: body.claude_code_session_url ?? null };
  } catch {
    return { fired: false, reason: "루틴 호출 실패 (응답 없음)" };
  }
}
