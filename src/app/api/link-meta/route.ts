/**
 * Studio 미리보기용 링크 카드 재료.
 *
 * 상세 페이지는 서버 컴포넌트라 재료를 직접 읽지만, Studio 미리보기는 브라우저에서
 * 돌아 DB 를 못 본다. 같은 카드 대상을 던지면 같은 재료를 돌려주는 통로가 필요하다.
 * 아직 저장 전인 주소도 있으므로 여기서 수집까지 한다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { CARD_LINE_RE } from "@/lib/link-cards";
import { getLinkMeta, syncLinkMetaUrls } from "@/lib/link-meta";
import { getPostRefs } from "@/lib/posts";
import { requireApiUser } from "@/lib/api-shared";

/** 한 편에 카드가 이 이상 나올 일은 없다 — 미리보기가 외부 요청 폭탄이 되지 않게. */
const MAX_TARGETS = 40;

const Schema = z.object({
  urls: z.array(z.string()).max(MAX_TARGETS).default([]),
  slugs: z.array(z.string()).max(MAX_TARGETS).default([]),
});

export async function POST(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  // 카드 줄로 성립하는 주소만 통과시킨다 — 이 통로가 임의 URL 요청기가 되지 않게.
  const urls = parsed.data.urls.filter(
    (u) => CARD_LINE_RE.test(u) && /^https?:\/\//.test(u),
  );

  // 남의 사이트가 느려도 미리보기는 떠야 한다 — 못 읽으면 도메인 한 줄로 떨어진다.
  await syncLinkMetaUrls(urls).catch(() => {});

  const [links, posts] = await Promise.all([
    getLinkMeta(urls),
    // 미리보기는 로그인한 필자만 보므로 아직 발행 전인 글도 카드로 보여준다.
    getPostRefs(parsed.data.slugs, { includeDrafts: true }),
  ]);

  return NextResponse.json({ links, posts });
}
