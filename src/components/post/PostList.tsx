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
import { resolveCategory } from "@/lib/categories";
import type { PostMeta } from "@/lib/types";
import {
  CategorySidebar,
  type SidebarFilter,
} from "@/components/post/CategorySidebar";
import { PostCard } from "@/components/post/PostCard";

interface Props {
  filter?: SidebarFilter;
}

export async function PostList({ filter }: Props) {
  const filtered = !filter
    ? await getAllPosts()
    : filter.type === "category"
      ? await getPostsByCategory(filter.value)
      : await getPostsByTag(filter.value);

  const byYear: Record<string, PostMeta[]> = {};
  filtered.forEach((p) => {
    const y = p.date.slice(0, 4);
    (byYear[y] = byYear[y] || []).push(p);
  });
  const years = Object.keys(byYear).sort().reverse();

  let eyebrow: string, title: string, sub: string;
  if (filter?.type === "category") {
    const r = await resolveCategory(filter.value);
    eyebrow = r?.sub ? `CATEGORY · ${r.parent.name.toUpperCase()}` : "CATEGORY";
    title = r?.sub?.name ?? r?.parent.name ?? filter.value;
    const desc = r?.sub ? r.parent.desc : (r?.parent.desc ?? "");
    sub = `${desc} · ${filtered.length}편`;
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
    <main className="mx-auto max-w-[1180px] px-[var(--gut)] pt-10 md:pt-16">
      {/* ≤1000px 에선 사이드바가 사라지지 않고 가로 스크롤 스트립으로 접힌다. */}
      <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-12 max-[1000px]:grid-cols-1 max-[1000px]:gap-[26px]">
        <div className="min-w-0">
          <CategorySidebar filter={filter} />
        </div>
        <div>
          <header className="mb-7 border-b border-border-token pb-6">
            <div className="mb-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
              {eyebrow}
            </div>
            <h1 className="m-0 font-sans text-[clamp(29px,7vw,40px)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">
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
                {/* 사이드바가 붙는 구간에선 뷰포트 브레이크포인트가 안 맞는다 — 실제 남은 폭 기준으로 접는다. */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
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
