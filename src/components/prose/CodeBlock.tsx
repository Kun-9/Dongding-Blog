"use client";

/**
 * CodeBlock — file/lang header + copy + line numbers + diff/highlight rows.
 * Port of prose.jsx#CodeBlock. Includes a tiny per-language syntax tokenizer
 * (comment char + keyword set picked by `lang`; approximate by design).
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

const C_KEYWORDS =
  "public|private|protected|class|interface|extends|implements|static|final|void|new|return|if|else|for|while|do|switch|case|break|continue|throw|throws|try|catch|finally|import|export|package|from|as|default|null|true|false|this|super|abstract|synchronized|volatile|transient|enum|record|var|let|const|function|async|await|type|struct|func|fn|def";
const SQL_KEYWORDS =
  "select|from|where|order|by|inner|join|fetch|left|right|distinct|count|group|having|insert|update|delete|into|values|on|and|or|not|in|exists|set|create|table|primary|key|foreign|references|null|as|limit|offset|union|all|case|when|then|end";
const PY_KEYWORDS =
  "def|class|import|from|as|if|elif|else|for|while|return|try|except|finally|with|lambda|pass|yield|raise|in|is|not|and|or|None|True|False|async|await|global|del|assert|break|continue|self";
const SH_KEYWORDS =
  "if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|return|export|local|source|set|echo|cd";
const DATA_KEYWORDS = "true|false|null|yes|no|on|off";

// A family = how comments are written + which words are keywords + what the
// "type" slot means (a Capitalized identifier, a `key:`, a $VAR).
const FAMILIES = {
  c: {
    comment: "\\/\\/.*$|\\/\\*[\\s\\S]*?\\*\\/",
    keywords: C_KEYWORDS,
    type: "\\b[A-Z][A-Za-z0-9_]*\\b",
  },
  hash: {
    comment: "#.*$",
    keywords: DATA_KEYWORDS,
    type: "^\\s*-?\\s*[\\w.-]+(?=\\s*:)",
  },
  py: { comment: "#.*$", keywords: PY_KEYWORDS, type: "\\b[A-Z][A-Za-z0-9_]*\\b" },
  sh: { comment: "#.*$", keywords: SH_KEYWORDS, type: "\\$\\{?\\w+\\}?" },
  sql: {
    comment: "--.*$|\\/\\*[\\s\\S]*?\\*\\/",
    keywords: SQL_KEYWORDS,
    type: "\\b[A-Z][A-Za-z0-9_]*\\b",
  },
} as const;

const LANG_FAMILY: Record<string, keyof typeof FAMILIES> = {
  yaml: "hash",
  yml: "hash",
  toml: "hash",
  ini: "hash",
  conf: "hash",
  dockerfile: "hash",
  makefile: "hash",
  env: "hash",
  properties: "hash",
  python: "py",
  py: "py",
  ruby: "py",
  rb: "py",
  sh: "sh",
  bash: "sh",
  zsh: "sh",
  shell: "sh",
  console: "sh",
  sql: "sql",
};

const COLORS: Record<string, string> = {
  comment: "var(--code-comment)",
  string: "var(--code-string)",
  keyword: "var(--code-keyword)",
  anno: "var(--code-type)",
  type: "var(--code-type)",
  number: "var(--code-number)",
};

const regexCache = new Map<string, RegExp>();

function regexFor(lang?: string): RegExp {
  const family = LANG_FAMILY[(lang ?? "").toLowerCase()] ?? "c";
  const cached = regexCache.get(family);
  if (cached) return cached;
  const f = FAMILIES[family];
  const re = new RegExp(
    `(?<comment>${f.comment})` +
      `|(?<string>"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')` +
      `|(?<keyword>\\b(?:${f.keywords})\\b)` +
      `|(?<anno>@\\w+)` +
      `|(?<type>${f.type})` +
      `|(?<number>\\b[0-9]+(?:\\.[0-9]+)?[Ll]?\\b)`,
    "gm",
  );
  regexCache.set(family, re);
  return re;
}

function highlightLine(line: string, lang?: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = regexFor(lang);
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;

  while ((m = re.exec(line))) {
    if (m[0] === "") {
      re.lastIndex++; // ponytail: guard against a zero-width match looping forever
      continue;
    }
    if (m.index > lastIdx) {
      parts.push(<span key={`p-${lastIdx}`}>{line.slice(lastIdx, m.index)}</span>);
    }
    const groups = m.groups ?? {};
    const kind = Object.keys(groups).find((k) => groups[k] !== undefined);

    parts.push(
      <span
        key={`t-${m.index}`}
        style={{
          color: kind ? COLORS[kind] : undefined,
          fontStyle: kind === "comment" ? "italic" : "normal",
        }}
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
  const hasDiff = Object.keys(diff).length > 0;

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
                {hasDiff && (
                  <span
                    className="inline-block w-3.5 shrink-0 select-none"
                    style={{ color: "var(--code-muted)" }}
                  >
                    {dt === "+" ? "+" : dt === "-" ? "−" : ""}
                  </span>
                )}
                <span className="flex-1 whitespace-pre">
                  {highlightLine(line, lang)}
                </span>
              </div>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
