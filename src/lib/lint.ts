/**
 * 글 점검 규칙 — `lib/markdown` 의 자체 파서가 실제로 어떻게 읽는지에 맞춰
 * "조용히 깨지는" 표기를 잡아낸다.
 *
 * 이 모듈은 순수 함수뿐이다(next·supabase 의존 없음). DB 를 봐야 아는 것들
 * (링크가 가리키는 글이 실제로 있는지, 이미지가 Storage 에 올라가 있는지)은
 * 호출자가 `LintContext` 로 넣어 준다 — 없으면 그 규칙만 건너뛴다.
 *
 * 오타·문장 품질은 여기서 다루지 않는다. 규칙으로 잡히는 게 아니라서 MCP 쪽
 * 모델이 본문을 읽고 판단하고, 이 모듈은 그 수정이 렌더를 깨뜨리지 않았는지
 * 되받아 확인하는 역할을 맡는다. 예외는 정해진 표현으로 잡히는 글쓰기 습관
 * (상투구, 후속편 도입, lib/phrases)뿐이고 info 로만 알린다.
 */
import BananaSlug from "github-slugger";
import readingTime from "reading-time";
// `node scripts/check-lint-rules.mjs` 가 이 파일을 직접 로드한다 — 번들러를 안
// 거치므로 `@/` alias 가 풀리지 않는다. 이 모듈만 상대 경로 + 확장자로 쓴다.
import { CARD_LINE_RE, cardSlug } from "./link-cards.ts";
import { MAX_PX } from "./image-blocks.ts";
import { lintPhrases } from "./phrases.ts";

export type Severity = "error" | "warning" | "info";

export interface Issue {
  rule: string;
  severity: Severity;
  message: string;
  /** 본문 기준 1-based 줄 번호. 메타데이터 규칙에는 없다. */
  line?: number;
}

export interface LintablePost {
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
}

export interface LintContext {
  /** draft 포함 전체 글 slug. 없으면 내부 링크 검사를 건너뛴다. */
  slugs?: Set<string>;
  categoryIds?: Set<string>;
  seriesIds?: Set<string>;
  tags?: Set<string>;
  /** Storage 에 실제로 있는 이미지 경로(`/posts/{slug}/{file}`). */
  images?: Set<string>;
  /** YYYY-MM-DD. 미래 날짜 판정 기준. */
  today?: string;
}

export interface PostStats {
  chars: number;
  words: number;
  h2: number;
  h3: number;
  codeBlocks: number;
  images: number;
  links: number;
  tables: number;
  readTime: number;
}

/** 파서가 지원하는 callout 종류. 이 밖의 이름은 제목 자리에 그대로 찍힌다. */
const CALLOUT_KINDS = new Set(["INFO", "WARNING", "TIP", "NOTE"]);

/** 글 본문에서 링크로 걸 수 있는 정적 경로. */
const STATIC_ROUTES = new Set([
  "/",
  "/about",
  "/bookmarks",
  "/search",
  "/series",
  "/tags",
  "/posts",
]);

const IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)(?:\{([A-Za-z0-9]+)\})?/g;
const LINK_RE = /(!?)\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g;
/**
 * 그림 블록에 붙일 수 있는 옵션 — 이름 폭 3종, 임의 px, 묶음 열 수 1~4.
 * 1~4 는 열 수라 px 으로 읽히지 않지만 표기 자체는 유효하다.
 */
function isImageOption(opt: string): boolean {
  if (opt === "xs" || opt === "sm" || opt === "wide") return true;
  const n = Number(opt);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PX;
}

interface ScannedLine {
  /** 1-based */
  n: number;
  text: string;
  /** 코드 펜스 안(펜스 줄 자체 포함) — 문법 규칙을 적용하지 않는다. */
  fenced: boolean;
}

interface Scan {
  lines: ScannedLine[];
  /** 닫히지 않은 펜스가 열린 줄 번호. 없으면 null. */
  unclosedFence: number | null;
  fenceCount: number;
  /** 표로 인식되는 줄 번호 집합 (헤더·구분·본문행 전부). */
  tableLines: Set<number>;
  tableCount: number;
}

/** `lib/markdown` 의 isTableStart 와 같은 판정. */
function isTableStart(raw: string[], i: number): boolean {
  const next = raw[i + 1];
  return (
    raw[i].trim().startsWith("|") &&
    next !== undefined &&
    /^[\s|:-]+$/.test(next) &&
    next.includes("|") &&
    next.includes("-")
  );
}

