import type { MetadataRoute } from "next";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { getCategories } from "@/lib/categories";
import { site } from "@/lib/site";

// 글이 늘어도 한 시간 안에는 색인 대상에 들어온다. 발행 즉시 반영이 필요하면
// 쓰기 경로에서 revalidatePath("/sitemap.xml") 를 부르면 된다.
export const revalidate = 3600;

const SITE_URL = site.url;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [posts, categories, tags] = await Promise.all([
    getAllPosts(),
    getCategories(),
    getAllTags(),
  ]);
  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/posts",
    "/series",
    "/bookmarks",
    "/about",
    "/search",
  ].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === "/" ? "weekly" : "monthly",
    priority: p === "/" ? 1 : 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/posts/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${SITE_URL}/tags/${tag}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...postRoutes, ...categoryRoutes, ...tagRoutes];
}
