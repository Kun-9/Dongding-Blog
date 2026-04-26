"use client";

/**
 * Settings — port of project/page-settings.jsx#SettingsPage.
 * UI only (no actual persistence).
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { CTA } from "@/components/ui/CTA";
import { useTheme } from "next-themes";

const AVATAR_COLORS = ["#7a8a5a", "#8a7355", "#5a7480", "#8a5d5d", "#5d6b8a"];

export default function Page() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [profile, setProfile] = useState({
    handle: "dongding",
    name: "동딩 (Dong-Ding)",
    bio: "백엔드 7년차. 자바·스프링·DB. 한 번에 한 글씩 천천히.",
    email: "dongding@example.com",
    avatar: "#7a8a5a",
  });
  const [social, setSocial] = useState({
    github: "dongding",
    twitter: "",
    linkedin: "dongding-kim",
    rss: true,
  });
  const [comments, setComments] = useState({
    enabled: true,
    repo: "dongding/blog-comments",
    category: "General",
    mapping: "pathname",
  });
  const [seo, setSeo] = useState({
    siteTitle: "Dong-Ding · 백엔드 노트",
    description: "자바·스프링·DB를 깊이, 천천히 따라가는 블로그.",
    canonical: "https://dongding.dev",
    ogImage: "og-default.png",
  });
  const [publish, setPublish] = useState({
    autoSaveSec: 8,
    rssLimit: 20,
    drafts: "private",
    notifyOnComment: true,
  });
  const [danger, setDanger] = useState(false);

  return (
    <main className="mx-auto grid max-w-[1080px] grid-cols-1 gap-6 px-5 pb-12 pt-8 md:grid-cols-[200px_1fr] md:gap-8 md:px-8 md:pb-16 md:pt-10">
      {/* Side nav */}
      <aside className="md:sticky md:top-20 md:self-start">
        <div className="mb-3.5 whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          SETTINGS
        </div>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {[
            ["profile", "프로필"],
            ["social", "소셜 링크"],
            ["comments", "댓글"],
            ["seo", "SEO · 메타"],
            ["publish", "발행 설정"],
            ["danger", "데이터"],
          ].map(([id, lbl]) => (
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
            사이트와 관련된 거의 모든 것을 여기서. 변경사항은 저장 시점에
            적용됩니다.
          </p>
        </header>

        {/* PROFILE */}
        <Card id="settings-profile" title="프로필" desc="About 페이지와 글 푸터에 함께 노출됩니다.">
          <Row label="아바타">
            <div className="flex items-center gap-2.5">
              <div
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border-token font-sans text-lg font-bold tracking-[-0.02em] text-white"
                style={{ background: profile.avatar }}
              >
                동
              </div>
              <button type="button" className={GHOST}>
                이미지 변경
              </button>
              <div className="flex gap-1">
                {AVATAR_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, avatar: col }))}
                    title={col}
                    className="h-[22px] w-[22px] cursor-pointer rounded-full p-0"
                    style={{
                      background: col,
                      border:
                        profile.avatar === col
                          ? `2px solid var(--ink)`
                          : `1px solid var(--border)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </Row>
          <Row label="핸들">
            <Input
              value={profile.handle}
              onChange={(v) => setProfile((p) => ({ ...p, handle: v }))}
              prefix="@"
            />
          </Row>
          <Row label="이름">
            <Input
              value={profile.name}
              onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
            />
          </Row>
          <Row label="짧은 소개">
            <Textarea
              value={profile.bio}
              onChange={(v) => setProfile((p) => ({ ...p, bio: v }))}
              hint={`${profile.bio.length}/120자`}
            />
          </Row>
          <Row label="이메일">
            <Input
              value={profile.email}
              onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
              type="email"
            />
          </Row>
        </Card>

        {/* SOCIAL */}
        <Card id="settings-social" title="소셜 링크" desc="Footer와 About 페이지에 노출. 비워두면 숨겨집니다.">
          <Row label="GitHub">
            <Input
              value={social.github}
              onChange={(v) => setSocial((s) => ({ ...s, github: v }))}
              prefix="github.com/"
              mono
            />
          </Row>
          <Row label="X (Twitter)">
            <Input
              value={social.twitter}
              onChange={(v) => setSocial((s) => ({ ...s, twitter: v }))}
              prefix="x.com/"
              mono
              placeholder="empty — hide"
            />
          </Row>
          <Row label="LinkedIn">
            <Input
              value={social.linkedin}
              onChange={(v) => setSocial((s) => ({ ...s, linkedin: v }))}
              prefix="in/"
              mono
            />
          </Row>
          <Row label="RSS 피드 노출">
            <Toggle
              value={social.rss}
              onChange={(v) => setSocial((s) => ({ ...s, rss: v }))}
            />
          </Row>
        </Card>

        {/* COMMENTS */}
        <Card id="settings-comments" title="댓글 (Giscus)" desc="GitHub Discussions 기반. 별도 DB가 필요 없습니다.">
          <Row label="댓글 사용">
            <Toggle
              value={comments.enabled}
              onChange={(v) => setComments((s) => ({ ...s, enabled: v }))}
            />
          </Row>
          <div
            style={{
              opacity: comments.enabled ? 1 : 0.45,
              pointerEvents: comments.enabled ? "auto" : "none",
              transition: "opacity 0.2s",
            }}
          >
            <Row label="저장소">
              <Input
                value={comments.repo}
                onChange={(v) => setComments((s) => ({ ...s, repo: v }))}
                mono
              />
            </Row>
            <Row label="카테고리">
              <Select
                value={comments.category}
                onChange={(v) => setComments((s) => ({ ...s, category: v }))}
                options={["General", "Announcements", "Comments", "Q&A"]}
              />
            </Row>
            <Row label="매핑 방식">
              <Segmented
                value={comments.mapping}
                onChange={(v) => setComments((s) => ({ ...s, mapping: v }))}
                options={[
                  ["pathname", "pathname"],
                  ["url", "url"],
                  ["title", "title"],
                ]}
              />
            </Row>
          </div>
        </Card>

        {/* SEO */}
        <Card id="settings-seo" title="SEO · 메타" desc="검색엔진과 SNS 미리보기에 사용됩니다.">
          <Row label="사이트 제목">
            <Input
              value={seo.siteTitle}
              onChange={(v) => setSeo((s) => ({ ...s, siteTitle: v }))}
            />
          </Row>
          <Row label="설명">
            <Textarea
              value={seo.description}
              onChange={(v) => setSeo((s) => ({ ...s, description: v }))}
              hint={`${seo.description.length}/160자`}
            />
          </Row>
          <Row label="Canonical URL">
            <Input
              value={seo.canonical}
              onChange={(v) => setSeo((s) => ({ ...s, canonical: v }))}
              mono
            />
          </Row>
          <Row label="기본 OG 이미지">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-[63px] w-[120px] items-center justify-center rounded-md border border-border-token font-mono text-[10px] text-ink-muted"
                style={{
                  background:
                    "linear-gradient(135deg, var(--surface), var(--surface-alt))",
                }}
              >
                1200×630
              </div>
              <div className="flex flex-col gap-1">
                <code className="font-mono text-xs text-ink-soft">
                  {seo.ogImage}
                </code>
                <button type="button" className={GHOST}>
                  이미지 업로드
                </button>
              </div>
            </div>
          </Row>
        </Card>

        {/* PUBLISH */}
        <Card id="settings-publish" title="발행 설정">
          <Row label="자동저장 간격">
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                min={3}
                max={30}
                step={1}
                value={publish.autoSaveSec}
                onChange={(e) =>
                  setPublish((p) => ({ ...p, autoSaveSec: +e.target.value }))
                }
                className="max-w-[220px] flex-1"
                style={{ accentColor: "var(--border-strong)" }}
              />
              <code className="min-w-[36px] whitespace-nowrap font-mono text-xs tabular-nums text-ink-soft">
                {publish.autoSaveSec}s
              </code>
            </div>
          </Row>
          <Row label="RSS 글 개수">
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={publish.rssLimit}
                onChange={(e) =>
                  setPublish((p) => ({ ...p, rssLimit: +e.target.value }))
                }
                className="max-w-[220px] flex-1"
                style={{ accentColor: "var(--border-strong)" }}
              />
              <code className="min-w-[36px] whitespace-nowrap font-mono text-xs tabular-nums text-ink-soft">
                {publish.rssLimit}편
              </code>
            </div>
          </Row>
          <Row label="초안 공개 범위">
            <Segmented
              value={publish.drafts}
              onChange={(v) => setPublish((p) => ({ ...p, drafts: v }))}
              options={[
                ["private", "나만"],
                ["unlisted", "링크 있는 사람"],
                ["public", "전체"],
              ]}
            />
          </Row>
          <Row label="새 댓글 알림">
            <Toggle
              value={publish.notifyOnComment}
              onChange={(v) =>
                setPublish((p) => ({ ...p, notifyOnComment: v }))
              }
            />
          </Row>
        </Card>

        {/* DANGER */}
        <Card id="settings-danger" title="데이터" desc="신중하게.">
          <Row label="전체 글 내보내기">
            <button type="button" className={GHOST}>
              Markdown ZIP 내보내기 ↓
            </button>
          </Row>
          <Row label="구독자 목록">
            <button type="button" className={GHOST}>
              CSV 내보내기 ↓
            </button>
          </Row>
          <Row label="블로그 비공개 전환">
            <Toggle value={danger} onChange={setDanger} />
          </Row>
          {danger && (
            <div
              className="mt-2 rounded-lg px-3.5 py-2.5 text-[13px] leading-[1.5]"
              style={{
                background: isDark
                  ? "rgba(168,93,93,0.14)"
                  : "rgba(220,138,138,0.12)",
                color: isDark ? "#d8a8a8" : "#8a4d4d",
              }}
            >
              비공개 상태에서는 본인만 글을 볼 수 있어요. 검색엔진 노출도
              막힙니다.
            </div>
          )}
        </Card>

        <div className="mt-6 flex justify-end gap-2 border-t border-border-token pt-6">
          <button type="button" className={GHOST}>
            되돌리기
          </button>
          <CTA size="md">변경사항 저장</CTA>
        </div>
      </div>
    </main>
  );
}

const GHOST =
  "rounded-md border border-border-token bg-transparent px-3 py-1.5 font-sans text-[12.5px] font-medium tracking-[-0.005em] text-ink whitespace-nowrap";

function Card({
  id,
  title,
  desc,
  children,
}: {
  id: string;
  title: string;
  desc?: string;
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
        {desc && (
          <p className="mt-1 text-[13px] leading-[1.55] text-ink-muted">
            {desc}
          </p>
        )}
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

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  type?: string;
  placeholder?: string;
  mono?: boolean;
}
function Input({
  value,
  onChange,
  prefix,
  type = "text",
  placeholder,
  mono,
}: InputProps) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-border-token" style={{ background: "var(--bg)" }}>
      {prefix && (
        <span className="whitespace-nowrap border-r border-border-token bg-surface-alt px-2.5 py-[7px] font-mono text-[12.5px] text-ink-muted">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
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
  rows = 2,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
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

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-md border border-border-token px-2.5 py-[7px] font-sans text-[13.5px] tracking-[-0.005em] text-ink outline-none"
      style={{ background: "var(--bg)" }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div className="inline-flex rounded-md border border-border-token bg-surface-alt p-0.5">
      {options.map(([k, lbl]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className="cursor-pointer whitespace-nowrap rounded border-none px-3 py-[5px] font-sans text-[12.5px] tracking-[-0.005em]"
          style={{
            background: value === k ? "var(--bg)" : "transparent",
            color: value === k ? "var(--ink)" : "var(--ink-muted)",
            fontWeight: value === k ? 600 : 500,
            boxShadow: value === k ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
          }}
        >
          {lbl}
        </button>
      ))}
    </div>
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
