"use client";

/**
 * CTA — signature inset-shadow button.
 * Faithful port of components.jsx#CTA. Two visual modes:
 *  - dark=true  → solid accent fill with inset highlight + shadow
 *  - dark=false → ghost outline
 */
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import Link from "next/link";

type Size = "sm" | "md" | "lg";

interface BaseProps {
  children: ReactNode;
  dark?: boolean;
  size?: Size;
  className?: string;
}

interface AnchorProps extends BaseProps {
  href: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

interface ButtonProps extends BaseProps {
  href?: undefined;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}

type CTAProps = AnchorProps | ButtonProps;

const padBySize: Record<Size, string> = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2",
  lg: "px-5 py-2.5",
};

const fontBySize: Record<Size, string> = {
  sm: "text-[13px]",
  md: "text-[15px]",
  lg: "text-[15px]",
};

function getStyle(dark: boolean): CSSProperties {
  if (dark) {
    return {
      background: "var(--accent)",
      color: "var(--accent-ink)",
      boxShadow:
        "inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.08)",
    };
  }
  return {
    background: "transparent",
    color: "var(--ink)",
    border: "1px solid var(--border-strong)",
  };
}

export function CTA(props: CTAProps) {
  const { children, dark = true, size = "md", className = "" } = props;
  const cls = [
    "inline-block rounded-md font-sans font-semibold tracking-[-0.01em]",
    "whitespace-nowrap no-underline",
    "transition-opacity hover:opacity-85",
    padBySize[size],
    fontBySize[size],
    className,
  ].join(" ");

  if ("href" in props && props.href !== undefined) {
    const isExternal = /^https?:\/\//.test(props.href) || props.href.startsWith("mailto:");
    if (isExternal) {
      return (
        <a
          href={props.href}
          onClick={props.onClick}
          className={cls}
          style={getStyle(dark)}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={props.href} onClick={props.onClick} className={cls} style={getStyle(dark)}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className={cls} style={getStyle(dark)}>
      {children}
    </button>
  );
}
