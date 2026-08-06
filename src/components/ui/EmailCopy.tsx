"use client";

/**
 * EmailCopy — copies the address on click.
 * ponytail: no mailto — a desktop visitor without a mail client just gets a
 * dead link and no way to learn the address. The label stays "Email", so the
 * address must surface on hover and whenever the copy itself fails.
 */
import { useEffect, useState } from "react";
import { CTA } from "@/components/ui/CTA";
import { ToastBanner, type Toast } from "@/components/ui/ToastBanner";

export function EmailCopy({
  email,
  as = "link",
}: {
  /** site.social.email. 정본이 DB 라 서버에서 내려받는다. */
  email: string;
  as?: "link" | "cta";
}) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setToast({ kind: "success", message: "이메일 주소를 복사했습니다." });
    } catch {
      // Clipboard access can be denied (insecure context, permission policy).
      // The label hides the address, so spell it out instead of failing silently.
      setToast({ kind: "error", message: `복사에 실패했습니다. ${email}` });
    }
  };

  return (
    <>
      {as === "cta" ? (
        <CTA dark={false} onClick={copy} title={email}>
          Email
        </CTA>
      ) : (
        <button
          type="button"
          onClick={copy}
          title={email}
          className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[13px] text-ink-muted hover:text-ink"
        >
          Email
        </button>
      )}
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </>
  );
}
