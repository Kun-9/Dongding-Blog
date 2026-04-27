"use client";

/**
 * Studio — write/edit page with split editor + live preview.
 * Wires the dev-only `/api/posts` routes: POST for new drafts, PUT for
 * updates (with optional slug rename), GET to hydrate an existing post via
 * `?slug=`. Production builds render <DevOnlyNotice />.
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
import { useRouter, useSearchParams } from "next/navigation";
import { categories, categoryLabel } from "@/lib/categories";
import type { Visibility } from "@/lib/types";
import { renderMarkdown, type ImageWidth } from "@/lib/markdown";
import { safeReadJSON, safeRemove, safeWriteJSON } from "@/lib/storage";
import { CTA } from "@/components/ui/CTA";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TagChip } from "@/components/post/TagChip";
import { DevOnlyNotice } from "@/components/layout/DevOnlyNotice";

const isDev = process.env.NODE_ENV === "development";

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
type Toast = { kind: "success" | "error"; message: string; href?: string };
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
  | "divider";

const TOOLBAR_TITLES: Record<ToolbarAction, string> = {
  bold: "굵게",
  italic: "기울임",
  code: "인라인 코드",
  para: "줄바꿈",
  codeblock: "코드 블록",
  "callout-info": "Callout — INFO",
  "callout-warning": "Callout — WARNING",
  "callout-tip": "Callout — TIP",
  "callout-note": "Callout — NOTE",
  divider: "수평선",
};

const IMAGE_MIME_PREFIX = "image/";
const PUBLISH_REDIRECT_MS = 2000;

export default function Page() {
  if (!isDev) return <DevOnlyNotice page="스튜디오" />;
  return (
    <Suspense fallback={<EditorFallback message="에디터 로딩 중…" />}>
      <StudioEditor />
    </Suspense>
  );
}

function EditorFallback({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-[1180px] px-8 py-32 text-center text-sm text-ink-muted">
      {message}
    </main>
  );
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-");
}

const IMAGE_TOKEN_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const IMAGE_WIDTH_SUFFIX_RE = /\|(\d+%?)$/;

function setImageWidthAt(
  body: string,
  imageIndex: number,
  width: ImageWidth | null,
): string {
  let count = 0;
  return body.replace(IMAGE_TOKEN_RE, (full, rawAlt: string, url: string) => {
    if (count++ !== imageIndex) return full;
    const cleanAlt = rawAlt.replace(IMAGE_WIDTH_SUFFIX_RE, "");
    const newAlt = width != null ? `${cleanAlt}|${width}` : cleanAlt;
    return `![${newAlt}](${url})`;
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
  savedAt: number;
};
type DraftSnapshot = Omit<LocalDraft, "savedAt">;

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
    a.visibility === b.visibility
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
    glyph: "◐",
    desc: "URL 알아도 안 보임",
    badgeLabel: "PRIVATE",
    ctaLabel: "비공개로 저장",
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

function StudioEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingSlug = searchParams.get("slug");

  const [loading, setLoading] = useState<boolean>(!!editingSlug);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, dispatch] = useReducer(
    formReducer,
    categories[0]?.id ?? "",
    newDraftState,
  );
  const { title, summary, slug, slugLocked, category, tags, body, visibility, date } = form;
  const patch = useCallback(
    (p: Partial<FormState>) => dispatch({ type: "PATCH", patch: p }),
    [],
  );

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
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

  // Load existing post or initialize new draft.
  useEffect(() => {
    let cancelled = false;
    if (editingSlug) {
      // Skip refetch when we hydrated this slug ourselves (e.g. just saved).
      if (hydratedSlugRef.current === editingSlug) return;
      setLoading(true);
      fetch(`/api/posts/${encodeURIComponent(editingSlug)}/`)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          const serverVisibility: Visibility =
            data.visibility === "published" ||
            data.visibility === "private" ||
            data.visibility === "draft"
              ? data.visibility
              : "draft";
          const serverSnapshot: DraftSnapshot = {
            title: data.title ?? "",
            summary: data.summary ?? "",
            slug: data.slug ?? editingSlug,
            category: data.category || (categories[0]?.id ?? ""),
            tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
            body: data.body ?? "",
            visibility: serverVisibility,
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
      dispatch({
        type: "HYDRATE_NEW",
        defaultCategory: categories[0]?.id ?? "",
      });
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
    }),
    [body, category, date, visibility, slug, summary, tags, title],
  );

  const persist = useCallback(
    async (payload: ReturnType<typeof buildPayload>): Promise<string> => {
      if (!payload.slug) {
        throw new Error("slug이 비어있습니다");
      }
      const isNew = !editingSlug;
      const url = isNew
        ? "/api/posts/"
        : `/api/posts/${encodeURIComponent(editingSlug)}/`;
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
      const res = await fetch(`/api/posts/${encodeURIComponent(editingSlug)}/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const serverVisibility: Visibility =
        data.visibility === "published" ||
        data.visibility === "private" ||
        data.visibility === "draft"
          ? data.visibility
          : "draft";
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
  }, [editingSlug]);

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
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch(
            `/api/posts/${encodeURIComponent(targetSlug)}/images/`,
            { method: "POST", body: fd },
          );
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error ?? `HTTP ${res.status}`);
          }
          const data = (await res.json()) as { url: string; filename: string };
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
    (imageIndex: number, width: ImageWidth | null) => {
      patch({ body: setImageWidthAt(body, imageIndex, width) });
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
  ]);

  const wordCount = body.replace(/\s+/g, "").length;
  const readTime = Math.max(1, Math.round(wordCount / 500));

  // Studio preview uses editable=true so EditableImage renders the slider
  // panel; the post detail page renders ZoomableImage via the same parser.
  const renderedBody = useMemo(
    () =>
      renderMarkdown(body, {
        editable: true,
        onImageResize: handlePreviewImageResize,
      }),
    [body, handlePreviewImageResize],
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
        className="sticky top-[60px] z-40 flex items-center gap-3 border-b border-border-token px-8 py-3"
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
            : "발행하면 공개 범위가 published로 바뀌고 공개 목록과 RSS, sitemap에 노출됩니다."
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

      <div className="grid min-h-[calc(100vh-200px)] grid-cols-1 gap-0 md:grid-cols-2">
        {/* Editor */}
        <section className="border-b border-border-token px-5 pb-10 pt-6 md:border-b-0 md:border-r md:px-8 md:pb-16 md:pt-7">
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
            <FieldRow label="category">
              <select
                value={category}
                onChange={(e) => {
                  patch({ category: e.target.value });
                  markDirty();
                }}
                className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] text-ink outline-none"
              >
                {categories.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    <option value={cat.id}>{cat.name} (전체)</option>
                    {cat.subs?.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
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
            <div className="flex w-fit items-center gap-1 rounded-lg border border-border-token bg-surface-alt p-1.5">
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
        <section className="overflow-auto px-5 pb-10 pt-6 md:px-8 md:pb-16 md:pt-7">
          <div className="mb-3.5 font-mono text-[11px] tracking-[0.05em] text-ink-muted">
            PREVIEW
          </div>
          <div className="max-w-[640px]">
            <div className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {category ? categoryLabel(category) : "—"} ·{" "}
              {VISIBILITY_META[visibility].label}
            </div>
            <h1 className="m-0 font-sans text-[36px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink">
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

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid grid-cols-[90px_1fr] items-start gap-3">
      <span className="pt-[9px] font-mono text-xs text-ink-muted">{label}</span>
      {children}
    </label>
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
                syntax={"> [!INFO] 제목\n> 본문 줄들\n> 계속"}
                label="Callout — INFO / WARNING / TIP / NOTE"
              />
              <CheatsheetRow syntax={"- 항목\n- 항목"} label="리스트" />
              <CheatsheetRow syntax={"1. 항목\n2. 항목"} label="번호 리스트" />
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
              <CheatsheetRow syntax="![alt](url)" label="이미지" />
              <CheatsheetRow
                syntax="![alt|480](url)"
                label="이미지 + 너비 (480px)"
              />
              <CheatsheetRow
                syntax="![alt|50%](url)"
                label="이미지 + 너비 (50%)"
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

function ToastBanner({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const isSuccess = toast.kind === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[100] flex max-w-[420px] items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        background: "var(--surface)",
        borderColor: isSuccess ? "#7da75e" : "#c95c5c",
        boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
      }}
    >
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold"
        style={{
          background: isSuccess ? "#7da75e" : "#c95c5c",
          color: "white",
        }}
      >
        {isSuccess ? "✓" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-sans text-[13px] font-medium leading-[1.5] text-ink">
          {toast.message}
        </div>
        {toast.href && (
          <a
            href={toast.href}
            className="mt-1 inline-block font-sans text-[12.5px] font-semibold text-ink underline underline-offset-2"
          >
            지금 보기 →
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="shrink-0 rounded p-1 text-[14px] text-ink-muted hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}

