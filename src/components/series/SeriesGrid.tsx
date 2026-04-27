"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/lib/hooks";
import type { Series } from "@/lib/types";

const ADMIN_ACCENT_DELETE = { light: "#a04a3a", dark: "#d99a8c" };
const PALETTE = ["#7a8a5a", "#a8814a", "#5a7480", "#8a7355", "#6a5a8a"];

function seriesCategoryHref(id: string): string {
  if (id.startsWith("jpa") || id.startsWith("mysql")) return "/category/db";
  if (id.startsWith("tx")) return "/category/spring";
  return "/category/system";
}

export function SeriesGrid({ series }: { series: Series[] }) {
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
              새 시리즈
            </button>
          )}
        </div>
      )}

      {isAdmin && creating && <SeriesEditor onClose={() => setCreating(false)} />}

      <div className="grid grid-cols-1 gap-3.5 pb-16 sm:grid-cols-2">
        {series.map((s) => (
          <SeriesCard key={s.id} s={s} isAdmin={isAdmin} />
        ))}
      </div>
    </>
  );
}

function SeriesCard({ s, isAdmin }: { s: Series; isAdmin: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative"
    >
      <Link
        href={seriesCategoryHref(s.id)}
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
            {s.posts.length}/{s.count} 발행됨
          </div>
        </div>
        <div>
          <div className="mb-1.5 font-sans text-[22px] font-semibold tracking-[-0.025em] text-ink">
            {s.title}
          </div>
          <div className="text-sm leading-[1.6] text-ink-soft">{s.desc}</div>
        </div>
        <div className="mt-auto flex gap-1">
          {Array.from({ length: s.count }).map((_, i) => (
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

      {isAdmin && hover && (
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
          <HoverBtn title="수정">✎</HoverBtn>
          <HoverBtn title="순서 변경">⇅</HoverBtn>
          <HoverBtn title="삭제" danger>
            ⌫
          </HoverBtn>
        </div>
      )}
    </div>
  );
}

function HoverBtn({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[5px] border-none bg-transparent p-0 text-[13px]"
      style={{
        color: danger ? ADMIN_ACCENT_DELETE.light : "var(--ink-soft)",
      }}
    >
      {children}
    </button>
  );
}

function SeriesEditor({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [id, setId] = useState("");
  const [desc, setDesc] = useState("");
  const [count, setCount] = useState(5);
  const [color, setColor] = useState(PALETTE[0]);

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
          새 시리즈
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
            className={`${inp} font-mono text-[13px]`}
            style={{ background: "var(--bg)" }}
          />
        </label>
        <label>
          <div className={lbl}>목표 편수</div>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            min={1}
            max={20}
            className={inp}
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
          onClick={onClose}
          className="rounded-md border-none px-3.5 py-[7px] font-sans text-[13px] font-semibold"
          style={{ background: "var(--ink)", color: "var(--bg)" }}
        >
          시리즈 생성
        </button>
      </div>
    </div>
  );
}
