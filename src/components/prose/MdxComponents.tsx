/**
 * MDX → React component map for blog posts.
 * Used by `compileMDX` in PostDetail. Headings get scrollMarginTop so the
 * sticky header doesn't cover the target after a TOC click.
 */
import type { ReactNode, AnchorHTMLAttributes } from "react";
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
  // Block-level code keeps its language class so external highlighters
  // (or simple <pre> styling) can pick it up; inline code becomes our pill.
  if (className?.startsWith("language-")) {
    return <code className={className}>{children}</code>;
  }
  return <InlineCode>{children}</InlineCode>;
};

export const mdxComponents = {
  h2: H2,
  h3: H3,
  p: P,
  a: A,
  code: SmartCode,
  Callout,
  CodeBlock,
  InlineCode,
};
