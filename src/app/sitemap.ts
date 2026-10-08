import type { MetadataRoute } from "next";
import type { PostMeta } from "@/lib/types";
import {
  getAllPosts,
  getPostsByCategory,
  MIN_INDEXED_TAG_POSTS,
} from "@/lib/posts";
import { getCategories } from "@/lib/categories";
import { getAllSeries } from "@/lib/series";
import { getSite } from "@/lib/site-db";

// 글이 늘어도 한 시간 안에는 색인 대상에 들어온다. 발행 즉시 반영이 필요하면
// 쓰기 경로에서 revalidatePath("/sitemap.xml") 를 부르면 된다.
export const revalidate = 3600;

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

  // 글이 없는 카테고리는 noindex 라 뺀다. 서브 카테고리도 글이 있으면 넣는다.
  const categoryIds = categories.flatMap((c) => [
    c.id,
    ...(c.subs?.map((s) => s.id) ?? []),
  ]);
  const categoryRoutes: MetadataRoute.Sitemap = (
    await Promise.all(
      categoryIds.map(async (id) => ({ id, posts: await getPostsByCategory(id) })),
    )
  )
    .filter((c) => c.posts.length > 0)
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
    .filter(([, ps]) => ps.length >= MIN_INDEXED_TAG_POSTS)
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
