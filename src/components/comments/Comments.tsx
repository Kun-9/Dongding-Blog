/**
 * Comments wrapper — mounts Giscus when env is configured, otherwise
 * shows the design placeholder.
 */
import { Giscus } from "@/components/comments/Giscus";

const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

export function Comments() {
  if (repo && repoId && category && categoryId) {
    return (
      <Giscus
        repo={repo as `${string}/${string}`}
        repoId={repoId}
        category={category}
        categoryId={categoryId}
      />
    );
  }
  return (
    <div className="rounded-xl border border-border-token bg-surface p-8 text-center text-sm text-ink-muted">
      <div className="mb-1.5 font-mono text-xs">{"<Giscus />"}</div>
      GitHub Discussions 기반 댓글이 이 자리에 들어갑니다.
    </div>
  );
}
