/**
 * ToastBanner — fixed bottom-right status banner.
 * Shared by the studio editor and the public email-copy button.
 */
export type Toast = { kind: "success" | "error"; message: string; href?: string };

export function ToastBanner({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const isSuccess = toast.kind === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[100] flex max-w-[420px] items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        background: "var(--surface)",
        borderColor: isSuccess ? "#7da75e" : "#c95c5c",
        boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
      }}
    >
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold"
        style={{
          background: isSuccess ? "#7da75e" : "#c95c5c",
          color: "white",
        }}
      >
        {isSuccess ? "✓" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-sans text-[13px] font-medium leading-[1.5] text-ink">
          {toast.message}
        </div>
        {toast.href && (
          <a
            href={toast.href}
            className="mt-1 inline-block font-sans text-[12.5px] font-semibold text-ink underline underline-offset-2"
          >
            지금 보기 →
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="shrink-0 rounded p-1 text-[14px] text-ink-muted hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}
