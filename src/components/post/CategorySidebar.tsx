/**
 * CategorySidebar — collapsible category tree + tag cloud.
 * Server component: reads posts/tags directly from the (server-only) loader.
 * Active state is decided server-side via the `filter` prop.
 */
import Link from "next/link";
import { getCategoriesWithCounts } from "@/lib/category-stats";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { TagChip } from "@/components/post/TagChip";

export interface SidebarFilter {
  type: "category" | "tag";
  value: string;
}

interface Props {
  filter?: SidebarFilter;
}

export function CategorySidebar({ filter }: Props) {
  const isAll = !filter;
  const activeCatId = filter?.type === "category" ? filter.value : null;
  const activeTag = filter?.type === "tag" ? filter.value : null;
  const totalPosts = getAllPosts().length;
  const allTags = getAllTags();
  const categories = getCategoriesWithCounts();

  return (
    <nav className="sticky top-[90px] self-start">
      <div className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        Categories
      </div>

      <ul className="m-0 flex list-none flex-col gap-px p-0">
        <li>
          <Link
            href="/posts"
            className={`flex items-center justify-between rounded-md px-2.5 py-1.5 font-sans text-[13.5px] tracking-[-0.01em] no-underline ${
              isAll ? "bg-hover font-semibold text-ink" : "font-medium text-ink-soft"
            }`}
          >
            <span>전체</span>
            <span className="text-xs tabular-nums text-ink-muted">
              {totalPosts}
            </span>
          </Link>
        </li>

        {categories.map((cat) => {
          const activeSubId =
            cat.subs?.find((s) => s.id === activeCatId)?.id ?? null;
          const isActive = activeCatId === cat.id;
          const isExpanded = isActive || activeSubId !== null;
          return (
            <li key={cat.id}>
              <Link
                href={`/category/${cat.id}`}
                className={`flex items-center justify-between rounded-md px-2.5 py-1.5 font-sans text-[13.5px] tracking-[-0.01em] no-underline ${
                  isActive
                    ? "bg-hover font-semibold text-ink"
                    : "font-medium text-ink-soft"
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-xs tabular-nums text-ink-muted">
                  {cat.count ?? 0}
                </span>
              </Link>

              {isExpanded && cat.subs && (
                <ul className="m-0 mb-1.5 mt-0.5 list-none p-0">
                  {cat.subs.map((sub) => {
                    const isSubActive = activeSubId === sub.id;
                    return (
                      <li key={sub.id}>
                        <Link
                          href={`/category/${sub.id}`}
                          className={`flex items-center justify-between rounded-md py-1 pl-6 pr-2.5 font-sans text-[12.5px] tracking-[-0.005em] no-underline ${
                            isSubActive
                              ? "bg-hover font-semibold text-ink"
                              : "font-normal text-ink-muted hover:text-ink"
                          }`}
                        >
                          <span>{sub.name}</span>
                          <span className="text-[11.5px] tabular-nums text-ink-subtle">
                            {sub.count ?? 0}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 border-t border-border-token pt-4">
        <div className="mb-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Tags
        </div>
        <div className="flex flex-wrap gap-[5px]">
          {allTags.slice(0, 14).map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              size="sm"
              filled={activeTag === tag}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
