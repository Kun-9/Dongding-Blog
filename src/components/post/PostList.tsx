/**
 * PostList — shared layout for /posts, /category/[id], /tags/[tag].
 * Server component that resolves the filter via lib/posts and renders
 * the year-grouped grid alongside CategorySidebar.
 *
 * Port of project/page-list.jsx#PostListPage.
 */
import {
  getAllPosts,
  getPostsByCategory,
  getPostsByTag,
} from "@/lib/posts";
import { getCategory } from "@/lib/categories";
import type { PostMeta } from "@/lib/types";
import {
  CategorySidebar,
  type SidebarFilter,
} from "@/components/post/CategorySidebar";
import { PostCard } from "@/components/post/PostCard";

interface Props {
  filter?: SidebarFilter;
}

export function PostList({ filter }: Props) {
  const filtered = !filter
    ? getAllPosts()
    : filter.type === "category"
      ? getPostsByCategory(filter.value)
      : getPostsByTag(filter.value);

  const byYear: Record<string, PostMeta[]> = {};
  filtered.forEach((p) => {
    const y = p.date.slice(0, 4);
    (byYear[y] = byYear[y] || []).push(p);
  });
  const years = Object.keys(byYear).sort().reverse();

  let eyebrow: string, title: string, sub: string;
  if (filter?.type === "category") {
    const cat = getCategory(filter.value);
    eyebrow = "CATEGORY";
    title = cat?.name ?? filter.value;
    sub = `${cat?.desc ?? ""} · ${filtered.length}편`;
  } else if (filter?.type === "tag") {
    eyebrow = "TAG";
    title = `#${filter.value}`;
    sub = `이 태그가 붙은 글 ${filtered.length}편`;
  } else {
    eyebrow = "ARCHIVE";
    title = "모든 글";
    sub = `전체 ${filtered.length}편의 노트`;
  }

  return (
    <main className="mx-auto max-w-[1180px] px-5 pt-10 md:px-8 md:pt-16">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:gap-12">
        <div className="hidden md:block">
          <CategorySidebar filter={filter} />
        </div>
        <div>
          <header className="mb-7 border-b border-border-token pb-6">
            <div className="mb-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
              {eyebrow}
            </div>
            <h1 className="m-0 font-sans text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">
              {title}
            </h1>
            <p className="mt-2.5 text-[15px] leading-[1.6] text-ink-muted">
              {sub}
            </p>
          </header>

          <div className="pb-8">
            {years.map((y) => (
              <section key={y} className="mb-8">
                <div className="mb-3 font-mono text-[13px] font-semibold tabular-nums tracking-[-0.01em] text-ink-muted">
                  {y}
                </div>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {byYear[y].map((p) => (
                    <PostCard key={p.slug} post={p} layout="card" />
                  ))}
                </div>
              </section>
            ))}
            {filtered.length === 0 && (
              <div className="rounded-xl border border-border-token bg-surface p-8 text-center text-ink-muted">
                해당 조건의 글이 없어요.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
