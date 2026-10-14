import type { MetadataRoute } from "next";
import type { PostMeta } from "@/lib/types";
import {
  getAllPosts,
  getPostsByCategory,
  MIN_INDEXED_LIST_POSTS,
} from "@/lib/posts";
import { getCategories } from "@/lib/categories";
import { getAllSeries } from "@/lib/series";
import { getSite } from "@/lib/site-db";

// 요청마다 만든다. revalidate = 3600 이던 때는 글 저장 경로의
// revalidatePath("/", "layout") 가 route handler 인 sitemap 에 닿지 않았고,
// 한 시간마다 재생성해도 fetch 데이터 캐시를 다시 써서 발행 글이 몇 시간씩 빠졌다.
// 구글이 sitemap 을 받는 건 하루 몇 번이라 매번 조회해도 부담이 없다.
export const dynamic = "force-dynamic";

/**
 * 목록 페이지의 lastmod 는 그 목록에 든 글 중 가장 최근 수정 시각이다.
 * 요청 시각을 넣으면 매번 바뀌어서 구글이 lastmod 를 아예 믿지 않게 된다.
 */
function latest(posts: PostMeta[]): Date | undefined {
  const ts = posts.map((p) => Date.parse(p.updated ?? p.date));
  return ts.length ? new Date(Math.max(...ts)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, series, site] = await Promise.all([
    getAllPosts(),
    getCategories(),
    getAllSeries(),
    getSite(),
  ]);
  const SITE_URL = site.url;
  const all = latest(posts);
  // trailingSlash: true 라 slash 없는 주소는 308 로 튄다. canonical 과 같은
  // 형태로 내보내야 크롤러가 리다이렉트를 한 번 덜 탄다.
  // /search 는 검색 결과 화면이라 noindex 다 — sitemap 에도 넣지 않는다.
  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/posts/",
    "/series/",
    "/bookmarks/",
    "/about/",
  ].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: all,
    changeFrequency: p === "/" ? "weekly" : "monthly",
    priority: p === "/" ? 1 : 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/posts/${p.slug}/`,
    lastModified: new Date(p.updated ?? p.date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // 글이 한 편 이하인 카테고리는 noindex 라 뺀다. 서브 카테고리도 같은 기준이다.
  const categoryIds = categories.flatMap((c) => [
    c.id,
    ...(c.subs?.map((s) => s.id) ?? []),
  ]);
  const categoryRoutes: MetadataRoute.Sitemap = (
    await Promise.all(
      categoryIds.map(async (id) => ({ id, posts: await getPostsByCategory(id) })),
    )
  )
    .filter((c) => c.posts.length >= MIN_INDEXED_LIST_POSTS)
    .map((c) => ({
      url: `${SITE_URL}/category/${c.id}/`,
      lastModified: latest(c.posts),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  // 글이 한 편뿐인 태그는 그 글과 내용이 겹치는 얇은 페이지라 noindex 다.
  const byTag = new Map<string, PostMeta[]>();
  for (const p of posts)
    for (const t of p.tags) byTag.set(t, [...(byTag.get(t) ?? []), p]);
  const tagRoutes: MetadataRoute.Sitemap = [...byTag]
    .filter(([, ps]) => ps.length >= MIN_INDEXED_LIST_POSTS)
    .map(([tag, ps]) => ({
      url: `${SITE_URL}/tags/${encodeURIComponent(tag)}/`,
      lastModified: latest(ps),
      changeFrequency: "weekly",
      priority: 0.5,
    }));

  const seriesRoutes: MetadataRoute.Sitemap = series
    .map((s) => ({ id: s.id, posts: posts.filter((p) => p.series === s.id) }))
    .filter((s) => s.posts.length > 0)
    .map((s) => ({
      url: `${SITE_URL}/series/${s.id}/`,
      lastModified: latest(s.posts),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [
    ...staticRoutes,
    ...postRoutes,
    ...categoryRoutes,
    ...tagRoutes,
    ...seriesRoutes,
  ];
}