/**
 * 본문을 파서와 같은 방식으로 훑는다 — 펜스 상태를 먼저 확정해야 코드 안의
 * `<div>` 나 `#제목` 을 오탐하지 않는다.
 */
function scan(body: string): Scan {
  const raw = body.split("\n");
  const lines: ScannedLine[] = [];
  let inFence = false;
  let openedAt: number | null = null;
  let fenceCount = 0;

  for (let i = 0; i < raw.length; i++) {
    const text = raw[i];
    const isFenceMarker = text.startsWith("```");
    if (isFenceMarker) {
      if (inFence) {
        inFence = false;
        openedAt = null;
      } else {
        inFence = true;
        openedAt = i + 1;
        fenceCount++;
      }
      lines.push({ n: i + 1, text, fenced: true });
      continue;
    }
    lines.push({ n: i + 1, text, fenced: inFence });
  }

  // 표 영역 — 펜스 밖에서만 찾는다.
  const tableLines = new Set<number>();
  let tableCount = 0;
  for (let i = 0; i < raw.length; i++) {
    if (lines[i].fenced || !isTableStart(raw, i)) continue;
    tableCount++;
    tableLines.add(i + 1);
    tableLines.add(i + 2);
    let j = i + 2;
    while (j < raw.length && raw[j].trim().startsWith("|")) {
      tableLines.add(j + 1);
      j++;
    }
    i = j - 1;
  }

  return {
    lines,
    unclosedFence: inFence ? openedAt : null,
    fenceCount,
    tableLines,
    tableCount,
  };
}

