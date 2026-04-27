"use client";

/**
 * Settings — dev-only editor for `src/lib/site.json` plus a localStorage-
 * backed editor preferences pane. The /api/settings PUT route persists the
 * site-wide form; comments (Giscus) stays read-only because it is configured
 * via .env. Production builds short-circuit to <DevOnlyNotice />.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { site } from "@/lib/site";
import siteJson from "@/lib/site.json";
import categoriesJson from "@/lib/categories.json";
import { DevOnlyNotice } from "@/components/layout/DevOnlyNotice";
import { safeWriteJSON } from "@/lib/storage";
import {
  CategoryManager,
  type CatNode,
} from "@/components/settings/CategoryManager";

const isDev = process.env.NODE_ENV === "development";

const giscus = {
  repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
  repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
  category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
  categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
};
const giscusOn = Boolean(
  giscus.repo && giscus.repoId && giscus.category && giscus.categoryId,
);
const urlEnvOverride = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

const PREFS_KEY = "dongding:editor-prefs";
const PREFS_CHANGE = "dongding:prefs-change";

interface EditorPrefs {
  autoSaveSec: number;
  notifyOnComment: boolean;
}

const DEFAULT_PREFS: EditorPrefs = {
  autoSaveSec: 8,
  notifyOnComment: true,
};

function subscribePrefs(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PREFS_CHANGE, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PREFS_CHANGE, callback);
    window.removeEventListener("storage", callback);
  };
}

function getRawPrefs(): string {
  return window.localStorage.getItem(PREFS_KEY) ?? "";
}

function getServerRawPrefs(): string {
  return "";
}

function parsePrefs(raw: string): EditorPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<EditorPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

const SECTIONS: ReadonlyArray<readonly [string, string]> = [
  ["profile", "프로필"],
  ["social", "소셜 링크"],
  ["categories", "카테고리"],
  ["comments", "댓글"],
  ["seo", "SEO · 메타"],
  ["publish", "발행"],
  ["editor", "에디터"],
];

type SiteData = typeof siteJson;
type SaveStatus = "idle" | "saving" | "saved" | { error: string };

export default function Page() {
  if (!isDev) return <DevOnlyNotice page="설정" />;
  return <SettingsView />;
}

function SettingsView() {
  const [form, setForm] = useState<SiteData>(siteJson);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const initial = JSON.stringify(siteJson);
  const current = JSON.stringify(form);
  const dirty = current !== initial;
  const displayStatus: SaveStatus =
    status === "saved" && dirty ? "idle" : status;

  const set = <K extends keyof SiteData>(key: K, value: SiteData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const setSocial = <K extends keyof SiteData["social"]>(
    key: K,
    value: SiteData["social"][K],
  ) =>
    setForm((prev) => ({
      ...prev,
      social: { ...prev.social, [key]: value },
    }));
  const setOg = <K extends keyof SiteData["og"]>(
    key: K,
    value: SiteData["og"][K],
  ) => setForm((prev) => ({ ...prev, og: { ...prev.og, [key]: value } }));
  const setPublish = <K extends keyof SiteData["publish"]>(
    key: K,
    value: SiteData["publish"][K],
  ) =>
    setForm((prev) => ({
      ...prev,
      publish: { ...prev.publish, [key]: value },
    }));

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setStatus("saved");
    } catch (e) {
      setStatus({ error: e instanceof Error ? e.message : String(e) });
    }
  };

  const reset = () => {
    setForm(siteJson);
    setStatus("idle");
  };

  return (
    <main className="mx-auto grid max-w-[1080px] grid-cols-[200px_1fr] gap-8 px-8 pb-16 pt-10">
      {/* Side nav */}
      <aside className="sticky top-20 self-start">
        <div className="mb-3.5 whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          SETTINGS
        </div>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {SECTIONS.map(([id, lbl]) => (
            <li key={id}>
              <a
                href={`#settings-${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(`settings-${id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="block whitespace-nowrap rounded-md px-2.5 py-1.5 font-sans text-[13.5px] font-medium tracking-[-0.01em] text-ink-soft no-underline hover:bg-hover"
              >
                {lbl}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-border-token pt-4">
          <a
            href="/admin"
            className="whitespace-nowrap text-[12.5px] text-ink-muted no-underline"
          >
            ← 대시보드
          </a>
        </div>
      </aside>

      {/* Content */}
      <div>
        <header className="mb-7">
          <h1 className="m-0 font-sans text-[36px] font-semibold tracking-[-0.03em] text-ink">
            설정
          </h1>
          <p className="mt-2 text-sm leading-[1.6] text-ink-muted">
            글로벌 값은{" "}
            <code className="rounded bg-surface-alt px-1 py-px font-mono text-[12px]">
              src/lib/site.json
            </code>
            에 저장됩니다. 저장하면 자동으로 페이지가 다시 로드되고, git diff로
            변경 내용을 확인 후 commit·push하면 배포에 반영됩니다.
          </p>
        </header>

        {/* PROFILE */}
        <Card id="settings-profile" title="프로필" source="site.json">
          <Row label="핸들">
            <TextInput
              value={form.handle}
              onChange={(v) => set("handle", v)}
              prefix="@"
              mono
            />
          </Row>
          <Row label="이름">
            <TextInput
              value={form.author}
              onChange={(v) => set("author", v)}
            />
          </Row>
          <Row label="짧은 소개">
            <TextInput value={form.bio} onChange={(v) => set("bio", v)} />
          </Row>
          <Row label="introduction">
            <TextInput
              value={form.intro}
              onChange={(v) => set("intro", v)}
            />
          </Row>
        </Card>

        {/* SOCIAL */}
        <Card
          id="settings-social"
          title="소셜 링크"
          source="site.json → social"
        >
          <Row label="GitHub">
            <TextInput
              value={form.social.github}
              onChange={(v) => setSocial("github", v)}
              mono
            />
          </Row>
          <Row label="Email">
            <TextInput
              value={form.social.email}
              onChange={(v) => setSocial("email", v)}
              mono
            />
          </Row>
          <Row label="RSS">
            <TextInput
              value={form.social.rss}
              onChange={(v) => setSocial("rss", v)}
              mono
            />
          </Row>
        </Card>

        {/* CATEGORIES — categories.json */}
        <Card
          id="settings-categories"
          title="카테고리"
          source="src/lib/categories.json"
        >
          <p className="mb-2 text-[12.5px] leading-[1.55] text-ink-muted">
            대분류 + 서브카테고리 트리. 헤더 메뉴와{" "}
            <code className="rounded bg-surface-alt px-1 py-px font-mono text-[11.5px]">
              /category/[id]
            </code>
            {" "}라우팅에 직결됩니다. 글이 매핑된 카테고리는 삭제 시 한번 더
            확인합니다.
          </p>
          <CategoryManager initial={categoriesJson as CatNode[]} />
        </Card>

        {/* COMMENTS — env-driven, read-only */}
        <Card
          id="settings-comments"
          title="댓글 (Giscus)"
          source="환경변수 NEXT_PUBLIC_GISCUS_* (.env.local) — 읽기 전용"
        >
          <Row label="상태">
            <Pill on={giscusOn}>
              {giscusOn ? "on · env 설정 완료" : "off · env 미설정"}
            </Pill>
          </Row>
          <Row label="저장소">
            <ReadOnly mono empty={!giscus.repo}>
              {giscus.repo ?? "—"}
            </ReadOnly>
          </Row>
          <Row label="Repo ID">
            <ReadOnly mono empty={!giscus.repoId}>
              {giscus.repoId ?? "—"}
            </ReadOnly>
          </Row>
          <Row label="카테고리">
            <ReadOnly mono empty={!giscus.category}>
              {giscus.category ?? "—"}
            </ReadOnly>
          </Row>
          <Row label="Category ID">
            <ReadOnly mono empty={!giscus.categoryId}>
              {giscus.categoryId ?? "—"}
            </ReadOnly>
          </Row>
          <Row label="매핑">
            <ReadOnly mono>pathname (고정)</ReadOnly>
          </Row>
        </Card>

        {/* SEO */}
        <Card id="settings-seo" title="SEO · 메타" source="site.json">
          <Row label="사이트 제목">
            <TextInput
              value={form.title}
              onChange={(v) => set("title", v)}
            />
          </Row>
          <Row label="짧은 제목">
            <TextInput
              value={form.shortTitle}
              onChange={(v) => set("shortTitle", v)}
            />
          </Row>
          <Row label="설명">
            <TextInput
              value={form.description}
              onChange={(v) => set("description", v)}
            />
          </Row>
          <Row label="Canonical URL">
            <div>
              <TextInput
                value={form.url}
                onChange={(v) => set("url", v)}
                mono
              />
              {urlEnvOverride && (
                <p className="mt-1 font-mono text-[11px] text-ink-muted">
                  ⚠ NEXT_PUBLIC_SITE_URL 환경변수가 적용 중입니다 — 표시
                  값({site.url})은 env가 우선합니다.
                </p>
              )}
            </div>
          </Row>
          <Row label="저작권 표기">
            <TextInput
              value={form.copyright}
              onChange={(v) => set("copyright", v)}
            />
          </Row>
          <Row label="언어">
            <TextInput
              value={form.lang}
              onChange={(v) => set("lang", v)}
              mono
            />
          </Row>
          <Row label="locale">
            <TextInput
              value={form.locale}
              onChange={(v) => set("locale", v)}
              mono
            />
          </Row>
          <Row label="OG 헤드라인">
            <Textarea
              value={form.og.headline.join("\n")}
              onChange={(v) =>
                setOg(
                  "headline",
                  v.split("\n").map((l) => l.trim()).filter(Boolean),
                )
              }
              hint="줄바꿈으로 구분 (1~3줄)"
              rows={3}
            />
          </Row>
          <Row label="OG 태그라인">
            <TextInput
              value={form.og.tagline}
              onChange={(v) => setOg("tagline", v)}
            />
          </Row>
          <Row label="OG 라벨">
            <TextInput
              value={form.og.label}
              onChange={(v) => setOg("label", v)}
              mono
            />
          </Row>
        </Card>

        {/* PUBLISH */}
        <Card
          id="settings-publish"
          title="발행"
          source="site.json → publish"
        >
          <Row label="RSS 글 개수">
            <NumberInput
              value={form.publish.rssLimit}
              onChange={(v) => setPublish("rssLimit", v)}
              min={1}
              max={100}
              suffix="편"
            />
          </Row>
        </Card>

        {/* EDITOR — localStorage-backed */}
        <EditorCard />

        {/* SAVE BAR */}
        <div
          className="sticky bottom-3 z-30 mt-6 flex items-center justify-between gap-3 rounded-xl border border-border-token bg-surface px-4 py-3 shadow-lg"
          style={{ backdropFilter: "saturate(160%) blur(8px)" }}
        >
          <StatusLine status={displayStatus} dirty={dirty} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={!dirty || status === "saving"}
              className="cursor-pointer rounded-md border border-border-token bg-transparent px-3 py-1.5 font-sans text-[12.5px] font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              되돌리기
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || status === "saving"}
              className="rounded-md border border-transparent px-3.5 py-1.5 font-sans text-[12.5px] font-semibold disabled:opacity-50"
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
      </div>
    </main>
  );
}

function EditorCard() {
  const raw = useSyncExternalStore(
    subscribePrefs,
    getRawPrefs,
    getServerRawPrefs,
  );
  const prefs = useMemo(() => parsePrefs(raw), [raw]);

  const updatePrefs = (patch: Partial<EditorPrefs>) => {
    safeWriteJSON(PREFS_KEY, { ...prefs, ...patch });
    window.dispatchEvent(new Event(PREFS_CHANGE));
  };

  return (
    <Card
      id="settings-editor"
      title="에디터"
      source="이 브라우저에만 저장 (localStorage)"
    >
      <Row label="자동저장 간격">
        <div className="flex items-center gap-2.5">
          <input
            type="range"
            min={3}
            max={30}
            step={1}
            value={prefs.autoSaveSec}
            onChange={(e) =>
              updatePrefs({ autoSaveSec: +e.target.value })
            }
            className="max-w-[220px] flex-1"
            style={{ accentColor: "var(--border-strong)" }}
          />
          <code className="min-w-[36px] whitespace-nowrap font-mono text-xs tabular-nums text-ink-soft">
            {prefs.autoSaveSec}s
          </code>
        </div>
      </Row>
      <Row label="새 댓글 알림">
        <Toggle
          value={prefs.notifyOnComment}
          onChange={(v) => updatePrefs({ notifyOnComment: v })}
        />
      </Row>
    </Card>
  );
}

function StatusLine({
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
    return (
      <span className="font-mono text-[12px] text-ink-muted">저장 중…</span>
    );
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

function Card({
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3.5">
      <label className="whitespace-nowrap font-sans text-[13px] font-medium tracking-[-0.01em] text-ink-soft">
        {label}
      </label>
      <div>{children}</div>
    </div>
  );
}

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  mono?: boolean;
}
function TextInput({ value, onChange, prefix, mono }: TextInputProps) {
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
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        className="flex-1 border-none bg-transparent px-2.5 py-[7px] tracking-[-0.005em] text-ink outline-none"
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          fontSize: mono ? 13 : 13.5,
        }}
      />
    </div>
  );
}

