"use client";

/**
 * Studio — write/edit page with split editor + live preview.
 * Wires the dev-only `/api/posts` routes: POST for new drafts, PUT for
 * updates (with optional slug rename), GET to hydrate an existing post via
 * `?slug=`. Production builds render <DevOnlyNotice />.
 */
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { categories } from "@/lib/categories";
import type { Visibility } from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";
import { CTA } from "@/components/ui/CTA";
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
  | "callout"
  | "divider";
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

function readDraft(key: string): LocalDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalDraft>;
    if (
      typeof parsed?.body !== "string" ||
      typeof parsed?.savedAt !== "number"
    )
      return null;
    return parsed as LocalDraft;
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: LocalDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — skip silently */
  }
}

function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
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

function StudioEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingSlug = searchParams.get("slug");

  const [loading, setLoading] = useState<boolean>(!!editingSlug);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [slug, setSlug] = useState("");
  const [slugLocked, setSlugLocked] = useState(true);
  const [category, setCategory] = useState(categories[0]?.id ?? "");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState(SAMPLE_BODY);
  const [visibility, setVisibility] = useState<Visibility>("draft");
  const [date, setDate] = useState("");

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [localSavedAt, setLocalSavedAt] = useState<number | null>(null);
  const [pendingRecovery, setPendingRecovery] = useState<LocalDraft | null>(
    null,
  );

  const initializedRef = useRef(false);
  const dirtyRef = useRef(false);
  const hydratedSlugRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          setTitle(serverSnapshot.title);
          setSummary(serverSnapshot.summary);
          setSlug(serverSnapshot.slug);
          setSlugLocked(false); // existing slug is intentional
          setCategory(serverSnapshot.category);
          setTags(serverSnapshot.tags);
          setBody(serverSnapshot.body);
          setVisibility(serverSnapshot.visibility);
          setDate(data.date ?? "");
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
      setTitle("");
      setSummary("");
      setSlug("");
      setSlugLocked(true);
      setCategory(categories[0]?.id ?? "");
      setTags("");
      setBody(SAMPLE_BODY);
      setVisibility("draft");
      setDate("");
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

  const applyRecovery = useCallback(() => {
    if (!pendingRecovery) return;
    setTitle(pendingRecovery.title);
    setSummary(pendingRecovery.summary);
    setSlug(pendingRecovery.slug);
    setSlugLocked(false);
    setCategory(pendingRecovery.category);
    setTags(pendingRecovery.tags);
    setBody(pendingRecovery.body);
    setVisibility(pendingRecovery.visibility);
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

  // Same parser as the post detail page → preview matches the published view.
  const renderedBody = useMemo(() => renderMarkdown(body), [body]);

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
        case "callout":
          insertBlock("> [!INFO] 제목\n> " + (sel || "본문 내용"));
          break;
        case "divider":
          insertBlock("---");
          break;
        default:
          return;
      }

      setBody(nextBody);
      markDirty();
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [body, markDirty],
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
        setBody(next);
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
        setBody(next);
        markDirty();
        const cursor = pos + 1 + prefix.length;
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(cursor, cursor);
        });
      }
    },
    [markDirty],
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
            {visibility === "published"
              ? "PUBLISHED"
              : visibility === "private"
                ? "PRIVATE"
                : "DRAFT"}
          </span>
        )}
        <div className="flex-1" />
        <CTA
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          {visibility === "published"
            ? "발행하기 →"
            : visibility === "private"
              ? "비공개로 저장"
              : "초안 저장"}
        </CTA>
      </div>

      {confirmingPublish && (
        <ConfirmPublishModal
          title={title || "(제목 없음)"}
          slug={slug}
          alreadyPublished={visibility === "published"}
          onConfirm={() => void handleConfirmPublish()}
          onCancel={() => setConfirmingPublish(false)}
        />
      )}

      {pendingRecovery && (
        <RecoveryPromptModal
          draft={pendingRecovery}
          isNewPost={!editingSlug}
          onApply={applyRecovery}
          onDiscard={discardRecovery}
        />
      )}

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
                  setTitle(v);
                  if (slugLocked) setSlug(slugifyTitle(v));
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
                      setSlugLocked(false);
                      setSlug(normalizeSlug(e.target.value));
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
                      setSlugLocked(true);
                      setSlug(slugifyTitle(title));
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
                  영소문자 · 숫자 · 하이픈만 (한글은 자동으로 제거됩니다)
                </span>
              </div>
            </FieldRow>
            <FieldRow label="summary">
              <input
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  markDirty();
                }}
                placeholder="목록·OG에서 보일 한 줄 요약"
                className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] text-ink outline-none"
              />
            </FieldRow>
            <FieldRow label="category">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  markDirty();
                }}
                className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] text-ink outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="tags">
              <input
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
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
                  setVisibility(v);
                  markDirty();
                }}
              />
            </FieldRow>
          </div>

          {/* Toolbar */}
          <div className="mb-2 flex items-center gap-1.5">
            <div className="flex w-fit gap-1 rounded-lg border border-border-token bg-surface-alt p-1.5">
              {(
                [
                  ["B", "bold", "sans"],
                  ["I", "italic", "sans"],
                  ["‹/›", "code", "mono"],
                  ["¶", "para", "sans"],
                  ["{ }", "codeblock", "mono"],
                  ["◐", "callout", "sans"],
                  ["—", "divider", "sans"],
                ] as const
              ).map(([g, k, font]) => (
                <button
                  key={k}
                  type="button"
                  title={k}
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
              ))}
            </div>
            <div className="flex-1" />
            <a
              href="#md-cheatsheet"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("md-cheatsheet")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="font-mono text-[11px] text-ink-muted no-underline"
            >
              마크다운 문법 ↓
            </a>
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              markDirty();
            }}
            onKeyDown={handleEditorKeyDown}
            className="min-h-[540px] w-full rounded-lg border border-border-token bg-surface px-[18px] py-4 font-mono text-[13.5px] leading-[1.7] text-ink outline-none"
            style={{ resize: "vertical" }}
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
              {categories.find((x) => x.id === category)?.name ?? "—"} ·{" "}
              {visibility === "published"
                ? "발행"
                : visibility === "private"
                  ? "비공개"
                  : "초안"}
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

