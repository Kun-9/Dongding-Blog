/**
 * MCP 도구가 쓰는 데이터 계층.
 *
 * 쓰기는 편집 API 가 이미 갖고 있는 코어(`api/posts/_shared` 의 스키마·행 변환·
 * 중복 검사)를 그대로 부른다. MCP 용으로 한 벌 더 짜면 두 경로가 반드시
 * 어긋나므로, 여기서는 "부분 수정을 전체 입력으로 채우는" 병합만 담당한다.
 */
import "server-only";

import { dbAdmin } from "@/lib/supabase";
import { PostBodySchema, toRow, type PostBody } from "@/app/api/posts/_shared";
import {
  lintPost,
  lintCollection,
  countBySeverity,
  type LintablePost,
  type LintContext,
  type PostLint,
} from "@/lib/lint";

const COLUMNS =
  "slug, title, summary, category_id, tags, date, visibility, featured, series_id, series_order, body";

const BUCKET = "post-images";

interface Row {
  slug: string;
  title: string;
  summary: string;
  category_id: string;
  tags: string[];
  date: string;
  visibility: string;
  featured: boolean;
  series_id: string | null;
  series_order: number | null;
  body: string;
}

function toLintable(row: Row): LintablePost {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category_id,
    tags: row.tags,
    date: row.date,
    visibility: row.visibility as LintablePost["visibility"],
    featured: row.featured,
    series: row.series_id,
    seriesOrder: row.series_order,
    body: row.body,
  };
}

/** draft/private 포함 전체. MCP 는 편집자용이라 항상 secret 키로 읽는다. */
export async function loadPosts(): Promise<LintablePost[]> {
  const { data, error } = await dbAdmin()
    .from("posts")
    .select(COLUMNS)
    .order("date", { ascending: false })
    .order("slug");
  if (error) throw new Error(`글 조회 실패: ${error.message}`);
  return ((data ?? []) as unknown as Row[]).map(toLintable);
}

export async function loadPost(slug: string): Promise<LintablePost | null> {
  const { data, error } = await dbAdmin()
    .from("posts")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`글 조회 실패: ${error.message}`);
  return data ? toLintable(data as unknown as Row) : null;
}

export interface Taxonomy {
  categories: { id: string; name: string; parent: string | null }[];
  series: { id: string; title: string; plannedCount: number }[];
}

export async function loadTaxonomy(): Promise<Taxonomy> {
  const db = dbAdmin();
  const [cats, series] = await Promise.all([
    db.from("categories").select("id, name, parent_id").order("sort"),
    db.from("series").select("id, title, planned_count").order("sort"),
  ]);
  if (cats.error) throw new Error(`카테고리 조회 실패: ${cats.error.message}`);
  if (series.error) throw new Error(`시리즈 조회 실패: ${series.error.message}`);

  return {
    categories: (cats.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      parent: c.parent_id,
    })),
    series: (series.data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      plannedCount: s.planned_count,
    })),
  };
}

/**
 * 본문이 참조하는 폴더만 Storage 에서 훑는다. 이미지를 한 장도 안 쓰는 글만
 * 있으면 호출이 아예 나가지 않는다.
 */
async function loadImages(posts: LintablePost[]): Promise<Set<string>> {
  const folders = new Set<string>();
  for (const p of posts) {
    for (const m of p.body.matchAll(/!\[[^\]]*\]\(\/posts\/([^/)\s]+)\//g)) {
      folders.add(m[1]);
    }
  }
  if (folders.size === 0) return new Set();

  const storage = dbAdmin().storage.from(BUCKET);
  const listed = await Promise.all(
    [...folders].map(async (folder) => {
      const { data } = await storage.list(folder, { limit: 1000 });
      return (data ?? []).map((f) => `/posts/${folder}/${f.name}`);
    }),
  );
  return new Set(listed.flat());
}

