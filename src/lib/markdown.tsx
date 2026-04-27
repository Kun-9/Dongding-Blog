/**
 * Shared markdown parser — used by Studio preview AND post detail page.
 * Block: # ## ### ####, ```lang:filename, > [!KIND] title (multi-line),
 *        - / 1. lists, ---, blank lines.
 * Inline: **bold**, *italic*, `code`, [text](url), ![alt](url).
 * `>` is RESERVED for callouts. Plain blockquote is not supported.
 */
import { Fragment, type ReactNode } from "react";
import BananaSlug from "github-slugger";
import type { TocItem } from "@/lib/types";
import { Callout, type CalloutKind } from "@/components/prose/Callout";
import { CodeBlock } from "@/components/prose/CodeBlock";
import { InlineCode } from "@/components/prose/InlineCode";
import { ZoomableImage } from "@/components/prose/ZoomableImage";

const CALLOUT_KINDS = ["info", "warning", "tip", "note"] as const;

function isCalloutKind(s: string): s is CalloutKind {
  return (CALLOUT_KINDS as readonly string[]).includes(s);
}

interface InlineCtx {
  keyBase: string;
}

function renderInline(text: string, ctx: InlineCtx): ReactNode {
  if (!text) return null;
  const out: ReactNode[] = [];
  let i = 0;
  let buf = "";
  let n = 0;

  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = "";
    }
  };
  const push = (node: ReactNode) => {
    flush();
    out.push(node);
    n++;
  };

  while (i < text.length) {
    const rest = text.slice(i);
    const ch = text[i];

    // Image ![alt](url)
    let m = rest.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (m) {
      push(
        <ZoomableImage
          key={`${ctx.keyBase}-img-${n}`}
          src={m[2]}
          alt={m[1]}
        />,
      );
      i += m[0].length;
      continue;
    }

    // Link [text](url)
    m = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (m) {
      const url = m[2];
      const isExternal = /^https?:/.test(url);
      push(
        <a
          key={`${ctx.keyBase}-a-${n}`}
          href={url}
          {...(isExternal
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="text-ink underline decoration-ink-subtle decoration-1 underline-offset-2 hover:decoration-ink"
        >
          {renderInline(m[1], { keyBase: `${ctx.keyBase}-a-${n}-i` })}
        </a>,
      );
      i += m[0].length;
      continue;
    }

    // Inline code `...`
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        push(
          <InlineCode key={`${ctx.keyBase}-ic-${n}`}>
            {text.slice(i + 1, end)}
          </InlineCode>,
        );
        i = end + 1;
        continue;
      }
    }

    // Bold **text**
    if (ch === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > i + 1) {
        push(
          <strong
            key={`${ctx.keyBase}-b-${n}`}
            className="font-semibold text-ink"
          >
            {renderInline(text.slice(i + 2, end), {
              keyBase: `${ctx.keyBase}-b-${n}-i`,
            })}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // Italic *text*  (single asterisk; not adjacent to spaces)
    if (ch === "*" && text[i + 1] !== "*" && text[i + 1] !== " ") {
      const end = text.indexOf("*", i + 1);
      if (end > i && text[end - 1] !== " ") {
        push(
          <em key={`${ctx.keyBase}-i-${n}`} className="italic">
            {renderInline(text.slice(i + 1, end), {
              keyBase: `${ctx.keyBase}-i-${n}-i`,
            })}
          </em>,
        );
        i = end + 1;
        continue;
      }
    }

    buf += ch;
    i++;
  }
  flush();

  if (out.length === 1 && typeof out[0] === "string") return out[0];
  return out.map((node, idx) =>
    typeof node === "string" ? (
      <Fragment key={`${ctx.keyBase}-t-${idx}`}>{node}</Fragment>
    ) : (
      node
    ),
  );
}

const HEADER_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "mb-3.5 mt-0 font-sans text-[30px] font-semibold leading-[1.3] tracking-[-0.025em] text-ink",
  2: "mb-2.5 mt-7 font-sans text-[24px] font-semibold leading-[1.3] tracking-[-0.025em] text-ink",
  3: "mb-2 mt-[22px] font-sans text-[19px] font-semibold leading-[1.3] tracking-[-0.015em] text-ink",
  4: "mb-1.5 mt-[18px] font-sans text-[16px] font-semibold leading-[1.3] tracking-[-0.015em] text-ink",
};

/**
 * Render markdown source to React nodes. Pure function (no hooks) — safe in
 * both server components (PostDetail) and client (Studio preview).
 */
