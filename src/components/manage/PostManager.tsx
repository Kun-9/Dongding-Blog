"use client";

/**
 * 글 관리 목록 — 발행·비공개·검토·초안을 한 목록에 두고 상태 탭으로 가른다.
 *
 * 표가 아니라 제목 + 요약 + 메타 2단 구조다. 좁은 화면에서 열을 접지 않아도
 * 성립하고, 발행글은 조회수를 초안은 자수·묵힘 일수를 같은 자리에 쓴다.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api-routes";
import { fmtDate } from "@/lib/tokens";
import { categoryLabelIn, categoryIdsFor } from "@/lib/category-utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ToastBanner, type Toast } from "@/components/ui/ToastBanner";
import type { ManageRow } from "@/lib/manage";
import type { Category, Visibility } from "@/lib/types";

/** 초안을 이만큼 안 건드리면 묵은 것으로 본다. */
const STALE_DAYS = 30;

const STATUS: Record<Visibility, { label: string; glyph: string }> = {
  published: { label: "발행", glyph: "●" },
  private: { label: "비공개", glyph: "◑" },
  review: { label: "검토", glyph: "◐" },
  draft: { label: "초안", glyph: "○" },
};

const STATUS_TABS: (Visibility | "all")[] = [
  "all",
  "published",
  "review",
  "draft",
  "private",
];

const SORTS = [
  ["recent", "최근순"],
  ["old", "오래된 순"],
  ["views", "조회순"],
] as const;
type Sort = (typeof SORTS)[number][0];

function isUnpublished(s: Visibility) {
  return s === "draft" || s === "review";
}

function daysSince(iso: string): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000));
}

