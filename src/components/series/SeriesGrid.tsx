"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdmin } from "@/lib/hooks";
import type { Series, SeriesWithPosts } from "@/lib/types";

const ADMIN_ACCENT_DELETE = { light: "#a04a3a", dark: "#d99a8c" };
const PALETTE = ["#7a8a5a", "#a8814a", "#5a7480", "#8a7355", "#6a5a8a"];
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

type EditorMode =
  | { kind: "create" }
  | { kind: "edit"; existing: Series };

export function SeriesGrid({ series }: { series: SeriesWithPosts[] }) {
  const router = useRouter();
  const isAdmin = useAdmin();
  const [editor, setEditor] = useState<EditorMode | null>(null);

  const close = () => setEditor(null);
  const refresh = () => router.refresh();

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
              새 시리즈
            </button>
          )}
        </div>
      )}

      {isAdmin && editor && (
        <SeriesEditor
          mode={editor}
          existingIds={series.map((s) => s.id)}
          onClose={close}
          onSaved={() => {
            close();
            refresh();
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-3.5 pb-16 sm:grid-cols-2">
        {series.map((s) => (
          <SeriesCard
            key={s.id}
            s={s}
            isAdmin={isAdmin}
            onEdit={() => setEditor({ kind: "edit", existing: s })}
            onDeleted={refresh}
          />
        ))}
      </div>
    </>
  );
}

function SeriesCard({
  s,
  isAdmin,
  onEdit,
  onDeleted,
}: {
  s: SeriesWithPosts;
  isAdmin: boolean;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = Math.max(s.count, s.posts.length);

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/series/${encodeURIComponent(s.id)}/`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      setConfirming(false);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative"
    >
      <Link
        href={`/series/${s.id}`}
        className="flex min-h-[200px] flex-col gap-3.5 rounded-xl border border-border-token bg-surface p-5 no-underline transition-[border-color,transform] duration-200 hover:border-border-strong hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between">
          <div
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] font-mono text-[11px] font-bold tracking-[0.02em] text-white opacity-85"
            style={{ background: s.color }}
          >
            {s.count}편
          </div>
          <div className="whitespace-nowrap font-mono text-[11px] text-ink-muted">
            {s.posts.length}/{total} 발행됨
          </div>
        </div>
        <div>
          <div className="mb-1.5 font-sans text-[22px] font-semibold tracking-[-0.025em] text-ink">
            {s.title}
          </div>
          <div className="text-sm leading-[1.6] text-ink-soft">{s.desc}</div>
        </div>
        <div className="mt-auto flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-sm"
              style={{
                background:
                  i < s.posts.length ? s.color : "var(--surface-alt)",
              }}
            />
          ))}
        </div>
      </Link>

      {isAdmin && hover && !confirming && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="absolute right-2.5 top-2.5 flex gap-1 rounded-[7px] border border-border-token p-[3px]"
          style={{
            background: "var(--bg)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <HoverBtn title="수정" onClick={onEdit}>
            ✎
          </HoverBtn>
          <HoverBtn
            title="삭제"
            danger
            onClick={() => {
              setConfirming(true);
              setError("");
            }}
          >
            ⌫
          </HoverBtn>
        </div>
      )}

      {isAdmin && confirming && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="absolute right-2.5 top-2.5 flex flex-col gap-1.5 rounded-md border border-border-token p-2"
          style={{
            background: "var(--bg)",
            boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
          }}
        >
          <div className="font-sans text-[11.5px] text-ink-soft">
            {s.posts.length > 0
              ? `${s.posts.length}개 글의 시리즈 표시는 사라지지만 글은 유지됩니다.`
              : "정말 삭제할까요?"}
          </div>
          {error && (
            <div className="font-sans text-[11px] text-[#a04a3a]">{error}</div>
          )}
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-[5px] border border-border-token bg-transparent px-2 py-1 font-sans text-[11.5px] text-ink-soft"
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="rounded-[5px] border-none px-2 py-1 font-sans text-[11.5px] font-semibold text-white"
              style={{ background: ADMIN_ACCENT_DELETE.light }}
            >
              {busy ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HoverBtn({
  title,
  children,
  danger,
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[5px] border-none bg-transparent p-0 text-[13px]"
      style={{
        color: danger ? ADMIN_ACCENT_DELETE.light : "var(--ink-soft)",
      }}
    >
      {children}
    </button>
  );
}

function SeriesEditor({
  mode,
  existingIds,
  onClose,
  onSaved,
}: {
  mode: EditorMode;
  existingIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial =
    mode.kind === "edit" ? mode.existing : null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [id, setId] = useState(initial?.id ?? "");
  const [desc, setDesc] = useState(initial?.desc ?? "");
  const [count, setCount] = useState(initial?.count ?? 5);
  const [color, setColor] = useState(initial?.color ?? PALETTE[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const inp =
    "w-full rounded-md border border-border-token px-[11px] py-2 font-sans text-[14px] tracking-[-0.005em] text-ink outline-none";
  const lbl =
    "mb-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted";

  const idClash =
    mode.kind === "create" && existingIds.includes(id);

  const canSubmit =
    !submitting &&
    SLUG_RE.test(id) &&
    !idClash &&
    title.trim().length > 0 &&
    desc.trim().length > 0 &&
    count > 0;

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (mode.kind === "create") {
        const res = await fetch("/api/series/", {
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
      } else {
        const res = await fetch(
          `/api/series/${encodeURIComponent(mode.existing.id)}/`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, desc, count, color }),
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `HTTP ${res.status}`,
          );
        }
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

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
          {mode.kind === "create" ? "새 시리즈" : "시리즈 수정"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="border-none bg-transparent text-lg leading-none text-ink-muted"
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <div className={lbl}>제목</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 동시성 제대로 보기"
            className={inp}
            style={{ background: "var(--bg)" }}
          />
        </label>
        <label>
          <div className={lbl}>ID (링크용)</div>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="concurrency"
            disabled={mode.kind === "edit"}
            className={`${inp} font-mono text-[13px] disabled:opacity-60`}
            style={{ background: "var(--bg)" }}
          />
          {idClash && (
            <div className="mt-1 font-sans text-[11px] text-[#a04a3a]">
              이미 존재하는 id
            </div>
          )}
        </label>
        <label>
          <div className={lbl}>목표 편수</div>
          <input
            type="text"
            inputMode="numeric"
            value={count > 0 ? String(count) : ""}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ""));
              setCount(Number.isFinite(n) ? n : 0);
            }}
            placeholder="예: 5"
            className={`${inp} font-mono text-[13.5px]`}
            style={{ background: "var(--bg)" }}
          />
        </label>
        <label className="sm:col-span-2">
          <div className={lbl}>설명</div>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            placeholder="한 문장으로 이 시리즈가 무엇을 다루는지."
            className={`${inp} min-h-[60px] leading-[1.6]`}
            style={{ background: "var(--bg)", resize: "vertical" }}
          />
        </label>
        <label>
          <div className={lbl}>테마 컬러</div>
          <div className="flex gap-1.5">
            {PALETTE.map((co) => (
              <button
                key={co}
                type="button"
                onClick={() => setColor(co)}
                className="h-7 w-7 cursor-pointer rounded-full p-0"
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
      {error && (
        <div className="mt-3 font-sans text-[12px] text-[#a04a3a]">
          {error}
        </div>
      )}
      <div className="mt-[18px] flex justify-end gap-2 border-t border-border-token pt-3.5">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md border border-border-token bg-transparent px-3.5 py-[7px] font-sans text-[13px] font-medium text-ink-soft"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-md border-none px-3.5 py-[7px] font-sans text-[13px] font-semibold disabled:opacity-50"
          style={{ background: "var(--ink)", color: "var(--bg)" }}
        >
          {submitting
            ? "저장 중…"
            : mode.kind === "create"
              ? "시리즈 생성"
              : "변경 저장"}
        </button>
      </div>
    </div>
  );
}
