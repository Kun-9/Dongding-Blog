"use client";

import { useMemo, useState } from "react";
import { API } from "@/lib/api-routes";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Collapse } from "@/components/releases/Collapse";
import type { SourceRow } from "@/lib/release-queue";

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

interface Props {
  initial: SourceRow[];
  collectEnabled: boolean;
}

export function SourceManager({ initial, collectEnabled }: Props) {
  const [sources, setSources] = useState(initial);
  /** 마지막으로 저장된 상태. 바뀐 것을 세고, 켜짐/꺼짐 묶음을 가르는 기준이다. */
  const [saved, setSaved] = useState(initial);
  const [enabled, setEnabled] = useState(collectEnabled);
  const [draft, setDraft] = useState("");
  const [showOff, setShowOff] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SourceRow | null>(null);
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "collecting" | { error: string }
  >("idle");

  // 묶음은 저장된 상태로 가른다. 스위치를 누를 때마다 행이 반대편 묶음으로
  // 튀어 가면 무엇을 눌렀는지 놓친다 — 저장하고 나서야 자리를 옮긴다.
  const savedOn = useMemo(
    () => new Set(saved.filter((s) => s.enabled).map((s) => s.repo)),
    [saved],
  );
  const savedRepos = useMemo(() => new Set(saved.map((s) => s.repo)), [saved]);
  const on = sources.filter((s) => savedOn.has(s.repo) || !savedRepos.has(s.repo));
  const off = sources.filter((s) => savedRepos.has(s.repo) && !savedOn.has(s.repo));

  const changed = sources.filter((s) => {
    const before = saved.find((b) => b.repo === s.repo);
    return !before || before.enabled !== s.enabled;
  }).length;
  const activeCount = sources.filter((s) => s.enabled).length;

  function add() {
    const repo = draft.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    if (!REPO_RE.test(repo)) {
      setStatus({ error: "owner/name 형식으로 적어주세요" });
      return;
    }
    if (sources.some((s) => s.repo === repo)) {
      setStatus({ error: "이미 추적 중입니다" });
      return;
    }
    setSources((s) => [...s, { repo, enabled: true, count: 0 }]);
    setDraft("");
    setStatus("idle");
  }

  function flip(repo: string) {
    setSources((rs) => rs.map((r) => (r.repo === repo ? { ...r, enabled: !r.enabled } : r)));
    setStatus("idle");
  }

  async function save(next = sources, nextEnabled = enabled) {
    setStatus("saving");
    try {
      const res = await fetch(API.releaseSources, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          collectEnabled: nextEnabled,
          sources: next.map((s) => ({ repo: s.repo, enabled: s.enabled })),
        }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        setStatus({ error: msg.error ?? `저장 실패 (${res.status})` });
        return;
      }
      setSaved(next);
      setStatus("saved");
    } catch {
      setStatus({ error: "저장 실패" });
    }
  }

  async function collectNow() {
    setStatus("collecting");
    try {
      const res = await fetch(API.releaseCollect, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ error: body.error ?? `수집 실패 (${res.status})` });
        return;
      }
      if (body.skipped) {
        setStatus({ error: body.skipped });
        return;
      }
      // 새 글감이 목록에 반영되려면 서버 컴포넌트를 다시 그려야 한다.
      window.location.reload();
    } catch {
      setStatus({ error: "수집 실패" });
    }
  }

  const rowProps = (s: SourceRow) => ({
    source: s,
    dirty: saved.find((b) => b.repo === s.repo)?.enabled !== s.enabled,
    onFlip: () => flip(s.repo),
    onDelete: () => setPendingDelete(s),
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Sources
          </div>
          <h2 className="m-0 font-sans text-[20px] font-semibold tracking-[-0.02em] text-ink">
            추적 레포
          </h2>
          <p className="m-0 mt-1 text-[13px] text-ink-muted">
            <span className="font-mono tabular-nums text-ink-soft">{activeCount}</span>
            <span className="font-mono tabular-nums"> / {sources.length}</span>곳에서 매일 수집합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border-token bg-surface py-1.5 pl-3 pr-1.5 font-sans text-[13px] text-ink-soft">
            자동 수집
            <Switch
              on={enabled}
              onChange={() => {
                const next = !enabled;
                setEnabled(next);
                void save(sources, next);
              }}
              label="자동 수집"
            />
          </label>
          <button
            type="button"
            onClick={collectNow}
            disabled={status === "collecting"}
            className="rounded-full bg-ink px-3.5 py-1.5 font-sans text-[13px] font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {status === "collecting" ? "수집 중…" : "지금 수집"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-token bg-surface">
        {/* 추가 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="flex items-center gap-2 border-b border-border-token px-3 py-2 sm:px-4"
        >
          <span aria-hidden className="font-mono text-[14px] text-ink-subtle">
            +
          </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="owner/name 또는 GitHub 주소"
            className="min-w-0 flex-1 bg-transparent py-1 font-mono text-[13px] text-ink outline-none placeholder:text-ink-subtle"
          />
          {draft.trim() && (
            <button
              type="submit"
              className="topic-rise shrink-0 rounded-full bg-ink px-3 py-1 font-sans text-[12px] font-medium text-bg"
            >
              추가
            </button>
          )}
        </form>

        {/* 켜진 레포 */}
        <div className="px-1.5 py-1.5">
          <div className="px-2.5 pb-1 pt-1.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            수집 중 {on.length}
          </div>
          {on.length === 0 ? (
            <p className="m-0 px-2.5 py-3 text-[13px] text-ink-muted">켜진 레포가 없습니다.</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 p-0 sm:grid-cols-2">
              {on.map((s) => (
                <SourceItem key={s.repo} {...rowProps(s)} />
              ))}
            </ul>
          )}
        </div>

        {/* 꺼진 레포 — 접어 둔다 */}
        {off.length > 0 && (
          <div className="border-t border-border-token">
            <button
              type="button"
              onClick={() => setShowOff((v) => !v)}
              aria-expanded={showOff}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-[12.5px] text-ink-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <span
                aria-hidden
                className={`text-[9px] transition-transform duration-200 ${showOff ? "rotate-90" : ""}`}
              >
                ▶
              </span>
              꺼진 레포 {off.length}
              <span className="ml-auto truncate text-[11.5px] text-ink-subtle">
                글감 {off.reduce((n, s) => n + s.count, 0)}건 보관 중
              </span>
            </button>
            <Collapse open={showOff}>
              <ul className="m-0 grid list-none grid-cols-1 px-1.5 pb-1.5 sm:grid-cols-2">
                {off.map((s) => (
                  <SourceItem key={s.repo} {...rowProps(s)} />
                ))}
              </ul>
            </Collapse>
          </div>
        )}
      </div>

      {/* 저장 바 — 바뀐 게 있을 때만 */}
      <Collapse open={changed > 0 || status === "saved" || typeof status === "object"}>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border-token bg-surface px-4 py-2.5">
          {changed > 0 ? (
            <>
              <span className="text-[13px] text-ink-soft">
                변경 <span className="font-mono tabular-nums">{changed}</span>건
              </span>
              <button
                type="button"
                onClick={() => {
                  setSources(saved);
                  setStatus("idle");
                }}
                className="ml-auto font-sans text-[12.5px] text-ink-muted transition-colors hover:text-ink"
              >
                되돌리기
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={status === "saving"}
                className="rounded-full bg-ink px-3.5 py-1.5 font-sans text-[12.5px] font-semibold text-bg disabled:opacity-40"
              >
                {status === "saving" ? "저장 중…" : "저장"}
              </button>
            </>
          ) : typeof status === "object" ? (
            <span className="text-[13px] text-danger">{status.error}</span>
          ) : (
            <span className="text-[13px] text-ink-muted">저장했습니다.</span>
          )}
        </div>
      </Collapse>
      {changed > 0 && typeof status === "object" && (
        <p className="m-0 mt-2 text-[13px] text-danger">{status.error}</p>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title={`${pendingDelete?.repo} 를 추적 목록에서 지울까요?`}
        body={
          pendingDelete && pendingDelete.count > 0
            ? `이 레포의 글감 ${pendingDelete.count}건도 같이 지워집니다. 잠시 멈추려는 것이라면 삭제 대신 꺼 두세요.`
            : "수집 대상에서 빠집니다."
        }
        confirmLabel="지우기"
        onConfirm={() => {
          const next = sources.filter((s) => s.repo !== pendingDelete?.repo);
          setSources(next);
          setPendingDelete(null);
          void save(next);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}

function SourceItem({
  source: s,
  dirty,
  onFlip,
  onDelete,
}: {
  source: SourceRow;
  dirty: boolean;
  onFlip: () => void;
  onDelete: () => void;
}) {
  const [owner, name] = s.repo.split("/");
  return (
    <li className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-hover">
      <Switch on={s.enabled} onChange={onFlip} label={`${s.repo} 수집`} />
      <a
        href={`https://github.com/${s.repo}/releases`}
        target="_blank"
        rel="noreferrer"
        className={`min-w-0 flex-1 truncate font-sans text-[13.5px] no-underline transition-colors ${
          s.enabled ? "" : "opacity-60"
        }`}
      >
        <span className="text-ink-muted">{owner}/</span>
        <span className="font-semibold text-ink">{name}</span>
      </a>
      {dirty && (
        <span
          aria-label="저장 안 됨"
          title="저장 안 됨"
          className="topic-rise size-1.5 shrink-0 rounded-full bg-[var(--callout-warning-glyph)]"
        />
      )}
      <span
        title="보관 중인 글감"
        className={`shrink-0 font-mono text-[11.5px] tabular-nums ${s.count ? "text-ink-muted" : "text-ink-subtle"}`}
      >
        {s.count}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`${s.repo} 삭제`}
        className="touch-always shrink-0 text-[12px] text-ink-subtle transition-[opacity,color] hover:text-danger sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
      >
        ✕
      </button>
    </li>
  );
}

/** 작은 스위치. 손잡이가 미끄러지듯 옮겨 간다. */
function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
      className={`relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full transition-colors duration-200 ${
        on ? "bg-ink" : "bg-border-strong"
      }`}
    >
      <span
        className={`absolute left-[2px] size-[14px] rounded-full bg-bg shadow-sm transition-transform duration-200 ease-out ${
          on ? "translate-x-[12px]" : ""
        }`}
      />
    </button>
  );
}