const VISIBILITY_OPTIONS: ReadonlyArray<{
  v: Visibility;
  label: string;
  glyph: string;
  desc: string;
}> = [
  { v: "published", label: "발행", glyph: "●", desc: "외부에 공개" },
  { v: "private", label: "비공개", glyph: "◐", desc: "URL 알아도 안 보임" },
  { v: "draft", label: "초안", glyph: "○", desc: "저장만, 미공개" },
];

function VisibilityField({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  const desc =
    VISIBILITY_OPTIONS.find((o) => o.v === value)?.desc ?? "";
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

function ConfirmPublishModal({
  title,
  slug,
  alreadyPublished,
  onConfirm,
  onCancel,
}: {
  title: string;
  slug: string;
  alreadyPublished: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(440px,92vw)] overflow-hidden rounded-2xl border border-border-token bg-surface"
        style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
      >
        <div className="px-6 pt-6 pb-2">
          <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            {alreadyPublished ? "다시 발행" : "발행 확인"}
          </div>
          <h2 className="m-0 font-sans text-[20px] font-semibold tracking-[-0.02em] text-ink">
            이 글을 지금 발행할까요?
          </h2>
          <div className="mt-3 rounded-md border border-border-token bg-surface-alt px-3 py-2.5">
            <div className="font-sans text-[14px] font-medium text-ink">
              {title}
            </div>
            <div className="mt-1 font-mono text-[12px] text-ink-muted">
              /posts/{slug || "—"}
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-[1.65] text-ink-muted">
            {alreadyPublished
              ? "이미 발행된 글입니다. 변경 사항을 다시 발행하면 즉시 반영돼요."
              : "발행하면 공개 범위가 published로 바뀌고 공개 목록·RSS·sitemap에 노출됩니다."}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border-token px-6 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border-token bg-transparent px-3 py-1.5 font-sans text-[13px] font-medium text-ink"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="rounded-md border-none px-3.5 py-1.5 font-sans text-[13px] font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
              boxShadow:
                "inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.25)",
            }}
          >
            발행하기 →
          </button>
        </div>
      </div>
    </div>
  );
}

function RecoveryPromptModal({
  draft,
  isNewPost,
  onApply,
  onDiscard,
}: {
  draft: LocalDraft;
  isNewPost: boolean;
  onApply: () => void;
  onDiscard: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDiscard();
      if (e.key === "Enter") onApply();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onApply, onDiscard]);

  const savedAtLabel = new Date(draft.savedAt).toLocaleString();
  const charCount = draft.body.length;

  return (
    <div
      onClick={onDiscard}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(460px,92vw)] overflow-hidden rounded-2xl border border-border-token bg-surface"
        style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
      >
        <div className="px-6 pt-6 pb-2">
          <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            임시 저장본 발견
          </div>
          <h2 className="m-0 font-sans text-[20px] font-semibold tracking-[-0.02em] text-ink">
            {isNewPost
              ? "이전에 쓰던 새 글을 이어서 쓸까요?"
              : "이 글에 저장되지 않은 변경이 있어요"}
          </h2>
          <div className="mt-3 rounded-md border border-border-token bg-surface-alt px-3 py-2.5">
            <div className="font-sans text-[14px] font-medium text-ink">
              {draft.title || "(제목 없음)"}
            </div>
            <div className="mt-1 font-mono text-[12px] text-ink-muted">
              /posts/{draft.slug || "—"} · {charCount}자
            </div>
            <div className="mt-1 font-mono text-[11px] text-ink-muted">
              백업 시각: {savedAtLabel}
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-[1.65] text-ink-muted">
            {isNewPost
              ? "이전 세션에서 쓰다가 저장하지 않은 임시본입니다. 이어서 쓰면 현재 편집 화면이 임시본 내용으로 교체돼요."
              : "서버에 반영된 본문과 다른 로컬 백업이 있습니다. 이어서 쓰면 백업 내용으로 교체되며, 버리면 서버 버전으로 진행돼요."}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border-token px-6 py-3.5">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-md border border-border-token bg-transparent px-3 py-1.5 font-sans text-[13px] font-medium text-ink"
          >
            버리기
          </button>
          <button
            type="button"
            onClick={onApply}
            autoFocus
            className="rounded-md border-none px-3.5 py-1.5 font-sans text-[13px] font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
              boxShadow:
                "inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.25)",
            }}
          >
            이어서 쓰기 →
          </button>
        </div>
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
            </tbody>
          </table>
          <div className="mt-3.5 rounded-lg border border-border-token bg-surface px-3 py-2.5 font-sans text-[12px] leading-[1.6] tracking-[-0.005em] text-ink-muted">
            <strong className="font-semibold text-ink">규칙</strong> ·{" "}
            <code className="font-mono">{"> "}</code>는 callout 전용 (일반
            인용문 없음). · 헤더와 마커 뒤엔{" "}
            <strong className="font-semibold text-ink">공백 한 칸</strong>{" "}
            필수. · <code className="font-mono">{"<Callout>"}</code> 같은 JSX
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