/** 링크·카테고리·이미지 존재 검사에 필요한 사전 정보를 한 번에 모은다. */
export async function buildContext(
  posts: LintablePost[],
  opts: { images?: boolean } = {},
): Promise<LintContext> {
  const [tax, images] = await Promise.all([
    loadTaxonomy(),
    opts.images === false ? Promise.resolve(undefined) : loadImages(posts),
  ]);

  return {
    slugs: new Set(posts.map((p) => p.slug)),
    categoryIds: new Set(tax.categories.map((c) => c.id)),
    seriesIds: new Set(tax.series.map((s) => s.id)),
    tags: new Set(posts.flatMap((p) => p.tags)),
    images,
    today: new Date().toISOString().slice(0, 10),
  };
}

export interface PostReport extends PostLint {
  counts: Record<"error" | "warning" | "info", number>;
}

function withCounts(lint: PostLint): PostReport {
  return { ...lint, counts: countBySeverity(lint.issues) };
}

/** 교차 검사 결과에서 slug 를 떼어내 글 단위 issue 목록에 합친다. */
function crossIssuesFor(all: LintablePost[], slug: string) {
  return lintCollection(all)
    .filter((i) => i.slug === slug)
    .map((i) => ({ rule: i.rule, severity: i.severity, message: i.message }));
}

/**
 * 글 한 편 점검. `all` 을 넘기면 글 사이 정합(featured 중복, 시리즈 순서)까지
 * 합쳐 준다 — 한 편만 봐서는 알 수 없는 것들이다.
 */
export function reportFor(
  post: LintablePost,
  ctx: LintContext,
  all?: LintablePost[],
): PostReport {
  const lint = lintPost(post, ctx);
  if (all) lint.issues.push(...crossIssuesFor(all, post.slug));
  return withCounts(lint);
}

export function reportAll(
  posts: LintablePost[],
  ctx: LintContext,
): PostReport[] {
  const cross = lintCollection(posts);
  return posts.map((p) => {
    const lint = lintPost(p, ctx);
    lint.issues.push(
      ...cross
        .filter((i) => i.slug === p.slug)
        .map((i) => ({ rule: i.rule, severity: i.severity, message: i.message })),
    );
    return withCounts(lint);
  });
}

/** 부분 수정 입력 → 편집 API 가 기대하는 전체 입력. */
export type PostPatch = Partial<{
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  date: string;
  visibility: "published" | "private" | "draft" | "review";
  featured: boolean;
  series: string | null;
  seriesOrder: number | null;
  body: string;
}>;

export function mergePatch(current: LintablePost, patch: PostPatch): PostBody {
  const series = patch.series !== undefined ? patch.series : current.series;
  const seriesOrder =
    patch.seriesOrder !== undefined ? patch.seriesOrder : current.seriesOrder;

  return PostBodySchema.parse({
    slug: patch.slug ?? current.slug,
    title: patch.title ?? current.title,
    summary: patch.summary ?? current.summary,
    category: patch.category ?? current.category,
    tags: patch.tags ?? current.tags,
    date: patch.date ?? current.date,
    visibility: patch.visibility ?? current.visibility,
    featured: patch.featured ?? current.featured,
    series: series ?? "",
    seriesOrder: seriesOrder ?? undefined,
    body: patch.body ?? current.body,
  });
}

export { toRow };

/**
 * 오타 수정용 치환. 정확히 한 번 나오는 문자열만 바꾼다 — 0번이면 모델이 본
 * 본문이 낡은 것이고, 여러 번이면 어디를 고치려는 건지 알 수 없다. 둘 다
 * 조용히 넘어가면 안 되는 상황이라 에러로 세운다.
 */
export function applyReplacements(
  body: string,
  edits: { old: string; new: string }[],
): string {
  let next = body;
  for (const [i, edit] of edits.entries()) {
    const hits = next.split(edit.old).length - 1;
    if (hits === 0) {
      throw new Error(
        `replacements[${i}]: 본문에서 찾을 수 없습니다 — ${JSON.stringify(edit.old)}`,
      );
    }
    if (hits > 1) {
      throw new Error(
        `replacements[${i}]: ${hits}곳에서 일치합니다. 앞뒤 문맥을 더 붙여 한 곳만 가리키세요 — ${JSON.stringify(edit.old)}`,
      );
    }
    next = next.replace(edit.old, () => edit.new);
  }
  return next;
}
