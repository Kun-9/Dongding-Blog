"use client";

/**
 * 미리보기 화면의 발행 버튼 — 릴리스 주제에 묶인 발행 대기 초안만.
 * 어드민의 발행하기와 같은 길(주제 advance)을 탄다: 점검을 한 번 더 돌리고,
 * 통과하면 글을 공개하고 묶인 글감을 닫는다. 끝나면 화면을 새로 읽는다.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api-routes";
import { Field, Modal } from "@/components/ui/Modal";

export function PreviewPublish({
  id,
  slug,
  title,
  todo,
}: {
  id: number;
  slug: string;
  title: string;
  todo: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(API.releaseTopics, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "advance", id, note: note.trim() || "발행", postSlug: slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `실패 (${res.status})`);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("요청 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="whitespace-nowrap rounded-full bg-ink px-3.5 py-1 font-semibold text-bg transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
      >
        발행하기
      </button>
      <Modal
        open={open}
        tone="accent"
        eyebrow="발행"
        title={`'${title}'을 공개할까요?`}
        description={
          <>
            문체·구성 점검을 한 번 더 돌리고, 통과하면 바로 블로그에 올라갑니다. 캡처 자리(todo-)가 남아 있으면 막힙니다.
            {todo && <span className="mt-1 block text-[12.5px] text-ink-muted">남은 일: {todo}</span>}
          </>
        }
        confirmLabel={busy ? "공개하는 중…" : "공개하기"}
        busy={busy}
        error={error}
        onClose={() => setOpen(false)}
        onConfirm={publish}
      >
        <Field label="발행 메모" hint="선택">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border-token bg-surface px-3 py-2 text-[13.5px] leading-[1.55] text-ink transition-colors focus:border-border-strong focus:outline-none"
          />
        </Field>
      </Modal>
    </>
  );
}
