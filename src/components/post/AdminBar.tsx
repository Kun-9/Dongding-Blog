"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAdmin, useMounted } from "@/lib/hooks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Props {
  slug: string;
  title?: string;
  status?: "published" | "private" | "draft";
}

const STATUS_TONE = {
  published: {
    bg: "rgba(122,138,90,0.18)",
    fgLight: "#5a6b3a",
    fgDark: "#a8c08a",
    label: "PUBLISHED",
  },
  private: {
    bg: "rgba(140,140,140,0.18)",
    fgLight: "var(--ink-muted)",
    fgDark: "var(--ink-muted)",
    label: "PRIVATE",
  },
  draft: {
    bg: "rgba(168,129,74,0.16)",
    fgLight: "#7a5a2a",
    fgDark: "#d4a878",
    label: "DRAFT",
  },
} as const;

const btnBase =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border-token bg-transparent px-[11px] py-[5px] font-sans text-[12.5px] font-medium tracking-[-0.005em] transition-[border-color,color,background] duration-[120ms] hover:border-border-strong hover:text-ink";

type ToastKind = "ok" | "warn";
interface Toast {
  kind: ToastKind;
  text: string;
}

export function AdminBar({ slug, title, status = "published" }: Props) {
  const isAdmin = useAdmin();
  const mounted = useMounted();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  if (!isAdmin) return null;

  const isDark = mounted ? resolvedTheme === "dark" : false;
  const tone = STATUS_TONE[status];
  const deleteFg = isDark ? "#d99a8c" : "#a04a3a";

  const showToast = (kind: ToastKind, text: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ kind, text });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  };

  const onDuplicate = () => {
    showToast("ok", `복제 — 디자인 시안 단계, 추후 연결 예정`);
  };

  const onConfirmDelete = async () => {
    setDeleteOpen(false);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      showToast("warn", "삭제됨 — 잠시 후 목록으로 이동");
      window.setTimeout(() => router.push("/posts"), 1200);
    } catch (e) {
      showToast(
        "warn",
        `삭제 실패: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  return (
    <>
      <div
        className="relative mb-6 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-dashed border-border-token bg-surface-alt px-3.5 py-2.5"
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
            href={`/studio?slug=${encodeURIComponent(slug)}`}
            className={`${btnBase} text-ink-soft no-underline`}
          >
            ✎ 수정
          </Link>
          <button
            type="button"
            onClick={onDuplicate}
            className={`${btnBase} text-ink-soft`}
          >
            ⧉ 복제
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className={`${btnBase}`}
            style={{ color: deleteFg }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = isDark
                ? "#a35a4d"
                : "#c08070";
              e.currentTarget.style.background = isDark
                ? "rgba(163,90,77,0.10)"
                : "rgba(160,74,58,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.background = "transparent";
            }}
          >
            ⌫ 삭제
          </button>
        </div>

        {toast && <AdminToast kind={toast.kind} text={toast.text} isDark={isDark} />}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        tone="danger"
        title="이 글을 삭제할까요?"
        body={
          <>
            발행된 글을 삭제하면 외부 링크(소셜 공유, 검색 결과)에서{" "}
            <strong className="font-semibold text-ink">404</strong>가 납니다.
            잠깐 내려두려는 거라면{" "}
            <strong className="font-semibold text-ink">수정</strong>에서 공개
            범위를 비공개로 바꿀 수 있어요.
          </>
        }
        meta={
          <>
            {title && (
              <div className="mb-0.5 text-ink-muted">{title}</div>
            )}
            <div>/posts/{slug}</div>
          </>
        }
        confirmLabel="이 글 삭제"
        cancelLabel="그만두기"
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

function AdminToast({
  kind,
  text,
  isDark,
}: {
  kind: ToastKind;
  text: string;
  isDark: boolean;
}) {
  const palette =
    kind === "ok"
      ? {
          bg: isDark ? "#1d2419" : "#ecf1e8",
          fg: isDark ? "#bcd1a4" : "#324225",
          dot: "#7a8a5a",
        }
      : {
          bg: isDark ? "#2a2316" : "#f7eedb",
          fg: isDark ? "#e0c486" : "#5e4912",
          dot: "#9a7a23",
        };

  return (
    <div
      role="status"
      className="absolute -bottom-3.5 right-3.5 inline-flex items-center gap-2 rounded-full border border-border-token px-3 py-1.5 font-sans text-[12.5px] font-medium tracking-[-0.005em]"
      style={{
        background: palette.bg,
        color: palette.fg,
        boxShadow: isDark
          ? "0 4px 14px rgba(0,0,0,0.32)"
          : "0 4px 14px rgba(28,28,28,0.06)",
        animation: "admin-toast-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <style>{`
        @keyframes admin-toast-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: palette.dot,
          boxShadow: `0 0 0 3px ${palette.dot}22`,
        }}
      />
      {text}
    </div>
  );
}
