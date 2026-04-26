/**
 * MDX → React component map for blog posts.
 * Used by `compileMDX` in PostDetail. Headings get scrollMarginTop so the
 * sticky header doesn't cover the target after a TOC click.
 */
import type {
  ReactNode,
  ReactElement,
  AnchorHTMLAttributes,
} from "react";
import { CodeBlock } from "@/components/prose/CodeBlock";
import { InlineCode } from "@/components/prose/InlineCode";
import { Callout } from "@/components/prose/Callout";

const H2 = ({ id, children }: { id?: string; children?: ReactNode }) => (
  <h2
    id={id}
    className="mb-2.5 mt-10 font-sans text-[28px] font-semibold leading-[1.3] tracking-[-0.025em] text-ink"
    style={{ scrollMarginTop: 80 }}
  >
    {children}
  </h2>
);

const H3 = ({ id, children }: { id?: string; children?: ReactNode }) => (
  <h3
    id={id}
    className="mb-2 mt-8 font-sans text-[21px] font-semibold leading-[1.35] tracking-[-0.02em] text-ink"
    style={{ scrollMarginTop: 80 }}
  >
    {children}
  </h3>
);

const P = ({ children }: { children?: ReactNode }) => (
  <p className="mb-5 font-sans text-[17px] leading-[1.85] tracking-[-0.005em] text-ink-soft">
    {children}
  </p>
);

const A = (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a
    {...props}
    className="text-ink underline decoration-ink-subtle decoration-1 underline-offset-2 hover:decoration-ink"
  />
);

const SmartCode = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  // Inside <pre>, the SmartPre wrapper handles rendering — pass through
  // so it can read className + children. Outside, this is inline code.
  if (className?.startsWith("language-")) {
    return <code className={className}>{children}</code>;
  }
  return <InlineCode>{children}</InlineCode>;
};

interface CodeChildProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Map MDX code fences (` ```lang `) to our themed CodeBlock. Tistory-style
 * filename comment as the first line is detected and lifted into the
 * filename header (e.g. `// Order.java`).
 */
const SmartPre = ({ children }: { children?: ReactNode }) => {
  const codeEl = children as ReactElement<CodeChildProps> | undefined;
  if (!codeEl || typeof codeEl !== "object" || !("props" in codeEl)) {
    return <pre>{children}</pre>;
  }
  const { className, children: codeChildren } = codeEl.props;
  const codeStr =
    typeof codeChildren === "string"
      ? codeChildren
      : Array.isArray(codeChildren)
        ? codeChildren.filter((c) => typeof c === "string").join("")
        : "";

  const lang = className?.match(/language-([\w-]+)/)?.[1];

  // Promote a leading filename comment into the header.
  let filename: string | undefined;
  let body = codeStr;
  const firstLine = codeStr.split("\n", 1)[0];
  const filenameMatch = firstLine.match(
    /^\s*(?:\/\/|#|--)\s*([\w./-]+\.\w{1,8})\s*$/,
  );
  if (filenameMatch) {
    filename = filenameMatch[1];
    body = codeStr.slice(firstLine.length).replace(/^\n/, "");
  }

  return <CodeBlock filename={filename} lang={lang} code={body} />;
};

export const mdxComponents = {
  h2: H2,
  h3: H3,
  p: P,
  a: A,
  pre: SmartPre,
  code: SmartCode,
  Callout,
  CodeBlock,
  InlineCode,
};
