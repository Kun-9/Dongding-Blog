"use client";

/**
 * Studio — write/edit page with split editor + live preview.
 * Port of project/page-extras.jsx#StudioPage. UI only — no real save/publish.
 * Production builds render <DevOnlyNotice />; the real editor is reachable
 * only via `npm run dev`.
 */
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { categories } from "@/lib/categories";
import { CTA } from "@/components/ui/CTA";
import { CodeBlock } from "@/components/prose/CodeBlock";
import { InlineCode } from "@/components/prose/InlineCode";
import { Callout } from "@/components/prose/Callout";
import { TagChip } from "@/components/post/TagChip";
import { DevOnlyNotice } from "@/components/layout/DevOnlyNotice";

const isDev = process.env.NODE_ENV === "development";

const SAMPLE_BODY = `# 들어가며

JPA를 쓰면서 한 번쯤은 의아했을 것이다 — 변경 감지(dirty checking)는 어떻게 그렇게 가볍게 동작할까?

\`\`\`java
Order o = em.find(Order.class, 1L);
o.setStatus(PAID);  // setter만 호출했는데
// commit 시점에 UPDATE가 자동으로 나간다
\`\`\`

> **Info** — 이 글은 Hibernate 6.x 기준으로 본다.

## 스냅샷의 정체

엔티티가 영속성 컨텍스트에 들어올 때, Hibernate는 그 시점의 필드값을 \`Object[]\` 배열로 복제해 둔다.`;

export default function Page() {
  if (!isDev) return <DevOnlyNotice page="스튜디오" />;
  return <StudioEditor />;
}