/** 인라인 코드는 규칙 대상에서 뺀다 — `` `<T>` `` 같은 걸 태그로 보면 안 된다. */
function stripInlineCode(text: string): string {
  return text.replace(/`[^`]*`/g, "");
}

/** `renderMarkdown` 과 같은 순서로 H1–H4 앵커 id 를 만든다. */
function headingIds(lines: ScannedLine[]): Set<string> {
  const slugger = new BananaSlug();
  const ids = new Set<string>();
  for (const { text, fenced } of lines) {
    if (fenced) continue;
    const m = text.match(/^(#{1,4})\s+(.+)$/);
    if (!m) continue;
    ids.add(slugger.slug(m[2].trim()));
  }
  return ids;
}

/** 사이트가 보여주는 값과 같아야 하므로 `lib/posts` 의 계산을 그대로 쓴다. */
function estimateReadTime(body: string): number {
  return Math.max(1, Math.round(readingTime(body).minutes));
}

function bodyStats(post: LintablePost, s: Scan): PostStats {
  let h2 = 0;
  let h3 = 0;
  let images = 0;
  let links = 0;

  for (const { text, fenced } of s.lines) {
    if (fenced) continue;
    const h = text.match(/^(#{1,4})\s+/);
    if (h) {
      if (h[1].length === 2) h2++;
      if (h[1].length === 3) h3++;
    }
    for (const m of stripInlineCode(text).matchAll(LINK_RE)) {
      if (m[1] === "!") images++;
      else links++;
    }
  }

  const chars = post.body.length;
  return {
    chars,
    words: post.body.trim() ? post.body.trim().split(/\s+/).length : 0,
    h2,
    h3,
    codeBlocks: s.fenceCount,
    images,
    links,
    tables: s.tableCount,
    readTime: estimateReadTime(post.body),
  };
}

/** 본문 문법 — 파서가 조용히 텍스트로 떨어뜨리는 표기들. */
function lintSyntax(s: Scan, out: Issue[]): void {
  if (s.unclosedFence !== null) {
    out.push({
      rule: "unclosed-fence",
      severity: "error",
      line: s.unclosedFence,
      message:
        "코드 펜스가 닫히지 않아 이 줄부터 글 끝까지 전부 코드 블록으로 렌더됩니다. " +
        "여는 펜스를 안 닫았거나, 위쪽 어딘가에서 여는 펜스가 빠져 이 줄(닫는 펜스)이 여는 펜스로 읽히는 경우입니다.",
    });
  }

  let prevWasQuote = false;

  for (const { n, text, fenced } of s.lines) {
    if (fenced) {
      prevWasQuote = false;
      continue;
    }

    // callout — 블록의 첫 줄만 종류를 판정한다.
    if (text.startsWith(">")) {
      if (!prevWasQuote) {
        const first = text.replace(/^>\s?/, "");
        const kind = first.match(/^\[!\s*([A-Za-z]+)\s*\]/);
        if (kind && !CALLOUT_KINDS.has(kind[1].toUpperCase())) {
          out.push({
            rule: "unknown-callout",
            severity: "error",
            line: n,
            message: `[!${kind[1]}] 는 지원하지 않는 callout 종류입니다. INFO/WARNING/TIP/NOTE 중 하나여야 하며, 지금은 대괄호 표기가 본문에 그대로 출력됩니다.`,
          });
        } else if (!kind) {
          out.push({
            rule: "plain-blockquote",
            severity: "warning",
            line: n,
            message:
              "`>` 는 callout 전용입니다. 이 줄은 제목 없는 INFO 박스로 렌더됩니다 — 인용이 목적이면 일반 단락으로 쓰세요.",
          });
        }
      }
      prevWasQuote = true;
      continue;
    }
    prevWasQuote = false;

    if (/^[ \t]+(?:[-*+]|\d+\.)[ \t]+/.test(text)) {
      out.push({
        rule: "nested-list",
        severity: "error",
        line: n,
        message:
          "들여쓴 리스트는 파서가 리스트로 보지 않아 단락으로 떨어집니다. 한 단계로 펴거나 H3 로 나누세요. (번호 리스트의 하위 불릿만 예외 — 들여쓰기 없이 `- ` 로 씁니다)",
      });
    }

    if (/^#{1,6}[^#\s]/.test(text)) {
      out.push({
        rule: "heading-no-space",
        severity: "warning",
        line: n,
        message: "`#` 뒤에 공백이 없어 헤더가 아니라 단락으로 렌더됩니다.",
      });
    }

    if (/^#{5,}\s/.test(text)) {
      out.push({
        rule: "heading-too-deep",
        severity: "warning",
        line: n,
        message: "파서는 H1–H4 만 처리합니다. H5 이상은 단락이 됩니다.",
      });
    }

    if (/^-\s+\[[ xX]\]\s/.test(text)) {
      out.push({
        rule: "task-list",
        severity: "warning",
        line: n,
        message:
          "체크박스는 지원하지 않습니다. `[x]` 가 글자 그대로 나옵니다 — 일반 `- ` 항목으로 쓰세요.",
      });
    }

    if (text.trim().startsWith("|") && !s.tableLines.has(n)) {
      out.push({
        rule: "broken-table",
        severity: "warning",
        line: n,
        message:
          "표로 인식되지 않습니다. 헤더 바로 다음 줄에 `|---|---|` 구분행이 있어야 합니다.",
      });
    }

    const bare = stripInlineCode(text);

    const tag = bare.match(/<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>/);
    if (tag) {
      out.push({
        rule: "html-tag",
        severity: "error",
        line: n,
        message: `${tag[0]} 같은 태그는 렌더되지 않고 글자 그대로 나옵니다. callout 은 \`> [!INFO]\`, 줄바꿈은 그냥 줄을 바꾸면 됩니다.`,
      });
    }

    if (/~~[^~]+~~/.test(bare)) {
      out.push({
        rule: "strikethrough",
        severity: "warning",
        line: n,
        message: "취소선은 지원하지 않습니다. `~~` 가 그대로 출력됩니다.",
      });
    }

  }
}

