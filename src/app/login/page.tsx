/**
 * 로그인 — Studio/Admin 진입용. 공개 가입은 Supabase 쪽에서 막아 두었으므로
 * 가입 화면은 없고, 계정은 관리자 한 명뿐이다.
 */
import { signIn } from "./actions";

export const metadata = {
  title: "Login",
};

const FIELD =
  "w-full rounded-md border border-border-token bg-surface px-3 py-2 font-sans text-[14px] text-ink outline-none focus:border-border-strong";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="mx-auto flex max-w-[420px] flex-col justify-center px-6 py-28">
      <div className="mb-6 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
        Studio
      </div>
      <h1 className="m-0 font-sans text-[clamp(24px,5vw,32px)] font-semibold leading-[1.15] tracking-[-0.03em] text-ink">
        로그인
      </h1>
      <p className="mb-8 mt-3 text-[14px] leading-[1.6] text-ink-muted">
        글을 쓰거나 고치려면 로그인이 필요합니다.
      </p>

      <form action={signIn} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next ?? "/studio"} />
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[12.5px] text-ink-soft">이메일</span>
          <input
            className={FIELD}
            type="email"
            name="email"
            autoComplete="username"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[12.5px] text-ink-soft">비밀번호</span>
          <input
            className={FIELD}
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p className="m-0 text-[13px] text-[#c0563f]">
            이메일 또는 비밀번호가 맞지 않습니다.
          </p>
        )}

        <button
          type="submit"
          className="mt-2 cursor-pointer rounded-md border border-border-token bg-ink px-4 py-2.5 font-sans text-[14px] font-medium text-surface transition-opacity hover:opacity-90"
        >
          로그인
        </button>
      </form>
    </main>
  );
}