function Textarea({
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

function NumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-[100px] rounded-md border border-border-token bg-bg px-2.5 py-[7px] font-mono text-[13px] tabular-nums text-ink outline-none"
        style={{ background: "var(--bg)" }}
      />
      {suffix && (
        <code className="font-mono text-xs text-ink-muted">{suffix}</code>
      )}
    </div>
  );
}

function ReadOnly({
  children,
  mono,
  empty,
}: {
  children: ReactNode;
  mono?: boolean;
  empty?: boolean;
}) {
  return (
    <div
      className="rounded-md border border-border-token px-2.5 py-[7px] tracking-[-0.005em]"
      style={{
        background: "var(--surface-alt)",
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: mono ? 13 : 13.5,
        color: empty ? "var(--ink-muted)" : "var(--ink)",
      }}
    >
      {children}
    </div>
  );
}

function Pill({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border-token px-2.5 py-1 font-mono text-[11.5px]"
      style={{
        background: on ? "rgba(125,167,94,0.12)" : "var(--surface-alt)",
        color: on ? "#5d8a66" : "var(--ink-muted)",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: on ? "#5d8a66" : "var(--ink-muted)" }}
      />
      {children}
    </span>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative h-5 w-9 cursor-pointer rounded-full border border-border-token p-0 transition-colors"
      style={{
        background: value ? "var(--border-strong)" : "var(--surface-alt)",
      }}
    >
      <span
        className="absolute top-px h-4 w-4 rounded-full transition-[left]"
        style={{
          left: value ? 17 : 1,
          background: value ? "var(--bg)" : "var(--surface)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}
