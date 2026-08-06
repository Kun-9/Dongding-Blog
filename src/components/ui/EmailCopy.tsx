"use client";

/**
 * EmailCopy — shows the address and copies it on click.
 * ponytail: no mailto — a desktop visitor without a mail client just gets a
 * dead link, and the address itself was never visible to fall back on.
 */
import { useEffect, useState } from "react";
import { CTA } from "@/components/ui/CTA";
import { ToastBanner } from "@/components/ui/ToastBanner";
import { site } from "@/lib/site";

export function EmailCopy({ as = "link" }: { as?: "link" | "cta" }) {
  const [copied, setCopied] = useState(false);
  const email = site.social.email;

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
  };

  return (
    <>
      {as === "cta" ? (
        <CTA dark={false} onClick={copy}>
          {email}
        </CTA>
      ) : (
        <button
          type="button"
          onClick={copy}
          className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[13px] text-ink-muted hover:text-ink"
        >
          {email}
        </button>
      )}
      {copied && (
        <ToastBanner
          toast={{ kind: "success", message: "이메일 주소를 복사했습니다." }}
          onClose={() => setCopied(false)}
        />
      )}
    </>
  );
}