export function PostManager({
  rows: initialRows,
  categories,
  preset,
}: {
  rows: ManageRow[];
  categories: Category[];
  preset: Visibility | "all";
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [status, setStatus] = useState<Visibility | "all">(preset);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<ManageRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const count = (k: Visibility | "all") =>
    k === "all" ? rows.length : rows.filter((r) => r.status === k).length;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const catIds = cat === "all" ? null : categoryIdsFor(categories, cat);
    const f = rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!catIds || catIds.has(r.category)) &&
        (!needle ||
          `${r.title} ${r.summary}`.toLowerCase().includes(needle)),
    );
    const cmp: Record<Sort, (a: ManageRow, b: ManageRow) => number> = {
      recent: (a, b) => b.date.localeCompare(a.date),
      old: (a, b) => a.date.localeCompare(b.date),
      views: (a, b) => b.views - a.views || b.date.localeCompare(a.date),
    };
    return [...f].sort(cmp[sort]);
  }, [rows, status, cat, q, sort, categories]);

  const selRows = shown.filter((r) => sel.has(r.slug));
  const allShownSelected = shown.length > 0 && selRows.length === shown.length;

  const toggle = (slug: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  const toggleAll = () =>
    setSel(allShownSelected ? new Set() : new Set(shown.map((r) => r.slug)));

  /**
   * 벌크는 클라이언트 루프다 — 한 번에 옮기는 건 많아야 수십 건이라 배치
   * 엔드포인트를 따로 팔 이유가 없다. 실패한 건만 세서 알린다.
   */
  const applyStatus = async (targets: ManageRow[], to: Visibility) => {
    if (busy || targets.length === 0) return;
    setBusy(true);
    const results = await Promise.all(
      targets.map((r) =>
        fetch(API.post(r.slug), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: to }),
        })
          .then((res) => (res.ok ? r.slug : null))
          .catch(() => null),
      ),
    );
    const ok = new Set(results.filter((s): s is string => s !== null));
    setRows((prev) =>
      prev.map((r) => (ok.has(r.slug) ? { ...r, status: to } : r)),
    );
    setSel(new Set());
    setBusy(false);
    const failed = targets.length - ok.size;
    setToast(
      failed === 0
        ? { kind: "success", message: `${ok.size}편을 ${STATUS[to].label}으로 옮겼습니다.` }
        : { kind: "error", message: `${failed}편을 옮기지 못했습니다.` },
    );
    router.refresh();
  };

  const removeRows = async (targets: ManageRow[]) => {
    if (busy || targets.length === 0) return;
    setBusy(true);
    const results = await Promise.all(
      targets.map((r) =>
        fetch(API.post(r.slug), { method: "DELETE" })
          .then((res) => (res.ok ? r.slug : null))
          .catch(() => null),
      ),
    );
    const ok = new Set(results.filter((s): s is string => s !== null));
    setRows((prev) => prev.filter((r) => !ok.has(r.slug)));
    setSel(new Set());
    setBusy(false);
    const failed = targets.length - ok.size;
    setToast(
      failed === 0
        ? { kind: "success", message: `${ok.size}편을 삭제했습니다.` }
        : { kind: "error", message: `${failed}편을 삭제하지 못했습니다.` },
    );
    router.refresh();
  };

  const seg = (active: boolean) =>
    [
      "cursor-pointer whitespace-nowrap rounded-md border-0 px-[11px] py-[5px] font-sans text-xs tracking-[-0.005em]",
      active
        ? "bg-surface-alt font-semibold text-ink"
        : "bg-transparent font-medium text-ink-muted hover:text-ink",
    ].join(" ");
  const segWrap =
    "flex flex-wrap gap-0.5 rounded-lg border border-border-token bg-surface p-0.5";

  return (
    <>
      {/* Toolbar */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className={segWrap}>
          {STATUS_TABS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setStatus(k);
                setSel(new Set());
              }}
              className={seg(status === k)}
            >
              {k === "all" ? "전체" : STATUS[k].label}{" "}
              <span className="font-mono text-[11px] opacity-70">
                {count(k)}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·요약 검색"
            className="w-[190px] rounded-lg border border-border-token bg-surface px-[11px] py-[7px] font-sans text-[12.5px] tracking-[-0.005em] text-ink outline-none"
          />
          <div className={segWrap}>
            {SORTS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className={seg(sort === k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {[{ id: "all", name: "모든 분류" }, ...categories].map((x) => {
          const active = cat === x.id;
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setCat(x.id)}
              className={[
                "cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-1 font-sans text-xs tracking-[-0.005em]",
                active
                  ? "border-border-strong bg-surface-alt font-semibold text-ink"
                  : "border-border-token bg-transparent font-medium text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {x.name}
            </button>
          );
        })}
      </div>

      {/* List header / bulk bar */}
      <div className="flex min-h-[38px] items-center gap-3 border-b border-border-token pb-[9px] pl-2 pr-3">
        <Check checked={allShownSelected} onClick={toggleAll} />
        {selRows.length === 0 ? (
          <div className="font-mono text-[11.5px] tabular-nums text-ink-muted">
            {shown.length}편
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-[12.5px] font-semibold text-ink">
              {selRows.length}편 선택됨
            </span>
            <Action onClick={() => applyStatus(selRows, "published")} disabled={busy}>
              발행
            </Action>
            <Action onClick={() => applyStatus(selRows, "private")} disabled={busy}>
              비공개
            </Action>
            <Action onClick={() => applyStatus(selRows, "review")} disabled={busy}>
              검토
            </Action>
            <Action danger onClick={() => setAsk(selRows)} disabled={busy}>
              삭제
            </Action>
            <button
              type="button"
              onClick={() => setSel(new Set())}
              className="cursor-pointer border-0 bg-transparent font-sans text-xs text-ink-muted"
            >
              선택 해제
            </button>
          </div>
        )}
      </div>

      {shown.length === 0 && (
        <div className="px-5 py-14 text-center text-sm leading-[1.7] text-ink-muted">
          이 조건에 맞는 글이 없습니다.
          <br />
          <span className="font-mono text-xs">필터를 하나 풀어 보세요.</span>
        </div>
      )}

      <ul className="m-0 list-none p-0 pb-16">
        {shown.map((r) => (
          <Row
            key={r.slug}
            row={r}
            categories={categories}
            selected={sel.has(r.slug)}
            busy={busy}
            onToggle={() => toggle(r.slug)}
            onStatus={(to) => applyStatus([r], to)}
            onDelete={() => setAsk([r])}
          />
        ))}
      </ul>

      <ConfirmDialog
        open={ask !== null}
        tone="danger"
        title={
          ask && ask.length > 1
            ? `${ask.length}편을 삭제할까요?`
            : "이 글을 삭제할까요?"
        }
        body="삭제한 글은 되돌릴 수 없습니다. 확신이 없다면 비공개로 내려 두는 편이 안전합니다."
        meta={
          ask &&
          (ask.length > 1 ? (
            <span>
              {ask.slice(0, 3).map((r) => r.title).join(" · ")}
              {ask.length > 3 ? ` 외 ${ask.length - 3}편` : ""}
            </span>
          ) : (
            <span>
              {ask[0].title} · /posts/{ask[0].slug}
            </span>
          ))
        }
        confirmLabel="삭제"
        cancelLabel="그만두기"
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          const targets = ask ?? [];
          setAsk(null);
          void removeRows(targets);
        }}
      />

      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </>
  );
}

