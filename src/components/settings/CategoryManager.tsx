"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/hooks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface CatNode {
  id: string;
  name: string;
  desc: string;
  subs: SubNode[];
}

export interface SubNode {
  id: string;
  name: string;
}

interface Stats {
  [catId: string]: { count: number; subs: { [subId: string]: number } };
}

interface Props {
  initial: CatNode[];
  onDirty?: (dirty: boolean) => void;
}

interface EditingTarget {
  catId: string;
  subId?: string;
}

interface PendingDelete {
  kind: "cat" | "sub";
  catId: string;
  subId?: string;
  name: string;
  count: number;
}

const ID_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function CategoryManager({ initial, onDirty }: Props) {
  const [cats, setCats] = useState<CatNode[]>(initial);
  const [baseline, setBaseline] = useState<CatNode[]>(initial);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initial.map((c) => c.id)),
  );
  const [stats, setStats] = useState<Stats>({});
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | { error: string }
  >("idle");
  const idCounterRef = useRef(0);
  const nextLocalId = (prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-new-${idCounterRef.current}`;
  };

  // Stats fetch (post counts).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories/stats")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ id: string; count?: number; subs?: Array<{ id: string; count?: number }> }>) => {
        if (cancelled) return;
        const next: Stats = {};
        for (const c of data) {
          const subs: { [k: string]: number } = {};
          for (const s of c.subs ?? []) subs[s.id] = s.count ?? 0;
          next[c.id] = { count: c.count ?? 0, subs };
        }
        setStats(next);
      })
      .catch(() => {
        /* leave stats empty on failure — counts show 0 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(() => {
    return JSON.stringify(cats) !== JSON.stringify(baseline);
  }, [cats, baseline]);

  useEffect(() => {
    onDirty?.(dirty);
  }, [dirty, onDirty]);

  const updateCat = (catId: string, patch: Partial<CatNode>) =>
    setCats((cs) => cs.map((c) => (c.id === catId ? { ...c, ...patch } : c)));

  const updateSub = (
    catId: string,
    subId: string,
    patch: Partial<SubNode>,
  ) =>
    setCats((cs) =>
      cs.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              subs: c.subs.map((s) =>
                s.id === subId ? { ...s, ...patch } : s,
              ),
            },
      ),
    );

  const moveCat = (catId: string, dir: -1 | 1) =>
    setCats((cs) => {
      const i = cs.findIndex((c) => c.id === catId);
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const next = cs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const moveSub = (catId: string, subId: string, dir: -1 | 1) =>
    setCats((cs) =>
      cs.map((c) => {
        if (c.id !== catId) return c;
        const i = c.subs.findIndex((s) => s.id === subId);
        const j = i + dir;
        if (j < 0 || j >= c.subs.length) return c;
        const subs = c.subs.slice();
        [subs[i], subs[j]] = [subs[j], subs[i]];
        return { ...c, subs };
      }),
    );

  const requestDeleteCat = (catId: string) => {
    const c = cats.find((x) => x.id === catId);
    if (!c) return;
    const count = stats[catId]?.count ?? 0;
    if (count > 0) {
      setPendingDelete({ kind: "cat", catId, name: c.name, count });
    } else {
      setCats((cs) => cs.filter((x) => x.id !== catId));
    }
  };

  const requestDeleteSub = (catId: string, subId: string) => {
    const c = cats.find((x) => x.id === catId);
    const s = c?.subs.find((x) => x.id === subId);
    if (!c || !s) return;
    const count = stats[catId]?.subs[subId] ?? 0;
    if (count > 0) {
      setPendingDelete({
        kind: "sub",
        catId,
        subId,
        name: `${c.name} / ${s.name}`,
        count,
      });
    } else {
      setCats((cs) =>
        cs.map((c) =>
          c.id !== catId
            ? c
            : { ...c, subs: c.subs.filter((s) => s.id !== subId) },
        ),
      );
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "cat") {
      setCats((cs) => cs.filter((x) => x.id !== pendingDelete.catId));
    } else {
      setCats((cs) =>
        cs.map((c) =>
          c.id !== pendingDelete.catId
            ? c
            : {
                ...c,
                subs: c.subs.filter((s) => s.id !== pendingDelete.subId),
              },
        ),
      );
    }
    setPendingDelete(null);
  };

  const addCat = () => {
    const id = nextLocalId("cat");
    setCats((cs) => [
      ...cs,
      { id, name: "새 카테고리", desc: "한 줄 설명", subs: [] },
    ]);
    setExpanded((s) => {
      const next = new Set(s);
      next.add(id);
      return next;
    });
    setEditing({ catId: id });
  };

  const addSub = (catId: string) => {
    const id = nextLocalId(catId);
    setCats((cs) =>
      cs.map((c) =>
        c.id !== catId
          ? c
          : { ...c, subs: [...c.subs, { id, name: "새 서브" }] },
      ),
    );
    setExpanded((s) => {
      const next = new Set(s);
      next.add(catId);
      return next;
    });
    setEditing({ catId, subId: id });
  };

  const toggleExpand = (catId: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });

  const save = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cats),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setBaseline(JSON.parse(JSON.stringify(cats)) as CatNode[]);
      setSaveStatus("saved");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setSaveStatus({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const totalSubs = cats.reduce((a, x) => a + x.subs.length, 0);
  const totalPosts = cats.reduce(
    (a, x) => a + (stats[x.id]?.count ?? 0),
    0,
  );

  return (
    <div className="flex flex-col">
      {/* Summary strip */}
      <div className="mb-1 flex gap-[18px] border-b border-dashed border-border-token px-0.5 pb-3.5 pt-1.5 font-mono text-[11.5px] text-ink-muted">
        <span>
          <span className="font-semibold text-ink-soft">{cats.length}</span>{" "}
          대분류
        </span>
        <span>
          <span className="font-semibold text-ink-soft">{totalSubs}</span> 서브
        </span>
        <span>
          <span className="font-semibold text-ink-soft">{totalPosts}</span> 글
          매핑됨
        </span>
      </div>

      <ul className="m-0 list-none p-0">
        {cats.map((cat, idx) => {
          const isOpen = expanded.has(cat.id);
          const isEditing =
            editing?.catId === cat.id && editing?.subId === undefined;
          return (
            <li
              key={cat.id}
              className={
                idx === 0 ? "" : "border-t border-border-token"
              }
            >
              <CatRow
                key={isEditing ? `${cat.id}:edit` : `${cat.id}:view`}
                kind="parent"
                isOpen={isOpen}
                isEditing={isEditing}
                idValue={cat.id}
                nameValue={cat.name}
                descValue={cat.desc}
                count={stats[cat.id]?.count ?? 0}
                onToggleExpand={() => toggleExpand(cat.id)}
                onStartEdit={() => setEditing({ catId: cat.id })}
                onCommit={(patch) => {
                  updateCat(cat.id, patch);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
                onUp={idx > 0 ? () => moveCat(cat.id, -1) : null}
                onDown={
                  idx < cats.length - 1 ? () => moveCat(cat.id, +1) : null
                }
                onDelete={() => requestDeleteCat(cat.id)}
                onAddSub={() => addSub(cat.id)}
              />
              {isOpen && cat.subs.length > 0 && (
                <ul className="m-0 list-none bg-surface-alt p-0">
                  {cat.subs.map((sub, sIdx) => {
                    const subEditing =
                      editing?.catId === cat.id && editing?.subId === sub.id;
                    return (
                      <li
                        key={sub.id}
                        className="border-t border-border-token"
                      >
                        <CatRow
                          key={
                            subEditing
                              ? `${cat.id}:${sub.id}:edit`
                              : `${cat.id}:${sub.id}:view`
                          }
                          kind="sub"
                          isEditing={subEditing}
                          idValue={sub.id}
                          nameValue={sub.name}
                          count={stats[cat.id]?.subs[sub.id] ?? 0}
                          onStartEdit={() =>
                            setEditing({ catId: cat.id, subId: sub.id })
                          }
                          onCommit={(patch) => {
                            updateSub(cat.id, sub.id, patch);
                            setEditing(null);
                          }}
                          onCancel={() => setEditing(null)}
                          onUp={
                            sIdx > 0
                              ? () => moveSub(cat.id, sub.id, -1)
                              : null
                          }
                          onDown={
                            sIdx < cat.subs.length - 1
                              ? () => moveSub(cat.id, sub.id, +1)
                              : null
                          }
                          onDelete={() => requestDeleteSub(cat.id, sub.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              {isOpen && cat.subs.length === 0 && (
                <div className="border-t border-dashed border-border-token bg-surface-alt py-2.5 pl-11 pr-4 text-xs italic text-ink-muted">
                  서브카테고리 없음 — 위{" "}
                  <span className="font-mono text-ink-soft">+ 서브</span>{" "}
                  버튼으로 추가
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={addCat}
        className="mt-3 self-start rounded-md border border-dashed border-border-token bg-transparent px-3 py-2 font-sans text-[12.5px] font-medium tracking-[-0.005em] text-ink-soft transition-[border-color,color] duration-[150ms] hover:border-border-strong hover:text-ink"
      >
        ＋ 새 카테고리 추가
      </button>

      <p className="mt-3 text-xs leading-[1.55] text-ink-muted">
        ID는 URL 슬러그에 그대로 들어갑니다. 글이 매핑된 카테고리는 삭제 시
        한번 더 확인합니다.
      </p>

      {/* Save bar (separate from site.json save) */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border-token bg-surface-alt px-3 py-2">
        <CatStatusLine status={saveStatus} dirty={dirty} />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saveStatus === "saving"}
          className="rounded-md border border-transparent px-3 py-1.5 font-sans text-[12.5px] font-semibold disabled:opacity-50"
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
            cursor:
              !dirty || saveStatus === "saving" ? "not-allowed" : "pointer",
          }}
        >
          {saveStatus === "saving" ? "저장 중…" : "카테고리 저장"}
        </button>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title={
          pendingDelete?.kind === "cat"
            ? "이 카테고리를 삭제할까요?"
            : "이 서브카테고리를 삭제할까요?"
        }
        body={
          pendingDelete && (
            <>
              <strong className="font-semibold text-ink">
                {pendingDelete.count}개
              </strong>
              의 글이 이 카테고리에 매핑되어 있어요. 삭제해도 글 자체는 남지만,
              해당 글의 카테고리 표시가 깨집니다.
            </>
          )
        }
        meta={pendingDelete?.name}
        confirmLabel="그래도 삭제"
        cancelLabel="그만두기"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function CatStatusLine({
  status,
  dirty,
}: {
  status: "idle" | "saving" | "saved" | { error: string };
  dirty: boolean;
}) {
  if (typeof status === "object") {
    return (
      <span className="font-mono text-[11.5px] text-[#c95642]">
        ✗ {status.error}
      </span>
    );
  }
  if (status === "saving") {
    return (
      <span className="font-mono text-[11.5px] text-ink-muted">저장 중…</span>
    );
  }
  if (status === "saved") {
    return (
      <span className="font-mono text-[11.5px] text-[#5d8a66]">
        ✓ 저장됨 — 곧 새로고침됩니다
      </span>
    );
  }
  return (
    <span className="font-mono text-[11.5px] text-ink-muted">
      {dirty
        ? "● 변경됨 — 저장하지 않은 카테고리 변경이 있습니다"
        : "변경사항 없음"}
    </span>
  );
}

interface CatRowProps {
  kind: "parent" | "sub";
  isOpen?: boolean;
  isEditing: boolean;
  idValue: string;
  nameValue: string;
  descValue?: string;
  count: number;
  onToggleExpand?: () => void;
  onStartEdit: () => void;
  onCommit: (patch: { id: string; name: string; desc?: string }) => void;
  onCancel: () => void;
  onUp: (() => void) | null;
  onDown: (() => void) | null;
  onDelete: () => void;
  onAddSub?: () => void;
}

function CatRow({
  kind,
  isOpen,
  isEditing,
  idValue,
  nameValue,
  descValue,
  count,
  onToggleExpand,
  onStartEdit,
  onCommit,
  onCancel,
  onUp,
  onDown,
  onDelete,
  onAddSub,
}: CatRowProps) {
  const isParent = kind === "parent";
  const [hover, setHover] = useState(false);
  // Drafts are seeded from the *current* values when this component mounts.
  // The parent passes a different `key` per (rowId, isEditing) so React tears
  // this down and re-mounts on edit-mode entry — that's the reset.
  const [draftName, setDraftName] = useState(nameValue);
  const [draftDesc, setDraftDesc] = useState(descValue ?? "");
  const [draftId, setDraftId] = useState(idValue);
  const [idError, setIdError] = useState<string | null>(null);

  const commit = () => {
    const id = draftId.trim();
    if (id && !ID_RE.test(id)) {
      setIdError("영소문자/숫자/하이픈만");
      return;
    }
    const patch: { id: string; name: string; desc?: string } = {
      id: id || idValue,
      name: draftName.trim() || nameValue,
    };
    if (isParent) patch.desc = draftDesc.trim();
    onCommit(patch);
  };

  const rowStyle: CSSProperties = {
    background: isEditing ? "rgba(122,138,90,0.05)" : "transparent",
    minHeight: isParent ? 48 : 36,
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={
        "grid items-center gap-2.5 transition-[background] duration-[120ms] " +
        (isParent ? "py-3 pl-3.5 pr-3" : "py-1.5 pl-11 pr-3")
      }
      style={{
        ...rowStyle,
        gridTemplateColumns:
          "24px minmax(0, 1.1fr) minmax(0, 1.4fr) minmax(220px, auto)",
      }}
    >
      {/* Col 1 */}
      {isParent ? (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={isOpen ? "접기" : "펼치기"}
          className="inline-flex h-[22px] w-[22px] items-center justify-center rounded border-none bg-transparent p-0 font-mono text-[11px] text-ink-muted transition-transform duration-[120ms] hover:text-ink"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </button>
      ) : (
        <span className="text-center font-mono text-[11px] text-ink-muted opacity-60">
          └
        </span>
      )}

      {/* Col 2: name + id */}
      {isEditing ? (
        <div className="flex flex-col gap-1">
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") onCancel();
            }}
            className="rounded border border-border-strong bg-bg px-2 py-[5px] font-sans tracking-[-0.01em] text-ink outline-none"
            style={{
              fontSize: isParent ? 14 : 13,
              fontWeight: isParent ? 600 : 500,
            }}
          />
          <div className="flex items-center gap-1">
            <span className="font-mono text-[11px] text-ink-muted">id:</span>
            <input
              value={draftId}
              onChange={(e) => {
                setDraftId(e.target.value.replace(/[^a-z0-9-]/g, ""));
                setIdError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") onCancel();
              }}
              className="flex-1 rounded border border-border-token bg-bg px-1.5 py-[3px] font-mono text-[11.5px] text-ink-soft outline-none"
            />
            {idError && (
              <span className="font-mono text-[10.5px] text-[#c95642]">
                {idError}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-0.5">
          <button
            type="button"
            onClick={onStartEdit}
            className="cursor-text overflow-hidden text-ellipsis whitespace-nowrap border-none bg-transparent p-0 text-left font-sans tracking-[-0.01em] text-ink"
            style={{
              fontSize: isParent ? 14 : 13,
              fontWeight: isParent ? 600 : 500,
            }}
          >
            {nameValue}
          </button>
          <code className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10.5px] text-ink-muted">
            /{idValue}
          </code>
        </div>
      )}

      {/* Col 3: desc (parent only) */}
      {isParent ? (
        isEditing ? (
          <input
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            placeholder="한 줄 설명"
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") onCancel();
            }}
            className="self-center rounded border border-border-token bg-bg px-2 py-1.5 font-sans text-[12.5px] tracking-[-0.005em] text-ink outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={onStartEdit}
            className="cursor-text overflow-hidden text-ellipsis whitespace-nowrap border-none bg-transparent p-0 text-left font-sans text-[12.5px] leading-[1.4] tracking-[-0.005em] text-ink-soft"
            style={{
              opacity: descValue ? 1 : 0.5,
              fontStyle: descValue ? "normal" : "italic",
            }}
          >
            {descValue || "설명 추가…"}
          </button>
        )
      ) : (
        <span />
      )}

      {/* Col 4: count + actions */}
      <div className="flex items-center justify-end gap-1.5">
        <span
          className="inline-block min-w-[28px] whitespace-nowrap rounded-full border border-border-token text-center font-mono text-[11px] font-semibold tabular-nums"
          style={{
            padding: "2px 8px",
            background:
              count > 0 ? "rgba(122,138,90,0.10)" : "var(--surface-alt)",
            color: count > 0 ? "var(--ink-soft)" : "var(--ink-muted)",
          }}
        >
          {count}
        </span>

        <div
          className="flex gap-0.5 transition-opacity duration-[120ms]"
          style={{
            opacity: hover || isEditing ? 1 : 0,
            pointerEvents: hover || isEditing ? "auto" : "none",
          }}
        >
          {isEditing ? (
            <>
              <IconBtn onClick={commit} title="저장 (Enter)" tone="ok">
                ✓
              </IconBtn>
              <IconBtn onClick={onCancel} title="취소 (Esc)">
                ✕
              </IconBtn>
            </>
          ) : (
            <>
              {isParent && onAddSub && (
                <IconBtn onClick={onAddSub} title="서브카테고리 추가" wide>
                  ＋ 서브
                </IconBtn>
              )}
              <IconBtn
                onClick={onUp ?? undefined}
                title="위로"
                disabled={!onUp}
              >
                ↑
              </IconBtn>
              <IconBtn
                onClick={onDown ?? undefined}
                title="아래로"
                disabled={!onDown}
              >
                ↓
              </IconBtn>
              <IconBtn onClick={onStartEdit} title="이름·ID 편집">
                ✎
              </IconBtn>
              <IconBtn onClick={onDelete} title="삭제" tone="danger">
                🗑
              </IconBtn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface IconBtnProps {
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  tone?: "danger" | "warn" | "ok";
  wide?: boolean;
}

function IconBtn({
  onClick,
  title,
  children,
  disabled,
  tone,
  wide,
}: IconBtnProps) {
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const [hov, setHov] = useState(false);

  const palette = (() => {
    if (tone === "danger")
      return {
        hov: isDark ? "rgba(168,93,93,0.18)" : "rgba(168,77,77,0.10)",
        col: isDark ? "#d8a8a8" : "#8a4d4d",
      };
    if (tone === "warn")
      return { hov: "rgba(196,148,72,0.14)", col: "#a07a35" };
    if (tone === "ok") return { hov: "rgba(122,138,90,0.16)", col: "#5d6e3f" };
    return null;
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="inline-flex h-[26px] items-center justify-center rounded-[5px] whitespace-nowrap transition-[background,color,border-color] duration-[100ms]"
      style={{
        minWidth: wide ? 0 : 26,
        padding: wide ? "0 8px" : 0,
        border: `1px solid ${
          hov && !disabled ? "var(--border-strong)" : "transparent"
        }`,
        background: disabled
          ? "transparent"
          : hov
            ? palette
              ? palette.hov
              : "var(--hover)"
            : "transparent",
        color: disabled
          ? "var(--ink-muted)"
          : palette && hov
            ? palette.col
            : "var(--ink-soft)",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: wide ? "var(--font-sans)" : "var(--font-mono)",
        fontSize: wide ? 11.5 : 12,
        fontWeight: wide ? 600 : 500,
        letterSpacing: wide ? "-0.005em" : 0,
      }}
    >
      {children}
    </button>
  );
}
