"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useAdmin, useMounted } from "@/lib/hooks";

interface Props {
  slug: string;
  status?: "published" | "draft";
}

const STATUS_TONE = {
  published: {
    bg: "rgba(122,138,90,0.18)",
    fgLight: "#5a6b3a",
    fgDark: "#a8c08a",
    label: "PUBLISHED",
  },
  draft: {
    bg: "rgba(168,129,74,0.16)",
    fgLight: "#7a5a2a",
    fgDark: "#d4a878",
    label: "DRAFT",
  },
} as const;

const btnBase =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border-token bg-transparent px-[11px] py-[5px] font-sans text-[12.5px] font-medium tracking-[-0.005em] transition-[border-color,color] duration-[120ms] hover:border-border-strong hover:text-ink";

export function AdminBar({ slug, status = "published" }: Props) {
  const isAdmin = useAdmin();
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const [confirming, setConfirming] = useState(false);

  if (!isAdmin) return null;

  const isDark = mounted ? resolvedTheme === "dark" : false;
  const tone = STATUS_TONE[status];
  const deleteFg = isDark ? "#d99a8c" : "#a04a3a";
  const deleteConfirmBg = isDark ? "#7a3a30" : "#a04a3a";

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-dashed border-border-token bg-surface-alt px-3.5 py-2.5"
    >
      {/* Local mode badge */}
      <div className="inline-flex items-center gap-2 border-r border-border-token pr-2.5">
        <span
          className="h-[7px] w-[7px] rounded-full"
          style={{
            background: "#7a8a5a",
            boxShadow: "0 0 0 3px rgba(122,138,90,0.18)",
          }}
        />
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Local · Admin
        </span>
      </div>

      {/* Slug + status */}
      <div className="inline-flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-mono text-xs text-ink-muted">
          /posts/{slug}
        </span>
        <span
          className="whitespace-nowrap rounded font-sans text-[10.5px] font-bold tracking-[0.04em]"
          style={{
            padding: "1.5px 6px",
            background: tone.bg,
            color: isDark ? tone.fgDark : tone.fgLight,
          }}
        >
          {tone.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <Link
          href="/studio"
          className={`${btnBase} text-ink-soft no-underline`}
        >
          ✎ 수정
        </Link>
        <button type="button" className={`${btnBase} text-ink-soft`}>
          ⧉ 복제
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`${btnBase}`}
            style={{ color: deleteFg }}
          >
            ⌫ 삭제
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="whitespace-nowrap text-xs text-ink-soft">
              정말?
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-[11px] py-[5px] font-sans text-[12.5px] font-medium text-white"
              style={{ background: deleteConfirmBg }}
            >
              삭제
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={`${btnBase} text-ink-soft`}
            >
              취소
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
