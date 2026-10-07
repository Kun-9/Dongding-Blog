/**
 * 릴리스 글감 수집 — GitHub Releases 에서 "릴리스 노트" 카테고리의 글감이
 * 될 만한 것만 골라 온다.
 *
 * next 에 의존하지 않는 순수 모듈이다 — `scripts/check-releases.mjs` 가
 * 그대로 import 해 필터를 점검한다. DB 는 건드리지 않는다: 저장은 호출한
 * API 라우트가 한다.
 */

/** 이 길이를 넘는 본문만 글감으로 본다. 의존성 범프는 대개 200자 미만. */
export const MIN_BODY = 2500;

export interface Candidate {
  id: string;
  repo: string;
  tag: string;
  name: string | null;
  published_at: string;
  url: string;
  body: string;
}

/**
 * 글감 판정.
 *
 * 버전 번호로 거르지 않는다. 마이너만 글감으로 쳤더니 claude-code 가 통째로
 * 빠졌다 — 그쪽은 마이너를 안 내고 패치(v2.1.267)에 8천 자를 담는다.
 * `@scope/pkg@1.2.3` 꼴은 monorepo 하위 패키지라 버린다: vercel/ai 한 곳이
 * 하루에 수십 개를 낸다.
 */
export function worthWriting(tag: string, body: string | null): boolean {
  return !tag.startsWith("@") && (body ?? "").length >= MIN_BODY;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

/**
 * per_page 가 크면 릴리스가 많은 레포에서 504 가 난다 (openai/codex).
 * 레포 하나가 실패해도 나머지 수집은 계속되도록 던지지 않고 빈 배열을 준다.
 *
 * 토큰은 없어도 된다 — 공개 레포라 익명으로도 읽힌다. 다만 익명은 시간당
 * 60회라 레포가 60곳을 넘거나 수집을 자주 돌리면 토큰을 넣어야 한다.
 */
async function fetchReleases(
  repo: string,
  token: string | undefined,
): Promise<GitHubRelease[]> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/releases?per_page=60`,
    {
      headers: {
        accept: "application/vnd.github+json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  return (await res.json()) as GitHubRelease[];
}

export interface CollectResult {
  repo: string;
  /** 기간 안의 정식 릴리스 수. 필터 전. */
  recent: number;
  candidates: Candidate[];
}

/** 레포 하나를 훑어 글감만 추린다. */
export async function collectFrom(
  repo: string,
  token: string | undefined,
  since: number,
): Promise<CollectResult> {
  const list = await fetchReleases(repo, token);
  const recent = list.filter(
    (r) =>
      !r.prerelease && !r.draft && Date.parse(r.published_at) >= since,
  );
  return {
    repo,
    recent: recent.length,
    candidates: recent
      .filter((r) => worthWriting(r.tag_name, r.body))
      .map((r) => ({
        // 같은 릴리스를 다시 수집해도 행이 늘지 않게 하는 자연키.
        id: `${repo}@${r.tag_name}`,
        repo,
        tag: r.tag_name,
        name: r.name,
        published_at: r.published_at,
        url: r.html_url,
        body: r.body ?? "",
      })),
  };
}
