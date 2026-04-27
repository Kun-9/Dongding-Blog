"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/hooks";
import { fmtDate } from "@/lib/tokens";
import type { Bookmark } from "@/lib/types";

const TAG_OPTIONS = ["system", "db", "spring", "kafka", "jvm", "observability"];
const ADMIN_DELETE = "#a04a3a";

export function BookmarkList({ items }: { items: Bookmark[] }) {
  const isAdmin = useAdmin();
  const [creating, setCreating] = useState(false);

  return (
    <>
      {isAdmin && (
        <div className="mb-6 flex justify-end">
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-none px-[13px] py-[7px] pl-[11px] font-sans text-[13px] font-semibold tracking-[-0.005em]"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
            >
              <span className="text-[14px] font-normal leading-none">＋</span>
              링크 추가
            </button>
          )}
        </div>
      )}

      {isAdmin && creating && (
        <BookmarkEditor onClose={() => setCreating(false)} />
      )}

      <ul className="m-0 list-none p-0">
        {items.map((b, i) => (
          <BookmarkRow key={b.url} b={b} isFirst={i === 0} isAdmin={isAdmin} />
        ))}
      </ul>
      <div className="h-16" />
    </>
  );
}

function BookmarkRow({
  b,
  isFirst,
  isAdmin,
}: {
  b: Bookmark;
  isFirst: boolean;
  isAdmin: boolean;
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
            className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[5px] border-none bg-transparent p-0 text-[13px] text-ink-soft"
          >
            ✎
          </button>
          <button
            type="button"
            title="삭제"
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

function BookmarkEditor({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState(TAG_OPTIONS[0]);
  const [note, setNote] = useState("");

  const inp =
    "w-full rounded-md border border-border-token px-[11px] py-2 font-sans text-[14px] tracking-[-0.005em] text-ink outline-none";
  const lbl =
    "mb-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted";

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
          링크 추가
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
          <div className={lbl}>URL</div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="자동 채움 또는 수동 입력"
            className={inp}
            style={{ background: "var(--bg)" }}
          />
        </label>
        <label>
          <div className={lbl}>출처</div>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
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
          className="rounded-md border border-border-token bg-transparent px-3.5 py-[7px] font-sans text-[13px] font-medium text-ink-soft"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border-none px-3.5 py-[7px] font-sans text-[13px] font-semibold"
          style={{ background: "var(--ink)", color: "var(--bg)" }}
        >
          추가
        </button>
      </div>
    </div>
  );
}
