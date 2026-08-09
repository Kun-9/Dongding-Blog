/**
 * 글 관리 화면 — `/manage` 와 `/drafts` 가 프리셋만 달리해 같이 쓴다.
 * 초안 전용 화면을 따로 만들지 않은 이유는 시안 결정 로그 DEC-28 에 있다.
 */
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { getManageRows } from "@/lib/manage";
import { PostManager } from "@/components/manage/PostManager";
import type { Visibility } from "@/lib/types";

export async function ManageScreen({
  preset,
}: {
  preset: Visibility | "all";
}) {
  // proxy 가 이미 걸러내지만, 데이터에 손대기 직전에 한 번 더 확인한다.
  await requireUser();

  const [rows, categories] = await Promise.all([
    getManageRows(),
    getCategories(),
  ]);

  const n = (v: Visibility) => rows.filter((r) => r.status === v).length;

  return (
    <main className="mx-auto max-w-[1080px] px-[var(--gut)] pt-10">
      <header className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            MANAGE
          </div>
          <h1 className="m-0 font-sans text-[clamp(27px,6vw,36px)] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
            글 관리
          </h1>
          <p className="m-0 mt-2.5 max-w-[540px] text-[14.5px] leading-[1.6] text-ink-muted">
            발행 {n("published")} · 비공개 {n("private")} · 검토 {n("review")} ·
            초안 {n("draft")}. 상태만 바꾸면 되는 일은 여기서 끝냅니다.
          </p>
        </div>
        <Link
          href="/studio"
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink py-[7px] pl-[11px] pr-[13px] font-sans text-[13px] font-semibold tracking-[-0.005em] no-underline"
          // globals.css 의 `a { color: inherit }` 가 레이어 밖이라 링크에서는
          // text-* 유틸이 먹지 않는다. CTA 와 같은 방식으로 직접 준다.
          style={{ color: "var(--bg)" }}
        >
          <span className="text-sm font-normal leading-none">＋</span> 새 글
        </Link>
      </header>

      <PostManager rows={rows} categories={categories} preset={preset} />
    </main>
  );
}