export function renderMarkdown(src: string): ReactNode[] {
  const slugger = new BananaSlug();
  const lines = String(src ?? "").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const k = () => `md-${key++}`;

  while (i < lines.length) {
    const ln = lines[i];

    if (ln.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(ln)) {
      out.push(
        <hr key={k()} className="my-7 border-0 border-t border-border-token" />,
      );
      i++;
      continue;
    }

    // Headers H1–H4
    const hMatch = ln.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length as 1 | 2 | 3 | 4;
      const text = hMatch[2].trim();
      const id = slugger.slug(text);
      const baseKey = k();
      const inner = renderInline(text, { keyBase: `${baseKey}-h` });
      const className = HEADER_CLASS[level];
      const style = { scrollMarginTop: 80 };
      const headerNode =
        level === 1 ? (
          <h1 key={baseKey} id={id} className={className} style={style}>
            {inner}
          </h1>
        ) : level === 2 ? (
          <h2 key={baseKey} id={id} className={className} style={style}>
            {inner}
          </h2>
        ) : level === 3 ? (
          <h3 key={baseKey} id={id} className={className} style={style}>
            {inner}
          </h3>
        ) : (
          <h4 key={baseKey} id={id} className={className} style={style}>
            {inner}
          </h4>
        );
      out.push(headerNode);
      i++;
      continue;
    }

    // Code fence ```lang:filename
    if (ln.startsWith("```")) {
      const fence = ln.slice(3).trim();
      const [langRaw, fileRaw] = fence.split(":");
      const lang = (langRaw ?? "").trim();
      const filename = (fileRaw ?? "").trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      out.push(
        <CodeBlock
          key={k()}
          lang={lang || undefined}
          filename={filename || undefined}
          code={code.join("\n")}
        />,
      );
      continue;
    }

    // Callout — `> [!KIND] title` then continuation lines starting with `>`
    if (ln.startsWith(">")) {
      const first = ln.replace(/^>\s?/, "");
      const kindMatch = first.match(
        /^\[!(INFO|WARNING|TIP|NOTE)\]\s*(.*)$/i,
      );
      const rawKind = kindMatch ? kindMatch[1].toLowerCase() : "info";
      const kind: CalloutKind = isCalloutKind(rawKind) ? rawKind : "info";
      const title = kindMatch ? kindMatch[2].trim() : "";
      const bodyLines: string[] = kindMatch ? [] : [first];
      i++;
      while (i < lines.length && lines[i].startsWith(">")) {
        bodyLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      while (bodyLines.length && bodyLines[0].trim() === "") bodyLines.shift();
      while (
        bodyLines.length &&
        bodyLines[bodyLines.length - 1].trim() === ""
      )
        bodyLines.pop();

      const paragraphs: string[] = [];
      let cur: string[] = [];
      for (const bl of bodyLines) {
        if (bl.trim() === "") {
          if (cur.length) paragraphs.push(cur.join(" "));
          cur = [];
        } else {
          cur.push(bl);
        }
      }
      if (cur.length) paragraphs.push(cur.join(" "));

      const calloutKey = k();
      out.push(
        <Callout key={calloutKey} kind={kind} title={title || undefined}>
          {paragraphs.map((p, idx) => (
            <p key={idx}>
              {renderInline(p, { keyBase: `${calloutKey}-co-${idx}` })}
            </p>
          ))}
        </Callout>,
      );
      continue;
    }

    // Unordered list
    if (/^-\s+/.test(ln)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ""));
        i++;
      }
      const baseKey = k();
      out.push(
        <ul
          key={baseKey}
          className="mb-5 list-disc pl-[1.3em] font-sans text-[15.5px] leading-[1.85] text-ink-soft"
        >
          {items.map((it, idx) => (
            <li key={idx} className="mb-[0.3em]">
              {renderInline(it, { keyBase: `${baseKey}-li-${idx}` })}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list — absorbs blank-line-separated sub-bullets as children
    // of the preceding numbered item, and starts numbering from the source
    // value (so `2. ...` renders as "2." even after a sub-list break).
    if (/^\d+\.\s+/.test(ln)) {
      type OrderedItem = { text: string; subs: string[] };
      const items: OrderedItem[] = [];
      const startNum = parseInt(ln.match(/^(\d+)\./)?.[1] ?? "1", 10);

      while (i < lines.length) {
        const cur = lines[i];
        if (/^\d+\.\s+/.test(cur)) {
          items.push({ text: cur.replace(/^\d+\.\s+/, ""), subs: [] });
          i++;
          continue;
        }
        if (/^-\s+/.test(cur) && items.length > 0) {
          items[items.length - 1].subs.push(cur.replace(/^-\s+/, ""));
          i++;
          continue;
        }
        if (cur.trim() === "") {
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === "") j++;
          if (
            j < lines.length &&
            (/^\d+\.\s+/.test(lines[j]) ||
              (/^-\s+/.test(lines[j]) && items.length > 0))
          ) {
            i = j;
            continue;
          }
        }
        break;
      }

      const baseKey = k();
      out.push(
        <ol
          key={baseKey}
          start={startNum}
          className="mb-5 list-decimal pl-[1.5em] font-sans text-[15.5px] leading-[1.85] text-ink-soft"
        >
          {items.map((it, idx) => (
            <li key={idx} className="mb-[0.3em]">
              {renderInline(it.text, { keyBase: `${baseKey}-oli-${idx}` })}
              {it.subs.length > 0 && (
                <ul className="mt-[0.3em] list-disc pl-[1.3em]">
                  {it.subs.map((sub, sidx) => (
                    <li key={sidx} className="mb-[0.2em]">
                      {renderInline(sub, {
                        keyBase: `${baseKey}-oli-${idx}-sub-${sidx}`,
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph — collect contiguous non-block lines
    const paraLines = [ln];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith(">") &&
      !/^-\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    const baseKey = k();
    out.push(
      <p
        key={baseKey}
        className="mb-5 font-sans text-[17px] leading-[1.85] tracking-[-0.005em] text-ink-soft"
      >
        {renderInline(paraLines.join(" "), { keyBase: `${baseKey}-p` })}
      </p>,
    );
  }

  return out;
}

const FENCE_RE = /^\s*```/;
const HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

/**
 * Extract H2/H3 entries for the table-of-contents sidebar. Mirrors the slug
 * algorithm used by `renderMarkdown` so anchors line up.
 */
export function extractTOC(src: string): TocItem[] {
  const slugger = new BananaSlug();
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of String(src ?? "").split("\n")) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(HEADING_RE);
    if (!m) continue;

    const level = m[1].length as 2 | 3;
    const label = stripInlineMarkdown(m[2]);
    if (!label) continue;
    items.push({ id: slugger.slug(label), label, level });
  }
  return items;
}
