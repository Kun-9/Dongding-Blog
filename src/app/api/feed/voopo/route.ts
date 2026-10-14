/**
 * Voopo 피드 — Voopo(바이브코딩 쇼케이스)가 뉴스 '주간 브리핑' 후보를 읽어 가는
 * 읽기 전용 API. 최근 발행 글과 최근 릴리스 글감을 준다.
 *
 * 인증은 정적 Bearer(VOOPO_FEED_TOKEN). 환경 변수가 없거나 토큰이 다르면 401.
 * 내보내는 값은 공개해도 되는 것만이다: 발행 글의 제목·요약·주소, 릴리스의
 * GitHub 공개 메타, 탐색기 한 줄 요약. 글감 메모·작업 노트·초안은 싣지 않는다.
 *
 * 글은 publishable 키(db)로 읽는다 — RLS 가 published 만 내보내므로 조건을
 * 빠뜨려도 초안이 새지 않는다. 글감·주제는 select 정책이 없어 dbAdmin 으로 읽는다.
 *
 * ponytail: 캐시하지 않는다. Voopo 가 주에 몇 번 부르는 정도라 매번 조회해도 싸다.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db, dbAdmin } from "@/lib/supabase";
import { getCategories } from "@/lib/categories";
import { categoryLabelIn, resolveCategoryIn } from "@/lib/category-utils";
import { getSite } from "@/lib/site-db";
import { dateToISO, postSummary, releaseLinks } from "@/lib/voopo-feed";

const POST_DAYS = 30;
const POST_LIMIT = 50;
const RELEASE_DAYS = 14;
const RELEASE_LIMIT = 100;

/** 401 사유. 토큰 값은 어디에도 남기지 않는다. */
function denied(req: Request): string | null {
  const expected = process.env.VOOPO_FEED_TOKEN;
  if (!expected) return "VOOPO_FEED_TOKEN 이 설정되지 않았다";
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? null : "토큰이 맞지 않는다";
}

export async function GET(req: Request) {
  const reason = denied(req);
  if (reason) return NextResponse.json({ error: reason }, { status: 401 });

  const now = Date.now();
  const postSince = new Date(now - POST_DAYS * 864e5).toISOString().slice(0, 10);
  const releaseSince = new Date(now - RELEASE_DAYS * 864e5).toISOString();

  const [posts, releases, categories, site] = await Promise.all([
    db()
      .from("posts")
      .select("id, slug, title, summary, body, date, category_id")
      .eq("visibility", "published")
      .gte("date", postSince)
      .order("date", { ascending: false })
      .order("slug")
      .limit(POST_LIMIT),
    dbAdmin()
      .from("release_candidates")
      .select(
        "id, repo, tag, name, url, published_at, release_topic_candidates(release_topics(id, post_slug, proposal, dropped_reason))",
      )
      .gte("published_at", releaseSince)
      .order("published_at", { ascending: false })
      .limit(RELEASE_LIMIT),
    getCategories(),
    getSite(),
  ]);
  if (posts.error) return NextResponse.json({ error: posts.error.message }, { status: 500 });
  if (releases.error) return NextResponse.json({ error: releases.error.message }, { status: 500 });

  // 주제가 가리키는 글 중 발행된 것만 id 로 바꾼다. 30일 목록 밖의 글일 수 있어 따로 읽는다.
  const topicsOf = releases.data.map((r) => r.release_topic_candidates.map((l) => l.release_topics));
  const slugs = [...new Set(topicsOf.flat().flatMap((t) => (t?.post_slug ? [t.post_slug] : [])))];
  const publishedIds = new Map<string, string>();
  if (slugs.length > 0) {
    const linked = await db().from("posts").select("id, slug").eq("visibility", "published").in("slug", slugs);
    if (linked.error) return NextResponse.json({ error: linked.error.message }, { status: 500 });
    for (const p of linked.data) publishedIds.set(p.slug, p.id);
  }

  return NextResponse.json({
    generatedAt: new Date(now).toISOString(),
    posts: posts.data.map((p) => ({
      id: p.id,
      title: p.title,
      summary: postSummary(p.summary, p.body),
      // sitemap·canonical 과 같은 끝 슬래시 주소.
      url: `${site.url}/posts/${p.slug}/`,
      publishedAt: dateToISO(p.date),
      category: resolveCategoryIn(categories, p.category_id) ? categoryLabelIn(categories, p.category_id) : null,
    })),
    releases: releases.data.map((r, i) => ({
      id: r.id,
      repo: r.repo,
      tag: r.tag,
      name: r.name,
      url: r.url,
      publishedAt: new Date(r.published_at).toISOString(),
      ...releaseLinks(topicsOf[i], publishedIds),
    })),
  });
}
