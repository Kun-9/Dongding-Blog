"use client";

/**
 * CodeBlock — file/lang header + copy + line numbers + diff/highlight rows.
 * Port of prose.jsx#CodeBlock. Includes a tiny Java/SQL-leaning syntax
 * tokenizer (good enough for the design demo). Phase 4 may swap this for
 * shiki via rehype-pretty-code; the consumer API stays the same.
 */
import { useState, type ReactNode } from "react";

type Style = "card" | "minimal" | "inline";

interface Props {
  filename?: string;
  lang?: string;
  code: string;
  highlight?: number[];
  diff?: Record<number, "+" | "-">;
  style?: Style;
}

// Captures: 1=line comment, 2=block comment, 3=string, 4=keyword,
// 5=annotation, 6=Type (CapitalizedIdent), 7=number
const TOKEN_REGEX =
  /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(?:public|private|protected|class|interface|extends|implements|static|final|void|new|return|if|else|for|while|do|switch|case|break|continue|throw|throws|try|catch|finally|import|package|null|true|false|this|super|abstract|synchronized|volatile|transient|enum|record|var|select|from|where|order|by|inner|join|fetch|left|right|distinct|count|group|having|insert|update|delete|into|values|on|and|or|not|in|exists|set|create|table|primary|key|foreign|references)\b)|(@\w+)|(\b[A-Z][A-Za-z0-9_]*\b)|(\b[0-9]+(?:\.[0-9]+)?[Ll]?\b)/gm;

function highlightLine(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  TOKEN_REGEX.lastIndex = 0;

  while ((m = TOKEN_REGEX.exec(line))) {
    if (m.index > lastIdx) {
      parts.push(<span key={`p-${lastIdx}`}>{line.slice(lastIdx, m.index)}</span>);
    }
    let color: string | undefined;
    let italic = false;
    if (m[1] || m[2]) {
      color = "var(--code-comment)";
      italic = true;
    } else if (m[3]) color = "var(--code-string)";
    else if (m[4]) color = "var(--code-keyword)";
    else if (m[5]) color = "var(--code-type)";
    else if (m[6]) color = "var(--code-type)";
    else if (m[7]) color = "var(--code-number)";

    parts.push(
      <span
        key={`t-${m.index}`}
        style={{ color, fontStyle: italic ? "italic" : "normal" }}
      >
        {m[0]}
      </span>,
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < line.length) {
    parts.push(<span key={`r-${lastIdx}`}>{line.slice(lastIdx)}</span>);
  }
  return parts.length ? parts : [<span key="empty">{line}</span>];
}

export function CodeBlock({
  filename,
  lang,
  code,
  highlight = [],
  diff = {},
  style = "card",
}: Props) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  const isMinimal = style === "minimal";
  const isInline = style === "inline";
  const gutterCh = String(lines.length).length;

  const onCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <figure
      className="my-6 overflow-hidden"
      style={{
        background: "var(--code-bg)",
        color: "var(--code-ink)",
        borderRadius: isMinimal ? 0 : 10,
        border: isMinimal ? "none" : "1px solid var(--code-bg)",
        borderLeft: isMinimal ? "3px solid var(--code-muted)" : undefined,
      }}
    >
      {!isInline && (
        <header
          className="flex items-center justify-between px-3.5 py-2 font-mono text-xs"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="flex items-center gap-2.5"
            style={{ color: "var(--code-filename)" }}
          >
            {filename && <span className="font-medium">{filename}</span>}
            {lang && (
              <span
                className="rounded px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-[0.04em]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--code-muted)",
                }}
              >
                {lang}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border-none bg-transparent px-2 py-0.5 font-mono text-[11.5px] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: copied ? "var(--code-ink)" : "var(--code-muted)" }}
          >
            {copied ? "✓ 복사됨" : "⧉ 복사"}
          </button>
        </header>
      )}

      <pre className="m-0 overflow-x-auto py-3.5 font-mono text-[13.5px] leading-[1.65]">
        <code className="block">
          {lines.map((line, i) => {
            const n = i + 1;
            const isH = highlight.includes(n);
            const dt = diff[n];

            const rowBg =
              dt === "+"
                ? "rgba(120,180,100,0.10)"
                : dt === "-"
                  ? "rgba(200,90,80,0.10)"
                  : isH
                    ? "rgba(255,200,120,0.08)"
                    : "transparent";

            const rowBorder =
              dt === "+"
                ? "2px solid rgba(120,180,100,0.6)"
                : dt === "-"
                  ? "2px solid rgba(200,90,80,0.6)"
                  : isH
                    ? "2px solid var(--code-keyword)"
                    : "2px solid transparent";

            return (
              <div
                key={i}
                className="flex pl-4 pr-4"
                style={{ background: rowBg, borderLeft: rowBorder }}
              >
                <span
                  aria-hidden
                  className="mr-3.5 inline-block shrink-0 select-none text-left tabular-nums"
                  style={{
                    width: `${gutterCh}ch`,
                    color: "var(--code-line-num)",
                  }}
                >
                  {n}
                </span>
                <span
                  className="inline-block w-3.5 select-none"
                  style={{ color: "var(--code-muted)" }}
                >
                  {dt === "+" ? "+" : dt === "-" ? "−" : ""}
                </span>
                <span className="flex-1 whitespace-pre">
                  {highlightLine(line)}
                </span>
              </div>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
