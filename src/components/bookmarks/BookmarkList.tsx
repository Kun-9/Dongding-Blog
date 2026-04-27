"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/lib/hooks";
import { fmtDate } from "@/lib/tokens";
import type { Bookmark } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const TAG_OPTIONS = ["system", "db", "spring", "kafka", "jvm", "observability"];
const ADMIN_DELETE = "#a04a3a";

type EditorState =
  | { kind: "create" }
  | { kind: "edit"; item: Bookmark }
  | null;

type Patch =
  | { kind: "add"; item: Bookmark }
  | { kind: "update"; item: Bookmark }
  | { kind: "delete"; id: number };

function sortByDateDesc(items: Bookmark[]): Bookmark[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

function applyPatches(items: Bookmark[], patches: Patch[]): Bookmark[] {
  let next = items;
  for (const p of patches) {
    if (p.kind === "add") {
      if (!next.some((x) => x.id === p.item.id)) next = [p.item, ...next];
    } else if (p.kind === "update") {
      next = next.map((x) => (x.id === p.item.id ? p.item : x));
    } else {
      next = next.filter((x) => x.id !== p.id);
    }
  }
  return sortByDateDesc(next);
}

export function BookmarkList({ items }: { items: Bookmark[] }) {
  const isAdmin = useAdmin();
  const router = useRouter();
  // Optimistic patches layered on top of the latest server-rendered `items`.
  // Each patch self-expires once the server-rendered list reflects it,
  // computed inline during render — no setState-in-effect needed.
  const [patches, setPatches] = useState<Patch[]>([]);
  const visiblePatches = useMemo(
    () =>
      patches.filter((p) => {
        if (p.kind === "add") return !items.some((x) => x.id === p.item.id);
        if (p.kind === "update") {
          const cur = items.find((x) => x.id === p.item.id);
          return !cur || JSON.stringify(cur) !== JSON.stringify(p.item);
        }
        return items.some((x) => x.id === p.id);
      }),
    [items, patches],
  );
  const list = useMemo(
    () => applyPatches(sortByDateDesc(items), visiblePatches),
    [items, visiblePatches],
  );
  const [editor, setEditor] = useState<EditorState>(null);
  const [pendingDelete, setPendingDelete] = useState<Bookmark | null>(null);

  function handleCreated(b: Bookmark) {
    setPatches((cur) => [...cur, { kind: "add", item: b }]);
    setEditor(null);
    router.refresh();
  }

  function handleUpdated(b: Bookmark) {
    setPatches((cur) => [...cur, { kind: "update", item: b }]);
    setEditor(null);
    router.refresh();
  }

  async function handleDelete(b: Bookmark) {
    setPendingDelete(null);
    setPatches((cur) => [...cur, { kind: "delete", id: b.id }]);
    try {
      const res = await fetch(`/api/bookmarks/${b.id}`, { method: "DELETE" });
      if (!res.ok) {
        setPatches((cur) => cur.filter((p) => !(p.kind === "delete" && p.id === b.id)));
        return;
      }
      router.refresh();
    } catch {
      setPatches((cur) => cur.filter((p) => !(p.kind === "delete" && p.id === b.id)));
    }
  }

  return (
    <>
      {isAdmin && (
        <div className="mb-6 flex justify-end">
          {editor === null && (
            <button
              type="button"
              onClick={() => setEditor({ kind: "create" })}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-none px-[13px] py-[7px] pl-[11px] font-sans text-[13px] font-semibold tracking-[-0.005em]"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
            >
              <span className="text-[14px] font-normal leading-none">＋</span>
              링크 추가
            </button>
          )}
        </div>
      )}

      {isAdmin && editor?.kind === "create" && (
        <BookmarkEditor
          mode="create"
          onClose={() => setEditor(null)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}

      <ul className="m-0 list-none p-0">
        {list.map((b, i) => {
          const isEditing =
            editor?.kind === "edit" && editor.item.id === b.id;
          if (isEditing) {
            return (
              <li key={`edit-${b.id}`} className="py-5">
                <BookmarkEditor
                  mode="edit"
                  initial={b}
                  onClose={() => setEditor(null)}
                  onCreated={handleCreated}
                  onUpdated={handleUpdated}
                />
              </li>
            );
          }
          return (
            <BookmarkRow
              key={b.id}
              b={b}
              isFirst={i === 0}
              isAdmin={isAdmin}
              onEdit={() => setEditor({ kind: "edit", item: b })}
              onDelete={() => setPendingDelete(b)}
            />
          );
        })}
      </ul>
      <div className="h-16" />

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title="링크를 삭제하시겠습니까?"
        body="삭제한 항목은 복구할 수 없습니다."
        meta={pendingDelete?.title}
        confirmLabel="삭제"
        onConfirm={() => {
          if (pendingDelete) handleDelete(pendingDelete);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

function BookmarkRow({
  b,
  isFirst,
  isAdmin,
  onEdit,
  onDelete,
}: {
  b: Bookmark;
  isFirst: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <li
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative grid grid-cols-[90px_1fr] gap-[18px] py-5"
      style={{ borderTop: isFirst ? "none" : "1px solid var(--border)" }}
    >
      <div className="pt-0.5">
        <div className="font-mono text-[11px] tabular-nums text-ink-muted">
          {fmtDate(b.date)}
        </div>
        <div className="mt-1">
          <span className="rounded border border-border-token bg-surface-alt px-1.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
            {b.tag}
          </span>
        </div>
      </div>
      <div>
        <a
          href={`https://${b.url}`}
          target="_blank"
          rel="noopener"
          className="font-sans text-[17px] font-semibold leading-[1.35] tracking-[-0.02em] text-ink no-underline"
        >
          {b.title}
          <span className="ml-1 text-[13px] text-ink-muted">↗</span>
        </a>
        <div className="mt-0.5 font-mono text-xs text-ink-muted">
          {b.source} · {b.url}
        </div>
        <p
          className="mt-2.5 pl-3 text-sm leading-[1.7] text-ink-soft"
          style={{ borderLeft: "2px solid var(--border)" }}
        >
          {b.note}
        </p>
      </div>

      {isAdmin && hover && (
        <div
          className="absolute right-0 top-3.5 flex gap-1 rounded-[7px] border border-border-token p-[3px]"
          style={{
            background: "var(--bg)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <button
            type="button"
            title="수정"
            onClick={onEdit}
            className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[5px] border-none bg-transparent p-0 text-[13px] text-ink-soft"
          >
            ✎
          </button>
          <button
            type="button"
            title="삭제"
            onClick={onDelete}
            className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[5px] border-none bg-transparent p-0 text-[13px]"
            style={{ color: ADMIN_DELETE }}
          >
            ⌫
          </button>
        </div>
      )}
    </li>
  );
}

interface EditorProps {
  mode: "create" | "edit";
  initial?: Bookmark;
  onClose: () => void;
  onCreated: (b: Bookmark) => void;
  onUpdated: (b: Bookmark) => void;
}

function BookmarkEditor({
  mode,
  initial,
  onClose,
  onCreated,
  onUpdated,
}: EditorProps) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [tag, setTag] = useState(initial?.tag ?? TAG_OPTIONS[0]);
  const [note, setNote] = useState(initial?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleTouched = useRef(initial?.title ? true : false);
  const sourceTouched = useRef(initial?.source ? true : false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSeq = useRef(0);

  const inp =
    "w-full rounded-md border border-border-token px-[11px] py-2 font-sans text-[14px] tracking-[-0.005em] text-ink outline-none";
  const lbl =
    "mb-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted";

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  function schedulePreview(nextUrl: string) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const trimmed = nextUrl.trim();
    if (!trimmed) return;
    const seq = ++previewSeq.current;
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/bookmarks/preview?url=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { title?: string; source?: string };
        if (seq !== previewSeq.current) return;
        if (!titleTouched.current && data.title) setTitle(data.title);
        if (!sourceTouched.current && data.source) setSource(data.source);
      } catch {
        // Silent — preview is best-effort.
      }
    }, 800);
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        url: url.trim(),
        title: title.trim(),
        source: source.trim(),
        tag,
        note,
      };
      const endpoint =
        mode === "edit" && initial
          ? `/api/bookmarks/${initial.id}`
          : "/api/bookmarks";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        setError("이미 등록된 URL입니다");
        return;
      }
      if (res.status === 400 || res.status === 422) {
        setError("입력값을 확인해주세요");
        return;
      }
      if (!res.ok) {
        setError("저장에 실패했습니다");
        return;
      }
      const saved = (await res.json()) as Bookmark;
      if (mode === "edit") onUpdated(saved);
      else onCreated(saved);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const heading = mode === "edit" ? "링크 수정" : "링크 추가";
  const submitLabel = mode === "edit" ? "저장" : "추가";

  return (
    <div
      className="mb-6 rounded-xl border border-border-token p-[22px]"
      style={{
        background: "var(--surface)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      }}
    >
      <div className="mb-[18px] flex items-center justify-between">
        <h3 className="m-0 font-sans text-[17px] font-semibold tracking-[-0.02em] text-ink">
          {heading}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="border-none bg-transparent text-lg leading-none text-ink-muted"
        >
          ×
        </button>
      </div>
      {error && (
        <div
          className="mb-3 rounded-md px-3 py-2 font-sans text-[13px]"
          style={{
            background: "rgba(160,74,58,0.08)",
            color: "#a04a3a",
          }}
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <div className={lbl}>URL</div>
          <input
            value={url}
            onChange={(e) => {
              const v = e.target.value;
              setUrl(v);
              schedulePreview(v);
            }}
            placeholder="https://example.com/article"
            className={`${inp} font-mono text-[13px]`}
            style={{ background: "var(--bg)" }}
          />
          <div className="mt-1.5 font-mono text-[11px] text-ink-muted">
            제목·출처는 og:tag에서 자동 파싱됩니다.
          </div>
        </label>
        <label>
          <div className={lbl}>제목</div>
          <input
            value={title}
            onChange={(e) => {
              titleTouched.current = true;
              setTitle(e.target.value);
            }}
            placeholder="자동 채움 또는 수동 입력"
            className={inp}
            style={{ background: "var(--bg)" }}
          />
        </label>
        <label>
          <div className={lbl}>출처</div>
          <input
            value={source}
            onChange={(e) => {
              sourceTouched.current = true;
              setSource(e.target.value);
            }}
            placeholder="Martin Fowler"
            className={inp}
            style={{ background: "var(--bg)" }}
          />
        </label>
        <label>
          <div className={lbl}>태그</div>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className={inp}
            style={{ background: "var(--bg)" }}
          >
            {TAG_OPTIONS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <div className={lbl}>내 메모</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="이 글이 왜 좋았는지 한·두 문장으로."
            className={`${inp} min-h-[80px] leading-[1.7]`}
            style={{ background: "var(--bg)", resize: "vertical" }}
          />
        </label>
      </div>
      <div className="mt-[18px] flex justify-end gap-2 border-t border-border-token pt-3.5">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-md border border-border-token bg-transparent px-3.5 py-[7px] font-sans text-[13px] font-medium text-ink-soft"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="rounded-md border-none px-3.5 py-[7px] font-sans text-[13px] font-semibold"
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "저장 중..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
