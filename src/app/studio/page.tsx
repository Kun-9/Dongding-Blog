"use client";

/**
 * Studio — write/edit page with split editor + live preview.
 * Wires the dev-only `/api/posts` routes: POST for new drafts, PUT for
 * updates (with optional slug rename), GET to hydrate an existing post via
 * `?slug=`. 접근은 proxy 의 로그인 검사와 편집 API 의 401 로 막는다.
 */
import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { categoryLabelIn, resolveCategoryIn } from "@/lib/category-utils";
import { API } from "@/lib/api-routes";
import {
  CARD_LINE_RE,
  cardSlug,
  extractCardTargets,
  type LinkCardMeta,
  type PostRefMeta,
} from "@/lib/link-cards";
import { normalizeSlug, slugifyTitle } from "@/lib/slug-utils";
import type { Category, Series, Visibility } from "@/lib/types";

type StudioSeriesPost = {
  slug: string;
  title: string;
  seriesOrder?: number;
  visibility: Visibility;
};
type StudioSeries = Series & { posts: StudioSeriesPost[] };
import { renderMarkdown } from "@/lib/markdown";
import type { ImageSize } from "@/components/prose/Figure";
import { safeReadJSON, safeRemove, safeWriteJSON } from "@/lib/storage";
import { CTA } from "@/components/ui/CTA";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ToastBanner, type Toast } from "@/components/ui/ToastBanner";
import { TagChip } from "@/components/post/TagChip";
import { RevisionPanel } from "@/components/studio/RevisionPanel";

const SAMPLE_BODY = `# 들어가며

여기에 본문을 작성해 주세요.

\`\`\`java:Example.java
// 코드 블록 예시
\`\`\`

> [!INFO] 콜아웃 예시
> 본문 내용

## 다음 섹션
`;

type SaveState = "idle" | "typing" | "saving" | "saved" | "error";
type ToolbarAction =
  | "bold"
  | "italic"
  | "code"
  | "para"
  | "codeblock"
  | "callout-info"
  | "callout-warning"
  | "callout-tip"
  | "callout-note"
  | "linkcard"
  | "imagegroup"
  | "divider";

const TOOLBAR_TITLES: Record<ToolbarAction, string> = {
  bold: "굵게",
  italic: "기울임",
  code: "인라인 코드",
  para: "문단 나누기",
  codeblock: "코드 블록",
  "callout-info": "Callout — INFO",
  "callout-warning": "Callout — WARNING",
  "callout-tip": "Callout — TIP",
  "callout-note": "Callout — NOTE",
  linkcard: "링크 카드",
  imagegroup: "이미지 묶음 — 연속 줄이 그리드가 된다",
  divider: "수평선",
};

const IMAGE_MIME_PREFIX = "image/";
const PUBLISH_REDIRECT_MS = 2000;

// 접근 차단은 proxy(로그인 리다이렉트)와 편집 API(401)가 맡는다.
export default function Page() {
  return (
    <Suspense fallback={<EditorFallback message="에디터 로딩 중…" />}>
      <StudioEditor />
    </Suspense>
  );
}

function EditorFallback({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-[1180px] px-[var(--gut)] py-32 text-center text-sm text-ink-muted">
      {message}
    </main>
  );
}

const IMAGE_TOKEN_RE = /!\[([^\]]*)\]\(([^)]+)\)(\{[A-Za-z0-9]+\})?/g;

/** n 번째 이미지 토큰의 폭 옵션을 갈아 끼운다. 빈 값이면 옵션 자체를 지운다. */
function setImageSizeAt(
  body: string,
  imageIndex: number,
  size: ImageSize,
): string {
  let count = 0;
  return body.replace(IMAGE_TOKEN_RE, (full, alt: string, url: string) => {
    if (count++ !== imageIndex) return full;
    return `![${alt}](${url})${size ? `{${size}}` : ""}`;
  });
}