function StudioEditor() {
  const [title, setTitle] = useState(
    "JPA dirty checking, 어떻게 그렇게 빠른가",
  );
  const [category, setCategory] = useState("db");
  const [tags, setTags] = useState("jpa, hibernate, performance");
  const [body, setBody] = useState(SAMPLE_BODY);
  const [saved, setSaved] = useState<"saved" | "typing">("saved");

  useEffect(() => {
    if (saved !== "typing") return;
    const id = setTimeout(() => setSaved("saved"), 800);
    return () => clearTimeout(id);
  }, [saved, title, category, tags, body]);

  const markTyping = () => setSaved("typing");

  const wordCount = body.replace(/\s+/g, "").length;
  const readTime = Math.max(1, Math.round(wordCount / 500));

  const rendered = useMemo<ReactNode[]>(() => {
    const lines = body.split("\n");
    const out: ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const ln = lines[i];
      if (ln.startsWith("# ")) {
        out.push(
          <h1
            key={`h1-${i}`}
            className="mb-3.5 font-sans text-[30px] font-semibold tracking-[-0.03em] text-ink"
          >
            {ln.slice(2)}
          </h1>,
        );
        i++;
      } else if (ln.startsWith("## ")) {
        out.push(
          <h2
            key={`h2-${i}`}
            className="mb-2.5 mt-6 font-sans text-[22px] font-semibold tracking-[-0.025em] text-ink"
          >
            {ln.slice(3)}
          </h2>,
        );
        i++;
      } else if (ln.startsWith("```")) {
        const lang = ln.slice(3).trim();
        const code: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          code.push(lines[i]);
          i++;
        }
        i++;
        out.push(
          <CodeBlock
            key={`code-${i}`}
            lang={lang}
            filename={lang === "java" ? "Order.java" : ""}
            code={code.join("\n")}
            style="card"
          />,
        );
      } else if (ln.startsWith("> ")) {
        const inner = ln
          .slice(2)
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/^Info\s*—\s*/, "");
        out.push(
          <Callout key={`cb-${i}`} kind="info">
            {inner}
          </Callout>,
        );
        i++;
      } else if (ln.trim() === "") {
        i++;
      } else {
        const segs = ln.split(/(`[^`]+`)/g).map((seg, j) =>
          seg.startsWith("`") && seg.endsWith("`") ? (
            <InlineCode key={j}>{seg.slice(1, -1)}</InlineCode>
          ) : (
            <span key={j}>{seg}</span>
          ),
        );
        out.push(
          <p
            key={`p-${i}`}
            className="mb-4 font-sans text-[15.5px] leading-[1.85] text-ink-soft"
          >
            {segs}
          </p>,
        );
        i++;
      }
    }
    return out;
  }, [body]);

  return (
    <main>
      {/* Studio toolbar */}
      <div
        className="sticky top-[60px] z-40 flex items-center gap-3 border-b border-border-token px-8 py-3"
        style={{ background: "var(--bg)" }}
      >
        <div className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          STUDIO
        </div>
        <div className="h-3.5 w-px bg-border-token" />
        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
          <span
            className="h-1.5 w-1.5 rounded-full transition-colors"
            style={{
              background: saved === "saved" ? "#7da75e" : "#c8a86b",
            }}
          />
          {saved === "saved"
            ? `자동저장됨 · ${wordCount}자 · ${readTime}분`
            : "저장 중…"}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          className="whitespace-nowrap rounded-md border border-border-token bg-transparent px-3 py-1.5 font-sans text-[13px] font-medium text-ink"
        >
          초안 저장
        </button>
        <CTA size="sm">발행하기 →</CTA>
      </div>

      <div className="grid min-h-[calc(100vh-200px)] grid-cols-1 gap-0 md:grid-cols-2">
        {/* Editor */}
        <section className="border-b border-border-token px-5 pb-10 pt-6 md:border-b-0 md:border-r md:px-8 md:pb-16 md:pt-7">
          <div className="mb-3.5 font-mono text-[11px] tracking-[0.05em] text-ink-muted">
            FRONTMATTER
          </div>
          <div className="mb-6 grid gap-2.5">
            <FieldRow label="title">
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markTyping();
                }}
                className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[15px] font-semibold tracking-[-0.01em] text-ink outline-none"
              />
            </FieldRow>
            <FieldRow label="category">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  markTyping();
                }}
                className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] text-ink outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="tags">
              <input
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                  markTyping();
                }}
                placeholder="comma, separated"
                className="w-full rounded-md border border-border-token bg-surface px-2.5 py-[7px] font-sans text-[13px] tracking-[-0.005em] text-ink outline-none"
              />
            </FieldRow>
          </div>

          {/* Toolbar */}
          <div className="mb-2 flex w-fit gap-1 rounded-lg border border-border-token bg-surface-alt p-1.5">
            {(
              [
                ["B", "bold", "sans"],
                ["I", "italic", "sans"],
                ["‹/›", "code", "mono"],
                ["¶", "para", "sans"],
                ["{ }", "codeblock", "mono"],
                ["◐", "callout", "sans"],
                ["—", "divider", "sans"],
              ] as const
            ).map(([g, k, font]) => (
              <button
                key={k}
                type="button"
                title={k}
                className="h-7 w-7 rounded-[5px] border-none bg-transparent text-[12px] font-semibold text-ink-soft hover:bg-hover"
                style={{
                  fontFamily:
                    font === "mono" ? "var(--font-mono)" : "var(--font-sans)",
                  fontStyle: k === "italic" ? "italic" : "normal",
                }}
              >
                {g}
              </button>
            ))}
          </div>

          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              markTyping();
            }}
            className="min-h-[540px] w-full rounded-lg border border-border-token bg-surface px-[18px] py-4 font-mono text-[13.5px] leading-[1.7] text-ink outline-none"
            style={{ resize: "vertical" }}
          />
        </section>

        {/* Preview */}
        <section className="overflow-auto px-5 pb-10 pt-6 md:px-8 md:pb-16 md:pt-7">
          <div className="mb-3.5 font-mono text-[11px] tracking-[0.05em] text-ink-muted">
            PREVIEW
          </div>
          <div className="max-w-[640px]">
            <div className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {categories.find((x) => x.id === category)?.name} · 초안
            </div>
            <h1 className="m-0 font-sans text-[36px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink">
              {title}
            </h1>
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tg) => (
                  <TagChip key={tg} tag={tg} size="sm" />
                ))}
            </div>
            <hr className="my-6 border-0 border-t border-border-token" />
            {rendered}
          </div>
        </section>
      </div>
    </main>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid grid-cols-[90px_1fr] items-center gap-3">
      <span className="font-mono text-xs text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
