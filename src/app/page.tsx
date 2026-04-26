/**
 * Phase 1 — token sanity page.
 * Real Home page lands in Phase 5. This file just proves that
 * design tokens, fonts, theme toggle, and the scenic glow are wired.
 */
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Page() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="mx-auto max-w-[760px] px-8 py-16 text-ink">
      <div className="mb-3 font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-ink-muted">
        Phase 1 · Setup Check
      </div>
      <h1 className="m-0 text-[56px] font-bold leading-[1.05] tracking-[-0.04em] text-ink">
        백엔드 노트, 다시 짓다.
      </h1>
      <p className="mt-5 max-w-[580px] text-[17px] leading-[1.65] text-ink-soft">
        디자인 토큰 · 폰트 · 다크모드 · scenic glow가 정상 작동하는지 확인합니다.
        본문은{" "}
        <code className="rounded bg-surface-alt px-1.5 py-px font-mono text-[0.88em] text-ink">
          Pretendard Variable
        </code>
        , 코드는{" "}
        <code className="rounded bg-surface-alt px-1.5 py-px font-mono text-[0.88em] text-ink">
          JetBrains Mono
        </code>
        로 렌더링되어야 합니다.
      </p>

      <div className="mt-8 flex gap-2.5">
        <button
          onClick={() => setTheme("light")}
          className="rounded-md border border-border-token bg-transparent px-4 py-2 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
        >
          ☼ Light
        </button>
        <button
          onClick={() => setTheme("dark")}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-85"
          style={{
            boxShadow:
              "inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          ☾ Dark
        </button>
        <button
          onClick={() => setTheme("system")}
          className="rounded-md border border-border-token bg-transparent px-4 py-2 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
        >
          System
        </button>
      </div>

      <div className="mt-6 font-mono text-xs text-ink-muted">
        theme: {mounted ? `${theme} (resolved: ${resolvedTheme})` : "…"}
      </div>

      <section className="mt-12">
        <div className="mb-3 font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-ink-muted">
          Token Swatches
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            ["bg", "var(--bg)"],
            ["surface", "var(--surface)"],
            ["surface-alt", "var(--surface-alt)"],
            ["accent", "var(--accent)"],
          ].map(([name, val]) => (
            <div
              key={name}
              className="rounded-xl border border-border-token bg-surface p-4 text-xs"
            >
              <div
                className="mb-2 h-12 w-full rounded-md border border-border-token"
                style={{ background: val }}
              />
              <div className="font-mono text-ink">{name}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-ink-muted">
          Callout Colors
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {(["info", "warning", "tip", "note"] as const).map((kind) => (
            <div
              key={kind}
              className="rounded-xl p-4 text-xs"
              style={{
                background: `var(--callout-${kind}-bg)`,
                color: `var(--callout-${kind}-ink)`,
                border: `1px solid var(--callout-${kind}-bd)`,
              }}
            >
              <div className="font-mono font-bold uppercase tracking-wider">
                {kind}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
