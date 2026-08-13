"use client";

/**
 * 설정 화면 공용 폼 조각. `/settings` 와 `/settings/cards` 가 같은 것을 쓴다 —
 * 한쪽에 복사해 두면 여백이나 테두리가 페이지마다 조금씩 달라진다.
 */
import type { ChangeEvent, ReactNode } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | { error: string };

export function Card({
  id,
  title,
  source,
  children,
}: {
  id: string;
  title: string;
  source: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="mb-4 rounded-xl border border-border-token bg-surface px-[22px] py-5"
      style={{ scrollMarginTop: 80 }}
    >
      <div className="mb-3.5 border-b border-border-token pb-3.5">
        <h2 className="m-0 font-sans text-[17px] font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        <p className="mt-1 font-mono text-[12px] leading-[1.55] text-ink-muted">
          {source}
        </p>
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

export function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3.5 max-[680px]:grid-cols-1 max-[680px]:items-start max-[680px]:gap-1.5">
      <label className="whitespace-nowrap font-sans text-[13px] font-medium tracking-[-0.01em] text-ink-soft">
        {label}
      </label>
      <div>{children}</div>
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  prefix,
  mono,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <div
      className="flex items-stretch overflow-hidden rounded-md border border-border-token"
      style={{ background: "var(--bg)" }}
    >
      {prefix && (
        <span className="whitespace-nowrap border-r border-border-token bg-surface-alt px-2.5 py-[7px] font-mono text-[12.5px] text-ink-muted">
          {prefix}
        </span>
      )}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="flex-1 border-none bg-transparent px-2.5 py-[7px] tracking-[-0.005em] text-ink outline-none"
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          fontSize: mono ? 13 : 13.5,
        }}
      />
    </div>
  );
}

export function Textarea({
  value,
  onChange,
  hint,
  rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <textarea
        value={value}
        rows={rows}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          onChange(e.target.value)
        }
        className="w-full rounded-md border border-border-token px-2.5 py-2 font-sans text-[13.5px] leading-[1.55] tracking-[-0.005em] text-ink outline-none"
        style={{ resize: "vertical", background: "var(--bg)" }}
      />
      {hint && (
        <div className="mt-1 text-right font-mono text-[11px] text-ink-muted">
          {hint}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-md border border-border-token bg-surface-alt p-0.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`cursor-pointer rounded-[5px] border-none px-2.5 py-1 font-sans text-[12px] font-medium transition-colors ${
            v === value
              ? "bg-surface text-ink shadow-sm"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function StatusLine({
  status,
  dirty,
}: {
  status: SaveStatus;
  dirty: boolean;
}) {
  if (typeof status === "object") {
    return (
      <span className="font-mono text-[12px] text-[#c95642]">
        ✗ {status.error}
      </span>
    );
  }
  if (status === "saving") {
    return <span className="font-mono text-[12px] text-ink-muted">저장 중…</span>;
  }
  if (status === "saved") {
    return (
      <span className="font-mono text-[12px] text-[#5d8a66]">
        ✓ 저장됨 — 페이지가 곧 새로고침됩니다
      </span>
    );
  }
  return (
    <span className="font-mono text-[12px] text-ink-muted">
      {dirty ? "● 변경됨 — 저장하지 않은 내용이 있습니다" : "변경사항 없음"}
    </span>
  );
}

/** 되돌리기 + 저장. 두 설정 페이지가 같은 자리에 같은 모양으로 붙인다. */
export function SaveBar({
  status,
  dirty,
  onReset,
  onSave,
}: {
  status: SaveStatus;
  dirty: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="sticky bottom-3 z-30 mt-6 flex items-center justify-between gap-3 rounded-xl border border-border-token bg-surface px-4 py-3 shadow-lg max-[680px]:flex-col max-[680px]:items-stretch"
      style={{ backdropFilter: "saturate(160%) blur(8px)" }}
    >
      <StatusLine status={status} dirty={dirty} />
      <div className="flex gap-2 max-[680px]:[&>button]:flex-1">
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty || status === "saving"}
          className="cursor-pointer rounded-md border border-border-token bg-transparent px-3 py-1.5 font-sans text-[12.5px] font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40 max-[680px]:min-h-[40px]"
        >
          되돌리기
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || status === "saving"}
          className="rounded-md border border-transparent px-3.5 py-1.5 font-sans text-[12.5px] font-semibold disabled:opacity-50 max-[680px]:min-h-[40px]"
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
            cursor: !dirty || status === "saving" ? "not-allowed" : "pointer",
          }}
        >
          {status === "saving" ? "저장 중…" : "변경사항 저장"}
        </button>
      </div>
    </div>
  );
}