function altFromFilename(filename: string): string {
  return filename
    .replace(/\.[^./\\]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

const DRAFT_STORAGE_PREFIX = "studio:draft:";
const NEW_DRAFT_KEY = "__new__";
const LOCAL_BACKUP_DEBOUNCE_MS = 500;

type LocalDraft = {
  title: string;
  summary: string;
  slug: string;
  category: string;
  tags: string;
  body: string;
  visibility: Visibility;
  series: string;
  seriesOrder: number;
  thumbnail: string;
  savedAt: number;
};
type DraftSnapshot = Omit<LocalDraft, "savedAt">;

/** 이미지 한 장을 글 폴더에 올리고 본문/썸네일이 가리킬 경로를 돌려준다. */
async function uploadImage(
  slug: string,
  file: File,
  name?: string,
): Promise<{ url: string; filename: string }> {
  const fd = new FormData();
  fd.append("file", file);
  if (name) fd.append("name", name);
  const res = await fetch(API.postImages(slug), { method: "POST", body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as { url: string; filename: string };
}

function draftKey(slug: string | null): string {
  return `${DRAFT_STORAGE_PREFIX}${slug ?? NEW_DRAFT_KEY}`;
}

function isLocalDraft(value: unknown): value is LocalDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<LocalDraft>;
  return typeof v.body === "string" && typeof v.savedAt === "number";
}

function readDraft(key: string): LocalDraft | null {
  return safeReadJSON<LocalDraft>(key, isLocalDraft);
}

function writeDraft(key: string, value: LocalDraft): void {
  safeWriteJSON(key, value);
}

function clearDraft(key: string): void {
  safeRemove(key);
}

function snapshotsEqual(a: DraftSnapshot, b: DraftSnapshot): boolean {
  return (
    a.title === b.title &&
    a.summary === b.summary &&
    a.slug === b.slug &&
    a.category === b.category &&
    a.tags === b.tags &&
    a.body === b.body &&
    a.visibility === b.visibility &&
    a.series === b.series &&
    a.seriesOrder === b.seriesOrder &&
    a.thumbnail === b.thumbnail
  );
}

function formatRelative(timestamp: number, now: number): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < 5_000) return "방금";
  if (diff < 60_000) return `${Math.round(diff / 1_000)}초 전`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}분 전`;
  return `${Math.round(diff / 3_600_000)}시간 전`;
}

function useNowTicker(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

type FormState = DraftSnapshot & { slugLocked: boolean; date: string };

type FormAction =
  | { type: "PATCH"; patch: Partial<FormState> }
  | { type: "HYDRATE_NEW"; defaultCategory: string }
  | { type: "HYDRATE_FROM_SERVER"; snapshot: DraftSnapshot; date: string }
  | { type: "HYDRATE_FROM_DRAFT"; draft: LocalDraft };

function newDraftState(defaultCategory: string): FormState {
  return {
    title: "",
    summary: "",
    slug: "",
    slugLocked: true,
    category: defaultCategory,
    tags: "",
    body: SAMPLE_BODY,
    visibility: "draft",
    series: "",
    seriesOrder: 0,
    thumbnail: "",
    date: "",
  };
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "PATCH":
      return { ...state, ...action.patch };
    case "HYDRATE_NEW":
      return newDraftState(action.defaultCategory);
    case "HYDRATE_FROM_SERVER":
      return {
        ...action.snapshot,
        slugLocked: false,
        date: action.date,
      };
    case "HYDRATE_FROM_DRAFT":
      return {
        title: action.draft.title ?? "",
        summary: action.draft.summary ?? "",
        slug: action.draft.slug ?? "",
        slugLocked: false,
        category: action.draft.category ?? "",
        tags: action.draft.tags ?? "",
        body: action.draft.body,
        visibility: action.draft.visibility ?? "draft",
        series: action.draft.series ?? "",
        seriesOrder:
          typeof action.draft.seriesOrder === "number"
            ? action.draft.seriesOrder
            : 0,
        thumbnail: action.draft.thumbnail ?? "",
        date: state.date,
      };
  }
}

const VISIBILITY_OPTIONS = [
  {
    v: "published" as const,
    label: "발행",
    glyph: "●",
    desc: "외부에 공개",
    badgeLabel: "PUBLISHED",
    ctaLabel: "저장",
  },
  {
    v: "private" as const,
    label: "비공개",
    glyph: "◑",
    desc: "URL 알아도 안 보임",
    badgeLabel: "PRIVATE",
    ctaLabel: "비공개로 저장",
  },
  {
    v: "review" as const,
    label: "검토",
    glyph: "◐",
    desc: "다 썼고 검토만 남음",
    badgeLabel: "REVIEW",
    ctaLabel: "검토로 저장",
  },
  {
    v: "draft" as const,
    label: "초안",
    glyph: "○",
    desc: "저장만, 미공개",
    badgeLabel: "DRAFT",
    ctaLabel: "초안 저장",
  },
] as const;

type VisibilityMeta = (typeof VISIBILITY_OPTIONS)[number];

const VISIBILITY_META: Record<Visibility, VisibilityMeta> = Object.fromEntries(
  VISIBILITY_OPTIONS.map((o) => [o.v, o]),
) as Record<Visibility, VisibilityMeta>;

/** 서버가 준 값을 좁힌다. 모르는 값이면 가장 안전한 쪽(초안)으로 떨어뜨린다. */
function asVisibility(v: unknown): Visibility {
  return VISIBILITY_OPTIONS.some((o) => o.v === v) ? (v as Visibility) : "draft";
}

function StudioEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingSlug = searchParams.get("slug");

  const [loading, setLoading] = useState<boolean>(!!editingSlug);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 카테고리는 API 로 뒤늦게 도착하므로 빈 값으로 시작하고, 목록이 오면
  // 아래 effect 가 첫 카테고리를 기본값으로 채운다.
  const [form, dispatch] = useReducer(formReducer, "", newDraftState);
  const {
    title,
    summary,
    slug,
    slugLocked,
    category,
    tags,
    body,
    visibility,
    series,
    seriesOrder,
    thumbnail,
    date,
  } = form;
  const patch = useCallback(
    (p: Partial<FormState>) => dispatch({ type: "PATCH", patch: p }),
    [],
  );

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // 좁은 화면 전용 — 2단이 안 들어가면 편집/미리보기를 탭으로 가른다.
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [localSavedAt, setLocalSavedAt] = useState<number | null>(null);
  const [pendingRecovery, setPendingRecovery] = useState<LocalDraft | null>(
    null,
  );

  const initializedRef = useRef(false);
  const dirtyRef = useRef(false);
  const hydratedSlugRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [seriesList, setSeriesList] = useState<StudioSeries[]>([]);
  const [newSeriesOpen, setNewSeriesOpen] = useState(false);
  // 카테고리 정본이 DB 로 옮겨가 정적 import 가 불가능해졌다 — 시리즈와 같은
  // 방식으로 API 에서 받아온다.
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(API.series)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        if (Array.isArray(data)) setSeriesList(data as StudioSeries[]);
      })
      .catch(() => {
        // 시리즈 목록 로드 실패해도 글 작성 자체는 가능 — 조용히 무시.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(API.categories)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        if (Array.isArray(data)) setCategories(data as Category[]);
      })
      .catch(() => {
        // 카테고리를 못 받으면 select 가 비지만 나머지 편집은 계속 가능하다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 새 글의 기본 카테고리 — 목록이 도착한 뒤 한 번만 채운다.
  useEffect(() => {
    if (!category && categories.length > 0) {
      patch({ category: categories[0].id });
    }
  }, [categories, category, patch]);

  // Load existing post or initialize new draft.
  useEffect(() => {
    let cancelled = false;
    if (editingSlug) {
      // Skip refetch when we hydrated this slug ourselves (e.g. just saved).
      if (hydratedSlugRef.current === editingSlug) return;
      setLoading(true);
      fetch(API.post(editingSlug))
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          const serverVisibility = asVisibility(data.visibility);
          const serverSnapshot: DraftSnapshot = {
            title: data.title ?? "",
            summary: data.summary ?? "",
            slug: data.slug ?? editingSlug,
            // 서버가 카테고리를 안 주는 예외 상황은 기본값 effect 가 메운다.
            category: data.category || "",
            tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
            body: data.body ?? "",
            visibility: serverVisibility,
            series: typeof data.series === "string" ? data.series : "",
            seriesOrder:
              typeof data.seriesOrder === "number" ? data.seriesOrder : 0,
            thumbnail: typeof data.thumbnail === "string" ? data.thumbnail : "",
          };
          dispatch({
            type: "HYDRATE_FROM_SERVER",
            snapshot: serverSnapshot,
            date: data.date ?? "",
          });
          setSaveState("saved");
          initializedRef.current = true;
          hydratedSlugRef.current = editingSlug;
          setLoading(false);

          // Recovery probe — local backup beats server only if it differs.
          const stored = readDraft(draftKey(editingSlug));
          if (stored && !snapshotsEqual(stored, serverSnapshot)) {
            setPendingRecovery(stored);
          } else if (stored) {
            // Identical → drop stale key so it doesn't re-prompt later.
            clearDraft(draftKey(editingSlug));
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setLoadError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        });
    } else {
      // New post — sync form state to the "no editingSlug" snapshot.
      // Effect-driven setState here mirrors a URL change; the alternative
      // would be remounting StudioEditor with a `key` prop. Either is fine.
      /* eslint-disable react-hooks/set-state-in-effect */
      // 카테고리 목록은 아직 안 왔을 수 있다 — 기본값 채우기는 전용 effect 담당.
      dispatch({ type: "HYDRATE_NEW", defaultCategory: "" });
      setSaveState("idle");
      setLocalSavedAt(null);
      initializedRef.current = true;
      /* eslint-enable react-hooks/set-state-in-effect */

      // Recovery probe for new-post slot.
      const stored = readDraft(draftKey(null));
      if (stored) setPendingRecovery(stored);
    }
    return () => {
      cancelled = true;
    };
  }, [editingSlug]);

  const markDirty = useCallback(() => {
    if (!initializedRef.current) return;
    dirtyRef.current = true;
    setSaveState("typing");
  }, []);

  const buildPayload = useCallback(
    () => ({
      slug: slug.trim(),
      title: title.trim() || "(제목 없음)",
      summary: summary.trim() || title.trim() || "(요약 없음)",
      category,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      body,
      visibility,
      ...(date ? { date } : {}),
      ...(series.trim()
        ? {
            series: series.trim(),
            ...(seriesOrder > 0 ? { seriesOrder } : {}),
          }
        : {}),
      // 빈 문자열도 그대로 보낸다 — 서버가 "지움"으로 받는다.
      thumbnail: thumbnail.trim(),
    }),
    [
      body,
      category,
      date,
      visibility,
      slug,
      summary,
      tags,
      title,
      series,
      seriesOrder,
      thumbnail,
    ],
  );

  const persist = useCallback(
    async (payload: ReturnType<typeof buildPayload>): Promise<string> => {
      if (!payload.slug) {
        throw new Error("slug이 비어있습니다");
      }
      const isNew = !editingSlug;
      const url = isNew ? API.posts : API.post(editingSlug);
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const fieldErrors = data?.issues?.fieldErrors as
          | Record<string, string[]>
          | undefined;
        const fieldDetail = fieldErrors
          ? Object.entries(fieldErrors)
              .map(([k, v]) => `${k}: ${v.join(", ")}`)
              .join(" · ")
          : "";
        const detail =
          fieldDetail || data?.error || `HTTP ${res.status}`;
        throw new Error(detail);
      }
      const data = await res.json();
      const canonicalSlug: string = data.slug ?? payload.slug;
      // Sync URL with canonical slug (replace, no history entry).
      if (canonicalSlug !== editingSlug) {
        hydratedSlugRef.current = canonicalSlug; // suppress refetch
        router.replace(`/studio?slug=${encodeURIComponent(canonicalSlug)}`);
      }
      return canonicalSlug;
    },
    [editingSlug, router],
  );

  type SaveResult =
    | { ok: true; slug: string }
    | { ok: false; error: string };

  const save = useCallback(async (): Promise<SaveResult> => {
    setSaveState("saving");
    setSaveError(null);
    const previousKey = draftKey(editingSlug);
    try {
      const canonicalSlug = await persist(buildPayload());
      dirtyRef.current = false;
      setSaveState("saved");
      // Server is authoritative now — drop the local backup. Clear both the
      // pre-save key and the post-rename key so a slug change can't leave
      // an orphan draft behind.
      clearDraft(previousKey);
      const nextKey = draftKey(canonicalSlug);
      if (nextKey !== previousKey) clearDraft(nextKey);
      setLocalSavedAt(null);
      return { ok: true, slug: canonicalSlug };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg);
      setSaveState("error");
      return { ok: false, error: msg };
    }
  }, [buildPayload, persist, editingSlug]);

  // visibility 탭이 진실의 원천. published면 confirm 모달, 아니면 즉시 저장.
  const handleSave = useCallback(async () => {
    if (visibility === "published") {
      setConfirmingPublish(true);
      return;
    }
    const result = await save();
    if (!result.ok) {
      setToast({ kind: "error", message: `저장 실패: ${result.error}` });
    }
  }, [save, visibility]);

  const handleConfirmPublish = useCallback(async () => {
    setConfirmingPublish(false);
    const result = await save();
    if (!result.ok) {
      setToast({ kind: "error", message: `발행 실패: ${result.error}` });
      return;
    }
    const href = `/posts/${encodeURIComponent(result.slug)}`;
    setToast({
      kind: "success",
      message: "발행되었습니다 — 잠시 후 글 페이지로 이동합니다",
      href,
    });
    setTimeout(() => router.push(href), PUBLISH_REDIRECT_MS);
  }, [router, save]);

  /**
   * Cancel = discard local changes. New post → reset to a fresh sample;
   * existing post → refetch the server snapshot and clear the local backup.
   * The dirty guard means clicking 취소 on a clean page is a no-op.
   */
  const isDirty = saveState === "typing" || dirtyRef.current;

  const handleCancelClick = useCallback(() => {
    if (!isDirty) return;
    setConfirmingDiscard(true);
  }, [isDirty]);

  const performDiscard = useCallback(async () => {
    setConfirmingDiscard(false);
    if (!editingSlug) {
      dispatch({
        type: "HYDRATE_NEW",
        defaultCategory: categories[0]?.id ?? "",
      });
      clearDraft(draftKey(null));
      dirtyRef.current = false;
      setSaveState("idle");
      setSaveError(null);
      setLocalSavedAt(null);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(API.post(editingSlug));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const serverVisibility = asVisibility(data.visibility);
      dispatch({
        type: "HYDRATE_FROM_SERVER",
        snapshot: {
          title: data.title ?? "",
          summary: data.summary ?? "",
          slug: data.slug ?? editingSlug,
          category: data.category || (categories[0]?.id ?? ""),
          tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
          body: data.body ?? "",
          visibility: serverVisibility,
          series: typeof data.series === "string" ? data.series : "",
          seriesOrder:
            typeof data.seriesOrder === "number" ? data.seriesOrder : 0,
          thumbnail: typeof data.thumbnail === "string" ? data.thumbnail : "",
        },
        date: data.date ?? "",
      });
      clearDraft(draftKey(editingSlug));
      hydratedSlugRef.current = editingSlug;
      dirtyRef.current = false;
      setSaveState("saved");
      setSaveError(null);
      setLocalSavedAt(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ kind: "error", message: `취소 실패: ${msg}` });
    } finally {
      setLoading(false);
    }
  }, [editingSlug, categories]);

  /**
   * For uploads on a brand-new post we need a real slug folder. Auto-derive
   * a slug if missing, force visibility=draft so the auto-save can never
   * accidentally publish, then POST to /api/posts/. The user's chosen
   * visibility tab is left untouched — they still hit "발행하기" explicitly.
   */
  const ensureSlugSaved = useCallback(async (): Promise<string | null> => {
    if (editingSlug) return editingSlug;
    const titleTrim = title.trim();
    let nextSlug = slug.trim();
    if (!nextSlug) {
      if (!titleTrim) {
        setToast({
          kind: "error",
          message: "제목을 먼저 입력해주세요 — slug 폴더 생성에 필요해요",
        });
        return null;
      }
      nextSlug = slugifyTitle(titleTrim);
      if (!nextSlug) {
        setToast({
          kind: "error",
          message: "제목에서 slug를 만들 수 없어요. slug를 직접 입력해주세요",
        });
        return null;
      }
      patch({ slug: nextSlug });
    }

    setSaveState("saving");
    setSaveError(null);
    try {
      const payload = {
        slug: nextSlug,
        title: titleTrim || "(제목 없음)",
        summary: summary.trim() || titleTrim || "(요약 없음)",
        category,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        body,
        visibility: "draft" as const,
        ...(date ? { date } : {}),
        ...(series.trim()
          ? {
              series: series.trim(),
              ...(seriesOrder > 0 ? { seriesOrder } : {}),
            }
          : {}),
        thumbnail: thumbnail.trim(),
      };
      const canonical = await persist(payload);
      dirtyRef.current = false;
      setSaveState("saved");
      clearDraft(draftKey(null));
      clearDraft(draftKey(canonical));
      setLocalSavedAt(null);
      return canonical;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg);
      setSaveState("error");
      setToast({ kind: "error", message: `초안 저장 실패: ${msg}` });
      return null;
    }
  }, [
    body,
    category,
    date,
    editingSlug,
    patch,
    persist,
    slug,
    summary,
    tags,
    title,
    series,
    seriesOrder,
    thumbnail,
  ]);

  const insertImageMarkdown = useCallback(
    (alt: string, url: string) => {
      const ta = textareaRef.current;
      const token = `![${alt}](${url})`;
      if (!ta) {
        // Fallback — append at end with a leading blank line.
        const sep = body.length === 0 || body.endsWith("\n\n") ? "" : body.endsWith("\n") ? "\n" : "\n\n";
        patch({ body: body + sep + token + "\n" });
        markDirty();
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = body.slice(0, start);
      const after = body.slice(end);
      const needsBlankBefore = before.length > 0 && !before.endsWith("\n\n");
      const needsBlankAfter = after.length > 0 && !after.startsWith("\n\n");
      const prefix = needsBlankBefore
        ? before.endsWith("\n")
          ? "\n"
          : "\n\n"
        : "";
      const suffix = needsBlankAfter
        ? after.startsWith("\n")
          ? "\n"
          : "\n\n"
        : "";
      const next = before + prefix + token + suffix + after;
      patch({ body: next });
      markDirty();
      const cursor = before.length + prefix.length + token.length;
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursor, cursor);
      });
    },
    [body, markDirty, patch],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith(IMAGE_MIME_PREFIX));
      if (images.length === 0) return;

      const targetSlug = await ensureSlugSaved();
      if (!targetSlug) return;

      setUploading(true);
      try {
        for (const file of images) {
          const data = await uploadImage(targetSlug, file);
          insertImageMarkdown(altFromFilename(data.filename), data.url);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setToast({ kind: "error", message: `업로드 실패: ${msg}` });
      } finally {
        setUploading(false);
      }
    },
    [ensureSlugSaved, insertImageMarkdown],
  );

  /** 대표 이미지는 본문에 넣지 않고 thumbnail 필드에만 붙인다. */
  const uploadThumbnail = useCallback(
    async (file: File) => {
      if (!file.type.startsWith(IMAGE_MIME_PREFIX)) return;
      const targetSlug = await ensureSlugSaved();
      if (!targetSlug) return;

      setUploading(true);
      try {
        const data = await uploadImage(targetSlug, file, "thumbnail");
        patch({ thumbnail: data.url });
        markDirty();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setToast({ kind: "error", message: `업로드 실패: ${msg}` });
      } finally {
        setUploading(false);
      }
    },
    [ensureSlugSaved, markDirty, patch],
  );

  const handleFilePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleEditorPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const files = items
        .filter((it) => it.kind === "file" && it.type.startsWith(IMAGE_MIME_PREFIX))
        .map((it) => it.getAsFile())
        .filter((f): f is File => f !== null);
      if (files.length === 0) return;
      e.preventDefault();
      void uploadFiles(files);
    },
    [uploadFiles],
  );

  const handleEditorDrop = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      setDragOver(false);
      void uploadFiles(files);
    },
    [uploadFiles],
  );

  const handleEditorDragOver = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      setDragOver(true);
    },
    [],
  );

  const handleEditorDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handlePreviewImageResize = useCallback(
    (imageIndex: number, size: ImageSize) => {
      patch({ body: setImageSizeAt(body, imageIndex, size) });
      markDirty();
    },
    [body, markDirty, patch],
  );

  const applyRecovery = useCallback(() => {
    if (!pendingRecovery) return;
    dispatch({ type: "HYDRATE_FROM_DRAFT", draft: pendingRecovery });
    dirtyRef.current = true;
    setSaveState("typing");
    setLocalSavedAt(pendingRecovery.savedAt);
    setPendingRecovery(null);
  }, [pendingRecovery]);

  const discardRecovery = useCallback(() => {
    clearDraft(draftKey(editingSlug));
    setLocalSavedAt(null);
    setPendingRecovery(null);
  }, [editingSlug]);

  // Auto-dismiss error toasts after 4s; success toasts stay until redirect.
  useEffect(() => {
    if (!toast || toast.kind !== "error") return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  // Debounced LOCAL backup. Never writes to the server — that would re-publish
  // implicitly. Authoritative writes only happen on explicit 초안 저장 / 발행.
  useEffect(() => {
    if (!initializedRef.current) return;
    if (pendingRecovery) return; // wait for the user's recovery decision
    if (saveState !== "typing") return;
    const key = draftKey(editingSlug);
    const id = setTimeout(() => {
      if (!dirtyRef.current) return;
      const now = Date.now();
      writeDraft(key, {
        title,
        summary,
        slug,
        category,
        tags,
        body,
        visibility,
        series,
        seriesOrder,
        thumbnail,
        savedAt: now,
      });
      setLocalSavedAt(now);
    }, LOCAL_BACKUP_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [
    editingSlug,
    saveState,
    pendingRecovery,
    title,
    summary,
    slug,
    category,
    tags,
    body,
    visibility,
    series,
    seriesOrder,
    thumbnail,
  ]);

  const wordCount = body.replace(/\s+/g, "").length;
  const readTime = Math.max(1, Math.round(wordCount / 500));

  /**
   * 링크 카드 재료. 브라우저는 DB 도 남의 사이트도 못 보므로 서버에 카드 대상만
   * 던져 받아 온다. 타자마다 나가지 않게 대상 목록이 실제로 바뀐 때만.
   */
  const cardKey = useMemo(() => {
    const { urls, slugs } = extractCardTargets(body);
    return [...urls, ...slugs].sort().join("\n");
  }, [body]);
  // 정렬된 키를 한 번 거쳐 목록이 실제로 바뀐 때만 새 객체가 나오게 한다.
  const cardTargets = useMemo(() => {
    const lines = cardKey ? cardKey.split("\n") : [];
    return {
      urls: lines.filter((l) => cardSlug(l) === null),
      slugs: lines.map(cardSlug).filter((s): s is string => s !== null),
    };
  }, [cardKey]);

  const [cardData, setCardData] = useState<{
    links: Record<string, LinkCardMeta>;
    posts: Record<string, PostRefMeta>;
  }>({ links: {}, posts: {} });

  useEffect(() => {
    const { urls, slugs } = cardTargets;
    // 남은 재료는 비우지 않는다 — 조회는 주소·slug 키로 하므로 안 쓰이는 항목이
    // 남아 있어도 엉뚱한 카드가 뜨지 않는다.
    if (urls.length === 0 && slugs.length === 0) return;
    let alive = true;
    const timer = setTimeout(() => {
      fetch(API.linkMeta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, slugs }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive || !d) return;
          setCardData({ links: d.links ?? {}, posts: d.posts ?? {} });
        })
        .catch(() => {});
    }, 700);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [cardTargets]);

  // Studio preview uses editable=true so a block image gets the width picker;
  // the post detail page renders the same Figure through the same parser.
  const renderedBody = useMemo(
    () =>
      renderMarkdown(body, {
        editable: true,
        onImageResize: handlePreviewImageResize,
        links: cardData.links,
        posts: cardData.posts,
      }),
    [body, handlePreviewImageResize, cardData],
  );

  const insertMd = useCallback(
    (action: ToolbarAction) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = body.slice(0, start);
      const sel = body.slice(start, end);
      const after = body.slice(end);

      let nextBody = body;
      let cursorStart = start;
      let cursorEnd = end;

      const wrap = (left: string, right: string, placeholder: string) => {
        const inner = sel || placeholder;
        nextBody = before + left + inner + right + after;
        cursorStart = start + left.length;
        cursorEnd = cursorStart + inner.length;
      };

      const insertBlock = (block: string) => {
        const needsBlankBefore =
          before.length > 0 && !before.endsWith("\n\n");
        const needsBlankAfter = after.length > 0 && !after.startsWith("\n\n");
        const prefix = needsBlankBefore
          ? before.endsWith("\n")
            ? "\n"
            : "\n\n"
          : "";
        const suffix = needsBlankAfter
          ? after.startsWith("\n")
            ? "\n"
            : "\n\n"
          : "";
        nextBody = before + prefix + block + suffix + after;
        cursorStart = before.length + prefix.length;
        cursorEnd = cursorStart + block.length;
      };

      switch (action) {
        case "bold":
          wrap("**", "**", "굵게");
          break;
        case "italic":
          wrap("*", "*", "기울임");
          break;
        case "code":
          wrap("`", "`", "코드");
          break;
        case "para":
          wrap("", "\n\n", "");
          break;
        case "codeblock":
          insertBlock("```java:File.java\n" + (sel || "// code") + "\n```");
          break;
        case "callout-info":
        case "callout-warning":
        case "callout-tip":
        case "callout-note": {
          const kind = action.slice("callout-".length).toUpperCase();
          insertBlock(`> [!${kind}] 제목\n> ` + (sel || "본문 내용"));
          break;
        }
        case "linkcard": {
          // 선택한 텍스트가 카드로 성립하는 주소면 그걸 쓴다.
          const picked = sel.trim();
          insertBlock(
            CARD_LINE_RE.test(picked) ? picked : "https://example.com",
          );
          break;
        }
        case "imagegroup":
          // 빈 줄 없이 붙여 써야 묶음이다. 경로는 업로드로 채운다.
          insertBlock("![첫 번째](/posts/slug/1.png){2}\n![두 번째](/posts/slug/2.png)");
          break;
        case "divider":
          insertBlock("---");
          break;
        default:
          return;
      }

      patch({ body: nextBody });
      markDirty();
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [body, markDirty, patch],
  );

  /**
   * Auto-prefix on Enter inside callouts and lists. Mirrors the behavior of
   * Notion / GitHub markdown editors — pressing Enter on `> ...`, `- ...`,
   * `1. ...` continues the marker on the next line. A blank prefix-only line
   * exits (clears the prefix and breaks out).
   */
  const handleEditorKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
      const ta = e.currentTarget;
      const value = ta.value;
      const pos = ta.selectionStart;
      if (pos !== ta.selectionEnd) return;

      const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
      const line = value.slice(lineStart, pos);

      let prefix: string | null = null;
      let exit = false;

      // Callout header: > [!KIND] title  →  next line gets "> "
      if (/^>\s*\[!\w+\]/i.test(line)) {
        prefix = "> ";
      } else if (line.startsWith(">")) {
        // Plain callout body line. Empty (just `>` / `> `) exits.
        const rest = line.replace(/^>\s?/, "");
        prefix = "> ";
        if (rest.trim() === "") exit = true;
      } else {
        const ol = line.match(/^(\d+)\.\s+(.*)$/);
        const olEmpty = line.match(/^\d+\.\s*$/);
        const ul = line.match(/^-\s+(.*)$/);
        const ulEmpty = /^-\s*$/.test(line);
        if (ol) {
          if (ol[2].trim() === "") {
            exit = true;
            prefix = "1. ";
          } else {
            prefix = `${parseInt(ol[1], 10) + 1}. `;
          }
        } else if (olEmpty) {
          exit = true;
          prefix = "1. ";
        } else if (ul) {
          prefix = "- ";
          if (ul[1].trim() === "") exit = true;
        } else if (ulEmpty) {
          exit = true;
          prefix = "- ";
        }
      }

      if (prefix == null) return;
      e.preventDefault();

      if (exit) {
        const before = value.slice(0, lineStart);
        const after = value.slice(pos);
        const next = before + "\n" + after;
        patch({ body: next });
        markDirty();
        const cursor = lineStart + 1;
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(cursor, cursor);
        });
      } else {
        const before = value.slice(0, pos);
        const after = value.slice(pos);
        const next = before + "\n" + prefix + after;
        patch({ body: next });
        markDirty();
        const cursor = pos + 1 + prefix.length;
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(cursor, cursor);
        });
      }
    },
    [markDirty, patch],
  );

  const now = useNowTicker(localSavedAt !== null);

  if (loadError) {
    return (
      <EditorFallback message={`로딩 실패: ${loadError}`} />
    );
  }
  if (loading) {
    return <EditorFallback message="기존 글 불러오는 중…" />;
  }

  const statusLabel: Record<SaveState, string> = {
    idle: "수정 안 됨",
    typing: "입력 중…",
    saving: "서버 저장 중…",
    saved: editingSlug
      ? `서버 저장됨 · ${wordCount}자 · ${readTime}분`
      : `미저장 · ${wordCount}자 · ${readTime}분`,
    error: `오류: ${saveError ?? "알 수 없음"}`,
  };
  const statusColor: Record<SaveState, string> = {
    idle: "var(--ink-muted)",
    typing: "#c8a86b",
    saving: "#c8a86b",
    saved: "#7da75e",
    error: "#c95c5c",
  };
  const localBackupLabel =
    localSavedAt !== null
      ? `자동백업 ${formatRelative(localSavedAt, now)}`
      : null;

  return (
    <main>
      {/* Studio toolbar */}
      <div
        className="sticky top-[60px] z-40 flex flex-wrap items-center gap-3 border-b border-border-token px-[var(--gut)] py-3"
        style={{ background: "var(--bg)" }}
      >
        <div className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          STUDIO
        </div>
        <div className="h-3.5 w-px bg-border-token" />
        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
          <span
            className="h-1.5 w-1.5 rounded-full transition-colors"
            style={{ background: statusColor[saveState] }}
          />
          {statusLabel[saveState]}
        </div>
        {localBackupLabel && (
          <div
            className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-muted"
            title="입력 내용은 브라우저 로컬에 자동 백업됩니다 (서버 발행과 무관)"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#8a8a8a" }}
            />
            {localBackupLabel}
          </div>
        )}
        {editingSlug && (
          <span
            className="rounded font-mono text-[10.5px] font-bold uppercase tracking-[0.05em]"
            style={{
              padding: "2px 6px",
              background:
                visibility === "published"
                  ? "var(--ink)"
                  : "var(--surface-alt)",
              color:
                visibility === "published"
                  ? "var(--bg)"
                  : "var(--ink-muted)",
            }}
          >
            {VISIBILITY_META[visibility].badgeLabel}
          </span>
        )}
        <div className="flex-1" />
        {editingSlug && (
          <RevisionPanel
            slug={editingSlug}
            // 복원하면 서버 내용이 통째로 바뀐다 — 편집기를 새로 채우는 것보다
            // 새로고침이 확실하다.
            onRestored={() => window.location.reload()}
          />
        )}
        <button
          type="button"
          onClick={handleCancelClick}
          disabled={!isDirty}
          className="cursor-pointer rounded-md border border-border-token bg-transparent px-3 py-[6px] font-sans text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-soft"
          title={isDirty ? "변경사항 폐기" : "변경사항 없음"}
        >
          취소
        </button>
        <CTA
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          {VISIBILITY_META[visibility].ctaLabel}
        </CTA>
      </div>

      <ConfirmDialog
        open={confirmingPublish}
        tone="info"
        title="이 글을 지금 발행할까요?"
        body={
          visibility === "published"
            ? "이미 발행된 글입니다. 변경 사항을 다시 발행하면 즉시 반영돼요."
            : "발행하면 공개 범위가 published로 바뀌고 공개 목록과 sitemap에 노출됩니다."
        }
        meta={
          <>
            <div className="font-sans text-[14px] font-medium text-ink">
              {title || "(제목 없음)"}
            </div>
            <div className="mt-1">/posts/{slug || "—"}</div>
          </>
        }
        confirmLabel="저장"
        cancelLabel="취소"
        onConfirm={() => void handleConfirmPublish()}
        onCancel={() => setConfirmingPublish(false)}
      />

      <ConfirmDialog
        open={confirmingDiscard}
        tone="danger"
        title="변경사항을 폐기할까요?"
        body={
          editingSlug
            ? "마지막으로 서버에 저장된 상태로 되돌리고, 로컬 자동백업도 함께 삭제됩니다."
            : "지금까지 작성한 내용을 모두 버리고 빈 화면으로 되돌립니다. 로컬 자동백업도 함께 삭제됩니다."
        }
        meta={
          <>
            <div className="font-sans text-[14px] font-medium text-ink">
              {title || "(제목 없음)"}
            </div>
            <div className="mt-1">/posts/{slug || "—"}</div>
          </>
        }
        confirmLabel="폐기하기"
        cancelLabel="계속 편집"
        onConfirm={() => void performDiscard()}
        onCancel={() => setConfirmingDiscard(false)}
      />

      <ConfirmDialog
        open={pendingRecovery !== null}
        tone="info"
        title={
          editingSlug
            ? "이 글에 저장되지 않은 변경이 있어요"
            : "이전에 쓰던 새 글을 이어서 쓸까요?"
        }
        body={
          editingSlug
            ? "서버에 반영된 본문과 다른 로컬 백업이 있습니다. 이어서 쓰면 백업 내용으로 교체되며, 버리면 서버 버전으로 진행돼요."
            : "이전 세션에서 쓰다가 저장하지 않은 임시본입니다. 이어서 쓰면 현재 편집 화면이 임시본 내용으로 교체돼요."
        }
        meta={
          pendingRecovery && (
            <>
              <div className="font-sans text-[14px] font-medium text-ink">
                {pendingRecovery.title || "(제목 없음)"}
              </div>
              <div className="mt-1">
                /posts/{pendingRecovery.slug || "—"} ·{" "}
                {pendingRecovery.body.length}자
              </div>
              <div className="mt-1 text-[11px]">
                백업 시각:{" "}
                {new Date(pendingRecovery.savedAt).toLocaleString()}
              </div>
            </>
          )
        }
        confirmLabel="이어서 쓰기 →"
        cancelLabel="버리기"
        onConfirm={applyRecovery}
        onCancel={discardRecovery}
      />

      {toast && (
        <ToastBanner toast={toast} onClose={() => setToast(null)} />
      )}

      {/* 좁은 화면 탭 — 데스크톱에선 2단이 그대로 보이므로 나오지 않는다. */}
      <div className="hidden gap-0.5 border-b border-border-token px-[var(--gut)] py-2 max-[1000px]:flex">
        {(
          [
            ["edit", "편집"],
            ["preview", "미리보기"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setPane(k)}
            className={`rounded-md border-none px-3 py-1.5 font-sans text-[13px] ${
              pane === k
                ? "bg-hover font-semibold text-ink"
                : "bg-transparent font-medium text-ink-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-[calc(100vh-200px)] grid-cols-2 gap-0 max-[1000px]:grid-cols-1">
        {/* Editor */}
        <section
          className={`border-r border-border-token px-[var(--gut)] pb-16 pt-7 max-[1000px]:border-r-0 max-[1000px]:pb-10 max-[1000px]:pt-6 ${
            pane === "edit" ? "" : "max-[1000px]:hidden"
          }`}
        >
          <div className="mb-3.5 font-mono text-[11px] tracking-[0.05em] text-ink-muted">
            FRONTMATTER
          </div>
          <div className="mb-6 grid gap-2.5">
            <FieldRow label="title">
              <input
                value={title}
                onChange={(e) => {
                  const v = e.target.value;
                  patch(
                    slugLocked
                      ? { title: v, slug: slugifyTitle(v) }
                      : { title: v },
                  );
                  markDirty();
                }}
                placeholder="제목"
                className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[15px] font-semibold tracking-[-0.01em] text-ink outline-none"
              />
            </FieldRow>
            <FieldRow label="slug">
              <div className="flex flex-col gap-1">
                <div className="flex items-stretch gap-1.5">
                  <span
                    className="inline-flex items-center whitespace-nowrap rounded-md border border-border-token px-2 font-mono text-xs text-ink-muted"
                    style={{ background: "var(--surface-alt)" }}
                  >
                    /posts/
                  </span>
                  <input
                    value={slug}
                    onChange={(e) => {
                      patch({
                        slugLocked: false,
                        slug: normalizeSlug(e.target.value),
                      });
                      markDirty();
                    }}
                    placeholder="my-post-slug"
                    className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-mono text-[13px] text-ink outline-none"
                    style={{
                      background: slugLocked
                        ? "var(--surface-alt)"
                        : "var(--surface)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      patch({
                        slugLocked: true,
                        slug: slugifyTitle(title),
                      });
                      markDirty();
                    }}
                    title="제목에서 자동 생성"
                    className="whitespace-nowrap rounded-md border border-border-token px-2.5 text-[13px] text-ink-soft"
                    style={{
                      background: slugLocked
                        ? "var(--surface-alt)"
                        : "transparent",
                    }}
                  >
                    ↻
                  </button>
                </div>
                <span className="font-mono text-[10.5px] text-ink-muted">
                  영소문자, 숫자, 하이픈만 (한글은 자동으로 제거됩니다)
                </span>
              </div>
            </FieldRow>
            <FieldRow label="summary">
              <input
                value={summary}
                onChange={(e) => {
                  patch({ summary: e.target.value });
                  markDirty();
                }}
                placeholder="목록과 OG에 보일 한 줄 요약"
                className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] text-ink outline-none"
              />
            </FieldRow>
            <FieldRow label="category" plain>
              <CategoryField
                categories={categories}
                value={category}
                onChange={(next) => {
                  patch({ category: next });
                  markDirty();
                }}
              />
            </FieldRow>
            <FieldRow label="tags">
              <input
                value={tags}
                onChange={(e) => {
                  patch({ tags: e.target.value });
                  markDirty();
                }}
                placeholder="comma, separated"
                className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] text-ink outline-none"
              />
            </FieldRow>
            <FieldRow label="series">
              <SeriesField
                seriesList={seriesList}
                value={series}
                order={seriesOrder}
                currentSlug={editingSlug}
                newOpen={newSeriesOpen}
                onChange={(next) => {
                  patch(next);
                  markDirty();
                }}
                onToggleNew={() => setNewSeriesOpen((v) => !v)}
                onCreated={(s) => {
                  setSeriesList((prev) =>
                    prev.some((x) => x.id === s.id)
                      ? prev
                      : [...prev, { ...s, posts: [] }],
                  );
                  patch({ series: s.id, seriesOrder: 0 });
                  setNewSeriesOpen(false);
                  markDirty();
                }}
              />
            </FieldRow>
            <FieldRow label="thumbnail" plain>
              <ThumbnailField
                value={thumbnail}
                busy={uploading}
                onPick={(file) => void uploadThumbnail(file)}
                onClear={() => {
                  patch({ thumbnail: "" });
                  markDirty();
                }}
              />
            </FieldRow>
            <FieldRow label="공개 범위">
              <VisibilityField
                value={visibility}
                onChange={(v) => {
                  patch({ visibility: v });
                  markDirty();
                }}
              />
            </FieldRow>
          </div>

          {/* Toolbar */}
          <div className="mb-2 flex items-center gap-1.5">
            <div className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg border border-border-token bg-surface-alt p-1.5">
              {(
                [
                  ["B", "bold", "sans", "group-format"],
                  ["I", "italic", "sans", "group-format"],
                  ["‹/›", "code", "mono", "group-format"],
                  ["¶", "para", "sans", "group-block"],
                  ["{ }", "codeblock", "mono", "group-block"],
                  ["i", "callout-info", "sans", "group-callout"],
                  ["!", "callout-warning", "sans", "group-callout"],
                  ["✓", "callout-tip", "sans", "group-callout"],
                  ["※", "callout-note", "sans", "group-callout"],
                  ["↗", "linkcard", "sans", "group-block"],
                  ["▤", "imagegroup", "sans", "group-block"],
                  ["—", "divider", "sans", "group-block"],
                ] as const
              ).map(([g, k, font, group], idx, arr) => {
                const prevGroup = idx > 0 ? arr[idx - 1][3] : null;
                const showSep = prevGroup !== null && prevGroup !== group;
                return (
                  <Fragment key={k}>
                    {showSep && (
                      <span
                        aria-hidden
                        className="mx-0.5 h-4 w-px bg-border-token"
                      />
                    )}
                    <button
                      type="button"
                      title={TOOLBAR_TITLES[k]}
                      onClick={() => insertMd(k)}
                      className="h-7 w-7 rounded-[5px] border-none bg-transparent text-[12px] font-semibold text-ink-soft hover:bg-hover"
                      style={{
                        fontFamily:
                          font === "mono"
                            ? "var(--font-mono)"
                            : "var(--font-sans)",
                        fontStyle: k === "italic" ? "italic" : "normal",
                      }}
                    >
                      {g}
                    </button>
                  </Fragment>
                );
              })}
              <span
                aria-hidden
                className="mx-0.5 h-4 w-px bg-border-token"
              />
              <button
                type="button"
                title="이미지 업로드 (드래그/붙여넣기도 가능)"
                onClick={handleFilePick}
                disabled={uploading}
                className="inline-flex h-7 items-center rounded-[5px] border-none bg-transparent px-2 font-sans text-[12px] font-semibold text-ink-soft hover:bg-hover disabled:cursor-progress disabled:opacity-60"
              >
                {uploading ? "업로드 중…" : "이미지"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) void uploadFiles(files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              patch({ body: e.target.value });
              markDirty();
            }}
            onKeyDown={handleEditorKeyDown}
            onPaste={handleEditorPaste}
            onDrop={handleEditorDrop}
            onDragOver={handleEditorDragOver}
            onDragLeave={handleEditorDragLeave}
            className="min-h-[540px] w-full rounded-lg border bg-surface px-[18px] py-4 font-mono text-[13.5px] leading-[1.7] text-ink outline-none transition-colors"
            style={{
              resize: "vertical",
              borderColor: dragOver ? "var(--ink)" : "var(--border)",
              boxShadow: dragOver
                ? "inset 0 0 0 2px var(--ink)"
                : undefined,
            }}
          />

          <MarkdownCheatsheet />
        </section>

        {/* Preview */}
        <section
          className={`overflow-auto px-[var(--gut)] pb-16 pt-7 max-[1000px]:pb-10 max-[1000px]:pt-6 ${
            pane === "preview" ? "" : "max-[1000px]:hidden"
          }`}
        >
          <div className="mb-3.5 font-mono text-[11px] tracking-[0.05em] text-ink-muted">
            PREVIEW
          </div>
          <div className="max-w-[640px]">
            <div className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {category ? categoryLabelIn(categories, category) : "—"} ·{" "}
              {VISIBILITY_META[visibility].label}
            </div>
            <h1 className="m-0 font-sans text-[clamp(27px,6vw,36px)] font-semibold leading-[1.15] tracking-[-0.035em] text-ink">
              {title || "(제목 없음)"}
            </h1>
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tg) => (
                  <TagChip key={tg} tag={tg} size="sm" />
                ))}
            </div>
            <hr className="my-6 border-0 border-t border-border-token" />
            {renderedBody}
          </div>
        </section>
      </div>
    </main>
  );
}

function VisibilityField({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  const desc = VISIBILITY_META[value].desc;
  return (
    <div className="grid gap-2">
      <div className="inline-flex border-b border-border-token">
        {VISIBILITY_OPTIONS.map((o) => {
          const isActive = o.v === value;
          const accent =
            o.v === "published"
              ? "var(--visibility-pub, #5a6b3a)"
              : o.v === "private"
                ? "var(--ink)"
                : "var(--ink-muted)";
          return (
            <button
              key={o.v}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(o.v)}
              className="-mb-px inline-flex items-center gap-[7px] border-b-[1.5px] bg-transparent px-3.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] transition-[color,border-color] duration-[120ms]"
              style={{
                borderColor: isActive ? accent : "transparent",
                color: isActive ? "var(--ink)" : "var(--ink-muted)",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <span
                aria-hidden
                className="text-[9px] leading-none"
                style={{
                  color: isActive ? accent : "var(--border-strong)",
                }}
              >
                {o.glyph}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="font-sans text-[11.5px] tracking-[-0.005em] text-ink-muted">
        {desc}
      </div>
    </div>
  );
}

/**
 * 대표 이미지 — 홈 Featured 의 리드 그림에만 쓴다. 비워 두면 시리즈 진행
 * 인디케이터, 그것도 없으면 카테고리·태그 타이포가 대신 들어간다.
 */
function ThumbnailField({
  value,
  busy,
  onPick,
  onClear,
}: {
  value: string;
  busy: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2.5">
        {value ? (
          <span className="relative h-[42px] w-14 shrink-0 overflow-hidden rounded border border-border-token bg-surface-alt">
            <Image src={value} alt="" fill sizes="56px" className="object-cover" />
          </span>
        ) : (
          <span className="grid h-[42px] w-14 shrink-0 place-items-center rounded border border-dashed border-border-token bg-surface-alt font-mono text-[10px] text-ink-subtle">
            없음
          </span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-md border border-border-token bg-surface px-2.5 py-[6px] font-sans text-[12.5px] text-ink-soft hover:bg-hover disabled:cursor-progress disabled:opacity-60"
        >
          {busy ? "업로드 중…" : value ? "변경" : "이미지 선택"}
        </button>
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border-none bg-transparent px-1.5 py-[6px] font-sans text-[12.5px] text-ink-muted hover:bg-hover"
          >
            지우기
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(file);
          }}
        />
      </div>
      <div className="font-mono text-[11px] text-ink-subtle">
        {value || "비우면 시리즈 · 카테고리 그림이 대신 들어갑니다"}
      </div>
    </div>
  );
}

/**
 * 카테고리 선택 — 상위 pill 줄 + 선택된 상위의 하위 pill 줄.
 *
 * native select 를 쓰지 않는다: OS 드롭다운은 테마를 따르지 않고, 하위가
 * optgroup 으로 접혀 지금 무엇이 골라져 있는지 열어봐야 안다.
 *
 * 저장되는 값은 **여전히 하나**다 — 하위를 고르면 서브 id, "전체" 를 고르면
 * 부모 id. 상위 줄은 `resolveCategoryIn` 으로 역추적해 칠하기만 한다.
 */
function CategoryField({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (next: string) => void;
}) {
  const resolved = resolveCategoryIn(categories, value);
  const parent = resolved?.parent ?? categories[0];
  const subs = parent?.subs ?? [];

  const pill = (active: boolean, small = false) =>
    [
      "inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap",
      small ? "h-[26px] px-[11px] text-xs" : "h-[30px] px-[13px] text-[13px]",
      "font-sans tracking-[-0.01em] transition-colors",
      active
        ? "border-accent bg-accent font-semibold text-accent-ink"
        : "border-border-token bg-transparent font-medium text-ink-muted hover:bg-hover hover:text-ink",
    ].join(" ");

  if (!parent) return null;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const active = cat.id === parent.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(cat.id)}
              className={pill(active)}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {subs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pl-0.5">
          <span aria-hidden className="mr-0.5 font-mono text-[11px] text-ink-subtle">
            └
          </span>
          {[{ id: parent.id, name: "전체" }, ...subs].map((s) => {
            const active = s.id === value;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(s.id)}
                className={[
                  pill(false, true),
                  active
                    ? "border-border-strong bg-surface-alt font-semibold text-ink"
                    : "",
                ].join(" ")}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="font-mono text-[11px] text-ink-subtle">{value}</div>
    </div>
  );
}

function FieldRow({
  label,
  children,
  plain = false,
}: {
  label: string;
  children: ReactNode;
  /**
   * 감싸는 요소를 label 대신 div 로. 안에 hidden file input 이 있는 행은
   * label 을 쓰면 행 아무 데나 눌러도 파일 선택창이 열려 버린다.
   */
  plain?: boolean;
}) {
  const Wrapper = plain ? "div" : "label";
  return (
    <Wrapper className="grid grid-cols-[90px_1fr] items-start gap-3 max-[680px]:grid-cols-1 max-[680px]:gap-1.5">
      <span className="pt-[9px] font-mono text-xs text-ink-muted">{label}</span>
      {children}
    </Wrapper>
  );
}

const SERIES_PALETTE = [
  "#7a8a5a",
  "#a8814a",
  "#5a7480",
  "#8a7355",
  "#6a5a8a",
];

function SeriesField({
  seriesList,
  value,
  order,
  currentSlug,
  newOpen,
  onChange,
  onToggleNew,
  onCreated,
}: {
  seriesList: StudioSeries[];
  value: string;
  order: number;
  currentSlug: string | null;
  newOpen: boolean;
  onChange: (next: { series?: string; seriesOrder?: number }) => void;
  onToggleNew: () => void;
  onCreated: (s: Series) => void;
}) {
  const known = seriesList.some((s) => s.id === value);
  const current = seriesList.find((s) => s.id === value);
  const targetTotal = current?.count;

  const occupied = new Map<number, StudioSeriesPost>();
  if (current) {
    for (const p of current.posts) {
      if (p.slug === currentSlug) continue;
      if (typeof p.seriesOrder === "number") occupied.set(p.seriesOrder, p);
    }
  }
  const slotMax = current
    ? Math.max(
        current.count,
        ...current.posts.map((p) => p.seriesOrder ?? 0),
        order,
      )
    : 0;
  const slotCount = current ? slotMax + 1 : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            onChange({ series: next, ...(next ? {} : { seriesOrder: 0 }) });
          }}
          className="flex-1 min-w-[160px] rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] text-ink outline-none"
        >
          <option value="">없음</option>
          {seriesList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
          {value && !known && (
            <option value={value}>(미정의: {value})</option>
          )}
        </select>
        {value && !current && (
          <input
            type="text"
            inputMode="numeric"
            placeholder="순서"
            value={order > 0 ? String(order) : ""}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ""));
              onChange({ seriesOrder: Number.isFinite(n) ? n : 0 });
            }}
            className="w-20 rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-mono text-[13px] text-ink outline-none"
          />
        )}
        <button
          type="button"
          onClick={onToggleNew}
          className="inline-flex h-[31px] items-center gap-1 rounded-md border border-border-token bg-transparent px-2.5 font-sans text-[12px] font-medium text-ink-soft hover:border-border-strong"
        >
          <span aria-hidden>＋</span>
          새 시리즈
        </button>
      </div>

      {/* 회차 슬롯 레일 — 찬 칸·빈 칸·목표 초과를 눌러 보지 않고도 구분한다.
          select 의 옵션 텍스트로 설명하던 것을 자리로 바꿨다. */}
      {value && current && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[11px] text-ink-subtle">회차</span>
          {Array.from({ length: slotCount }).map((_, i) => {
            const n = i + 1;
            const taken = occupied.get(n);
            const active = n === order;
            const isOver = n > current.count;
            const title = taken
              ? `${n}편 — ${taken.title}${taken.visibility !== "published" ? " (초안)" : ""}`
              : isOver
                ? `${n}편 — 목표 초과 슬롯`
                : `${n}편 — 비어있음`;
            return (
              <button
                key={n}
                type="button"
                title={title}
                aria-pressed={active}
                onClick={() => onChange({ seriesOrder: active ? 0 : n })}
                className={`relative h-[30px] w-[30px] rounded-md font-mono text-xs tabular-nums transition-colors ${
                  active
                    ? "border border-accent bg-accent font-bold text-accent-ink"
                    : taken
                      ? "border border-border-token bg-surface-alt font-medium text-ink-muted"
                      : "border border-dashed border-border-strong bg-transparent font-medium text-ink-soft"
                }`}
              >
                {n}
                {taken && !active && (
                  <span
                    aria-hidden
                    className="absolute bottom-[3px] right-1 h-[3px] w-[3px] rounded-full"
                    style={{ background: current.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {value && current && order > 0 && occupied.has(order) && (
        <div className="font-sans text-[11.5px] text-[#a04a3a]">
          {order}편은 이미 “{occupied.get(order)?.title}”가 차지하고 있습니다.
        </div>
      )}
      {value && targetTotal !== undefined && order > targetTotal && (
        <div className="font-sans text-[11.5px] text-ink-muted">
          시리즈 목표 {targetTotal}편을 넘는 순서입니다 — 시리즈에서 자동 확장됩니다.
        </div>
      )}
      {newOpen && (
        <NewSeriesInline
          existingIds={seriesList.map((s) => s.id)}
          onCancel={onToggleNew}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

function NewSeriesInline({
  existingIds,
  onCancel,
  onCreated,
}: {
  existingIds: string[];
  onCancel: () => void;
  onCreated: (s: Series) => void;
}) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [count, setCount] = useState(5);
  const [color, setColor] = useState(SERIES_PALETTE[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const idClash = existingIds.includes(id);
  const canSubmit =
    !submitting &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(id) &&
    !idClash &&
    title.trim().length > 0 &&
    desc.trim().length > 0 &&
    count > 0;

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(API.series, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, desc, count, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      const created = (await res.json()) as Series;
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const inp =
    "w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] text-ink outline-none";

  return (
    <div className="rounded-md border border-border-token bg-surface-alt p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10.5px] text-ink-muted">id</span>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="concurrency"
            className={`${inp} font-mono text-[12.5px]`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10.5px] text-ink-muted">title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="동시성 제대로 보기"
            className={inp}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="font-mono text-[10.5px] text-ink-muted">desc</span>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="한 문장으로 이 시리즈가 무엇을 다루는지"
            className={inp}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10.5px] text-ink-muted">count</span>
          <input
            type="text"
            inputMode="numeric"
            value={count > 0 ? String(count) : ""}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ""));
              setCount(Number.isFinite(n) ? n : 0);
            }}
            placeholder="목표 편수"
            className={`${inp} font-mono text-[13px]`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10.5px] text-ink-muted">color</span>
          <div className="flex h-[31px] items-center gap-1.5">
            {SERIES_PALETTE.map((co) => (
              <button
                key={co}
                type="button"
                onClick={() => setColor(co)}
                className="h-6 w-6 cursor-pointer rounded-full p-0"
                aria-label={co}
                style={{
                  background: co,
                  border:
                    color === co
                      ? "2px solid var(--ink)"
                      : "1px solid var(--border)",
                }}
              />
            ))}
          </div>
        </label>
      </div>
      {(error || idClash) && (
        <div className="mt-2 font-sans text-[11.5px] text-[#a04a3a]">
          {idClash ? `이미 존재하는 id: ${id}` : error}
        </div>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border-token bg-transparent px-3 py-[6px] font-sans text-[12.5px] text-ink-soft"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-md border-none px-3 py-[6px] font-sans text-[12.5px] font-semibold disabled:opacity-50"
          style={{ background: "var(--ink)", color: "var(--bg)" }}
        >
          {submitting ? "생성 중…" : "시리즈 생성"}
        </button>
      </div>
    </div>
  );
}

function CheatsheetRow({
  syntax,
  label,
}: {
  syntax: string;
  label: string;
}) {
  return (
    <tr>
      <td
        className="border-b border-border-token px-2.5 py-[7px] align-top font-mono text-[12px] text-ink-soft"
        style={{ whiteSpace: "pre", width: "52%" }}
      >
        {syntax}
      </td>
      <td className="border-b border-border-token px-2.5 py-[7px] align-top font-sans text-[12.5px] tracking-[-0.005em] text-ink-muted">
        {label}
      </td>
    </tr>
  );
}

function MarkdownCheatsheet() {
  const [open, setOpen] = useState(false);
  return (
    <section
      id="md-cheatsheet"
      className="mt-5 rounded-[10px] border border-border-token bg-surface-alt px-4 py-3.5"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent p-0 font-sans text-[13px] font-semibold tracking-[-0.01em] text-ink"
      >
        <span
          aria-hidden
          className="inline-block w-2.5 text-[10px] text-ink-muted transition-transform duration-150"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0)" }}
        >
          ▸
        </span>
        마크다운 문법
        <span className="flex-1" />
        <span className="font-mono text-[11px] font-normal text-ink-muted">
          {open ? "닫기" : "펼치기"}
        </span>
      </button>
      {open && (
        <div className="mt-3">
          <div className="my-1 mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            블록
          </div>
          <table
            className="w-full border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <tbody>
              <CheatsheetRow syntax="# 제목" label="H1" />
              <CheatsheetRow syntax="## 섹션" label="H2 (TOC에 표시)" />
              <CheatsheetRow syntax="### 하위 섹션" label="H3 (TOC에 표시)" />
              <CheatsheetRow syntax="#### 작은 제목" label="H4" />
              <CheatsheetRow
                syntax={"```java:Order.java\n코드…\n```"}
                label="코드 블록 (lang : filename)"
              />
              <CheatsheetRow
                syntax={"```flow\ncaption: 캡션\n단계 | 설명\n강조할 단계 *\n```"}
                label="그림 블록 — flow·cycle·compare·matrix·timeline·sequence·layers·tree·stats·bars"
              />
              <CheatsheetRow
                syntax={'```figure\n<div class="fig-flow">…</div>\n```'}
                label="figure — fig-* 디자인 키트 HTML(그림 블록으로 안 될 때)"
              />
              <CheatsheetRow
                syntax={'<div class="fig-box" data-anim="pop" style="--i: 2">\n<path data-anim="draw" data-loop="orbit" …/>'}
                label="그림 모션(figure·SVG) — data-anim rise·fade·pop·draw·draw-back·grow·count·none / data-loop orbit·pulse / 순서 --i"
              />
              <CheatsheetRow
                syntax={"> [!INFO] 제목\n> 본문 줄들\n> 계속"}
                label="Callout — INFO / WARNING / TIP / NOTE"
              />
              <CheatsheetRow syntax={"- 항목\n- 항목"} label="리스트" />
              <CheatsheetRow syntax={"1. 항목\n2. 항목"} label="번호 리스트" />
              <CheatsheetRow
                syntax={"| 열 | 열 |\n|---|---|\n| 값 | 값 |"}
                label="표 (헤더 다음 줄에 구분행 필수)"
              />
              <CheatsheetRow
                syntax="https://example.com"
                label="링크 카드 — URL 만 한 줄"
              />
              <CheatsheetRow
                syntax="/posts/slug"
                label="이 블로그의 글 카드"
              />
              <CheatsheetRow syntax={"첫 줄\n둘째 줄"} label="줄바꿈 — 엔터" />
              <CheatsheetRow
                syntax={"문단\n\n다음 문단"}
                label="문단 나누기 — 빈 줄"
              />
              <CheatsheetRow syntax="---" label="수평선" />
            </tbody>
          </table>
          <div className="mt-3.5 mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            인라인
          </div>
          <table
            className="w-full border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <tbody>
              <CheatsheetRow syntax="**굵게**" label="강조" />
              <CheatsheetRow syntax="*기울임*" label="이탤릭" />
              <CheatsheetRow syntax="`코드`" label="인라인 코드" />
              <CheatsheetRow syntax="[텍스트](url)" label="링크" />
              <CheatsheetRow
                syntax="https://example.com"
                label="문장 안 주소 — 자동 링크"
              />
              <CheatsheetRow
                syntax="![alt](url)"
                label="이미지 — 줄에 혼자면 캡션 달린 그림"
              />
              <CheatsheetRow
                syntax="![alt](url){sm}"
                label="좁게 (380px)"
              />
              <CheatsheetRow
                syntax="![alt](url){wide}"
                label="넓게 (본문 폭 밖, 880px)"
              />
              <CheatsheetRow
                syntax="![a](u1){3}⏎![b](u2)"
                label="연속 줄 = 묶음, 첫 줄 숫자로 열 수 (1~4)"
              />
            </tbody>
          </table>
          <div className="mt-3.5 rounded-lg border border-border-token bg-surface px-3 py-2.5 font-sans text-[12px] leading-[1.6] tracking-[-0.005em] text-ink-muted">
            <strong className="font-semibold text-ink">규칙</strong>{" "}
            — <code className="font-mono">{"> "}</code>는 callout 전용 (일반
            인용문 없음). 헤더와 마커 뒤엔{" "}
            <strong className="font-semibold text-ink">공백 한 칸</strong>{" "}
            필수. <code className="font-mono">{"<Callout>"}</code> 같은 JSX
            태그는 인식하지 않는다.
          </div>
        </div>
      )}
    </section>
  );
}