/** 이미지·링크가 실제로 가리키는 대상이 있는지. */
function lintReferences(s: Scan, ctx: LintContext, out: Issue[]): void {
  const anchors = headingIds(s.lines);

  for (const { n, text, fenced } of s.lines) {
    if (fenced) continue;

    // 카드 줄 — `/posts/slug` 가 없는 글이면 본문에 점선 박스가 남는다.
    const line = text.trim();
    if (CARD_LINE_RE.test(line)) {
      const slug = cardSlug(line);
      if (slug && ctx.slugs && !ctx.slugs.has(slug)) {
        out.push({
          rule: "missing-post-ref",
          severity: "error",
          line: n,
          message: `없는 글을 카드로 걸었습니다: /posts/${slug}. 본문에 "찾을 수 없는 글" 점선 박스가 그대로 나갑니다.`,
        });
      }
      continue;
    }

    const bare = stripInlineCode(text);

    for (const m of bare.matchAll(IMAGE_RE)) {
      const rawAlt = m[1];
      const src = m[2];

      const opt = m[3];
      if (opt !== undefined && !isImageOption(opt.toLowerCase())) {
        out.push({
          rule: "image-option",
          severity: "warning",
          line: n,
          message: `알 수 없는 이미지 옵션이라 무시됩니다: {${opt}}. 폭은 \`{xs}\` · \`{sm}\` · \`{wide}\` 또는 \`{240}\` 같은 px, 열 수는 \`{2}\`~\`{4}\` 입니다.`,
        });
      }

      // 옛 문법(`![alt|480]`)은 이제 폭이 아니라 캡션 글자로 새어 나온다.
      if (/\|\d+%?$/.test(rawAlt)) {
        out.push({
          rule: "image-width-legacy",
          severity: "warning",
          line: n,
          message: `옛 너비 표기입니다. \`|${rawAlt.split("|").pop()}\` 가 캡션에 그대로 찍힙니다 — \`![alt](url){sm}\` / \`{240}\` 로 바꾸세요.`,
        });
      }

      if (/^https?:\/\//.test(src)) continue;

      if (!src.startsWith("/")) {
        out.push({
          rule: "image-path",
          severity: "error",
          line: n,
          message: `이미지 경로는 \`/\` 로 시작해야 합니다: ${src}`,
        });
        continue;
      }

      if (!src.startsWith("/posts/")) {
        out.push({
          rule: "image-path",
          severity: "warning",
          line: n,
          message: `글 이미지는 \`/posts/<slug>/<파일>\` 규약을 씁니다: ${src}`,
        });
        continue;
      }

      if (ctx.images && !ctx.images.has(src)) {
        out.push({
          rule: "missing-image",
          severity: "error",
          line: n,
          message: `Storage(post-images)에 없는 이미지입니다: ${src}`,
        });
      }
    }

    for (const m of bare.matchAll(LINK_RE)) {
      if (m[1] === "!") continue;
      const href = m[3];

      if (href.startsWith("#")) {
        const id = decodeURIComponent(href.slice(1));
        if (id && !anchors.has(id)) {
          out.push({
            rule: "dead-anchor",
            severity: "warning",
            line: n,
            message: `이 글에 \`#${id}\` 앵커가 없습니다. 헤더 텍스트에서 만들어지는 id 를 확인하세요.`,
          });
        }
        continue;
      }

      if (!href.startsWith("/")) continue;

      const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
      const seg = path.split("/").filter(Boolean);

      const missing = (kind: string) =>
        out.push({
          rule: "broken-link",
          severity: "error",
          line: n,
          message: `존재하지 않는 ${kind} 를 가리킵니다: ${href}`,
        });

      if (seg[0] === "posts" && seg[1]) {
        if (ctx.slugs && !ctx.slugs.has(seg[1])) missing("글");
      } else if (seg[0] === "category" && seg[1]) {
        if (ctx.categoryIds && !ctx.categoryIds.has(seg[1])) missing("카테고리");
      } else if (seg[0] === "series" && seg[1]) {
        if (ctx.seriesIds && !ctx.seriesIds.has(seg[1])) missing("시리즈");
      } else if (seg[0] === "tags" && seg[1]) {
        if (ctx.tags && !ctx.tags.has(decodeURIComponent(seg[1]))) missing("태그");
      } else if (!STATIC_ROUTES.has(path)) {
        out.push({
          rule: "broken-link",
          severity: "warning",
          line: n,
          message: `사이트에 없는 경로일 수 있습니다: ${href}`,
        });
      }
    }
  }
}

/** frontmatter 성격의 필드 정합. */
function lintMeta(
  post: LintablePost,
  stats: PostStats,
  ctx: LintContext,
  out: Issue[],
): void {
  const published = post.visibility === "published";

  if (!post.summary.trim()) {
    out.push({
      rule: "missing-summary",
      severity: published ? "error" : "warning",
      message: "요약이 비어 있습니다. 목록 카드와 OG 설명에 그대로 쓰입니다.",
    });
  } else if (post.summary.length > 150) {
    out.push({
      rule: "long-summary",
      severity: "info",
      message: `요약이 ${post.summary.length}자입니다. 카드에서 잘릴 수 있습니다.`,
    });
  }

  if (post.series && post.seriesOrder === null) {
    out.push({
      rule: "series-order-missing",
      severity: "warning",
      message: `시리즈 '${post.series}' 에 속하는데 seriesOrder 가 없어 목록 끝으로 밀립니다.`,
    });
  }

  if (!post.series && post.seriesOrder !== null) {
    out.push({
      rule: "orphan-series-order",
      severity: "info",
      message: "series 없이 seriesOrder 만 있습니다. 아무 데도 쓰이지 않습니다.",
    });
  }

  if (post.tags.length === 0) {
    out.push({
      rule: "no-tags",
      severity: "info",
      message: "태그가 없어 태그 목록에서 찾을 수 없습니다.",
    });
  }

  if (ctx.categoryIds && !ctx.categoryIds.has(post.category)) {
    out.push({
      rule: "unknown-category",
      severity: "error",
      message: `categories 에 없는 id 입니다: ${post.category}`,
    });
  }

  if (post.series && ctx.seriesIds && !ctx.seriesIds.has(post.series)) {
    out.push({
      rule: "unknown-series",
      severity: "error",
      message: `series 에 없는 id 입니다: ${post.series}`,
    });
  }

  if (published && ctx.today && post.date > ctx.today) {
    out.push({
      rule: "future-date",
      severity: "info",
      message: `발행일(${post.date})이 미래입니다. 목록 맨 위에 고정됩니다.`,
    });
  }

  if (published && stats.chars < 200) {
    out.push({
      rule: "thin-body",
      severity: "warning",
      message: `본문이 ${stats.chars}자뿐입니다. 발행 상태인지 확인하세요.`,
    });
  }

  if (stats.h2 + stats.h3 < 2) {
    out.push({
      rule: "no-toc",
      severity: "info",
      message: "H2/H3 가 2개 미만이라 목차 사이드바가 나오지 않습니다.",
    });
  }
}

export interface PostLint {
  slug: string;
  title: string;
  visibility: string;
  issues: Issue[];
  stats: PostStats;
}

/** 글 한 편 점검. */
export function lintPost(post: LintablePost, ctx: LintContext = {}): PostLint {
  const s = scan(post.body);
  const stats = bodyStats(post, s);
  const issues: Issue[] = [];

  lintSyntax(s, issues);
  lintReferences(s, ctx, issues);
  lintMeta(post, stats, ctx, issues);
  issues.push(...lintPhrases(post.body, "info"));

  issues.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  return {
    slug: post.slug,
    title: post.title,
    visibility: post.visibility,
    issues,
    stats,
  };
}

export interface CollectionIssue extends Issue {
  slug: string;
}

/**
 * 글 사이의 정합 — 한 편만 봐서는 알 수 없는 것들.
 * (featured 중복, 시리즈 순서 충돌·빈 자리)
 */
export function lintCollection(posts: LintablePost[]): CollectionIssue[] {
  const out: CollectionIssue[] = [];

  const featured = posts.filter((p) => p.featured && p.visibility === "published");
  if (featured.length > 1) {
    for (const p of featured) {
      out.push({
        slug: p.slug,
        rule: "multiple-featured",
        severity: "warning",
        message: `featured 글이 ${featured.length}편입니다(${featured
          .map((f) => f.slug)
          .join(", ")}). 홈에는 한 편만 나옵니다.`,
      });
    }
  }

  const bySeries = new Map<string, LintablePost[]>();
  for (const p of posts) {
    if (!p.series) continue;
    const list = bySeries.get(p.series) ?? [];
    list.push(p);
    bySeries.set(p.series, list);
  }

  for (const [series, list] of bySeries) {
    const seen = new Map<number, string[]>();
    for (const p of list) {
      if (p.seriesOrder === null) continue;
      const slugs = seen.get(p.seriesOrder) ?? [];
      slugs.push(p.slug);
      seen.set(p.seriesOrder, slugs);
    }

    for (const [order, slugs] of seen) {
      if (slugs.length > 1) {
        for (const slug of slugs) {
          out.push({
            slug,
            rule: "series-order-duplicate",
            severity: "warning",
            message: `시리즈 '${series}' 의 ${order}번이 ${slugs.join(", ")} 로 겹칩니다.`,
          });
        }
      }
    }

    const orders = [...seen.keys()].sort((a, b) => a - b);
    const gaps = orders.length
      ? Array.from({ length: orders[orders.length - 1] }, (_, i) => i + 1).filter(
          (n) => !seen.has(n),
        )
      : [];
    if (gaps.length) {
      out.push({
        slug: list[0].slug,
        rule: "series-order-gap",
        severity: "info",
        message: `시리즈 '${series}' 의 순서 ${gaps.join(", ")} 번이 비어 있습니다.`,
      });
    }
  }

  return out;
}

export function countBySeverity(issues: Issue[]): Record<Severity, number> {
  return {
    error: issues.filter((i) => i.severity === "error").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };
}