function Row({
  row,
  categories,
  selected,
  busy,
  onToggle,
  onStatus,
  onDelete,
}: {
  row: ManageRow;
  categories: Category[];
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
  onStatus: (to: Visibility) => void;
  onDelete: () => void;
}) {
  const st = STATUS[row.status];
  const unpublished = isUnpublished(row.status);
  const days = daysSince(row.date);
  const stale = unpublished && days > STALE_DAYS;
  const href = unpublished
    ? `/studio?slug=${encodeURIComponent(row.slug)}`
    : `/posts/${row.slug}`;

  return (
    <li className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-3 border-b border-border-token py-3.5 pl-2 pr-3 transition-colors hover:bg-hover max-[680px]:grid-cols-[18px_minmax(0,1fr)]">
      <div className="pt-[3px]">
        <Check checked={selected} onClick={onToggle} />
      </div>

      <Link href={href} className="min-w-0 no-underline">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            title={st.label}
            className={[
              "font-mono text-[11px]",
              row.status === "published" ? "text-ink-soft" : "text-inline-code",
            ].join(" ")}
          >
            {st.glyph}
          </span>
          <span className="font-sans text-base font-semibold leading-[1.35] tracking-[-0.02em] text-ink">
            {row.title}
          </span>
          {row.status !== "published" && (
            <span className="rounded bg-inline-code-bg px-[7px] py-0.5 font-mono text-[10px] font-bold tracking-[0.05em] text-inline-code">
              {st.label}
            </span>
          )}
        </div>
        <p className="m-0 mt-[5px] line-clamp-1 text-[13.5px] leading-[1.6] text-ink-soft">
          {row.summary}
        </p>
        <div className="mt-[7px] flex flex-wrap gap-2.5 font-mono text-[11px] tabular-nums text-ink-muted">
          <span>{categoryLabelIn(categories, row.category)}</span>
          {unpublished ? (
            <span>{row.words.toLocaleString()}자</span>
          ) : (
            <span>{row.readTime}분</span>
          )}
          <span>
            {unpublished ? "수정" : "발행"} {fmtDate(row.date)}
          </span>
          {!unpublished && <span>조회 {row.views.toLocaleString()}</span>}
          {!unpublished && <span>♡ {row.likes}</span>}
          {unpublished && (
            <span className={stale ? "text-inline-code" : undefined}>{days}일째</span>
          )}
        </div>
      </Link>

      <div className="flex gap-1 pt-0.5 max-[680px]:col-start-2 max-[680px]:justify-start max-[680px]:pt-2.5">
        <Action
          onClick={() =>
            (window.location.href = `/studio?slug=${encodeURIComponent(row.slug)}`)
          }
          disabled={busy}
        >
          {unpublished ? "이어쓰기" : "수정"}
        </Action>
        {row.status === "published" ? (
          <Action onClick={() => onStatus("private")} disabled={busy}>
            비공개
          </Action>
        ) : (
          <Action onClick={() => onStatus("published")} disabled={busy}>
            발행
          </Action>
        )}
        <Action danger onClick={onDelete} disabled={busy}>
          삭제
        </Action>
      </div>
    </li>
  );
}

function Check({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      aria-label={checked ? "선택 해제" : "선택"}
      className={[
        "inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border p-0 text-[10px] leading-none",
        checked
          ? "border-ink bg-ink text-bg"
          : "border-border-strong bg-transparent",
      ].join(" ")}
    >
      {checked ? "✓" : ""}
    </button>
  );
}

function Action({
  onClick,
  children,
  danger,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "cursor-pointer whitespace-nowrap rounded-md border border-border-token bg-bg px-[9px] py-1 font-sans text-[11.5px] font-medium tracking-[-0.005em] disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "text-danger" : "text-ink-soft",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
