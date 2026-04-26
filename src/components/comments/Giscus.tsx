"use client";

/**
 * Giscus comment widget. Renders only when env is configured;
 * otherwise the parent shows a placeholder.
 */
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface Props {
  repo: `${string}/${string}`;
  repoId: string;
  category: string;
  categoryId: string;
}

export function Giscus({ repo, repoId, category, categoryId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    // Tear down on theme change so giscus reloads with new theme.
    ref.current.innerHTML = "";

    const themeName = resolvedTheme === "dark" ? "dark" : "light";
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const themeUrl = `${window.location.origin}${basePath}/giscus-${themeName}.css`;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    Object.entries({
      "data-repo": repo,
      "data-repo-id": repoId,
      "data-category": category,
      "data-category-id": categoryId,
      "data-mapping": "pathname",
      "data-strict": "1",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "bottom",
      "data-theme": themeUrl,
      "data-lang": "ko",
      "data-loading": "lazy",
    }).forEach(([k, v]) => script.setAttribute(k, v));

    ref.current.appendChild(script);
  }, [repo, repoId, category, categoryId, resolvedTheme]);

  return <div ref={ref} />;
}
