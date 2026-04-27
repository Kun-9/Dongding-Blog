/**
 * TagChip — tag pill with hash glyph. Tracks 'Tag Click' to Umami.
 */
"use client";

import Link from "next/link";

interface Props {
  tag: string;
  size?: "sm" | "md";
  filled?: boolean;
  href?: string;
}

export function TagChip({ tag, size = "md", filled = false, href }: Props) {
  const target = href ?? `/tags/${tag}`;
  const padding = size === "sm" ? "px-[9px] py-[3px]" : "px-2.5 py-1";
  const fontSize = size === "sm" ? "text-[11.5px]" : "text-[12.5px]";

  const baseClass = [
    "inline-flex items-center gap-[3px] rounded-full",
    "font-sans font-medium tracking-[-0.005em] no-underline whitespace-nowrap",
    padding,
    fontSize,
  ].join(" ");

  const handleClick = () => {
    window.umami?.track("Tag Click", { tag });
  };

  if (filled) {
    return (
      <Link
        href={target}
        onClick={handleClick}
        className={baseClass}
        style={{
          background: "var(--accent)",
          color: "var(--accent-ink)",
        }}
      >
        <span className="opacity-70">#</span>
        {tag}
      </Link>
    );
  }

  return (
    <Link
      href={target}
      onClick={handleClick}
      className={`${baseClass} border border-border-token text-ink-muted`}
    >
      <span className="opacity-55">#</span>
      {tag}
    </Link>
  );
}
