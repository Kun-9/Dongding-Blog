/**
 * 릴리스 글감 수집 — Vercel Cron 이 하루 한 번 때린다 (`vercel.json`).
 *
 * 호출자는 둘이다: 크론(`CRON_SECRET` 베어러)과 어드민 화면의 "지금 수집"
 * 버튼(로그인 세션). 둘 다 아니면 401.
 *
 * 저장은 `ON CONFLICT DO NOTHING` 이라 이미 있는 글감은 건드리지 않는다 —
 * 사람이 매긴 status 를 수집이 덮으면 검토가 매번 처음으로 돌아간다.
 */
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-shared";
import { dbAdmin } from "@/lib/supabase";
import { collectFrom } from "@/lib/releases";

/** 크론이 매일 도니 7일이면 한두 번 걸러도 놓치지 않는다. */
const DEFAULT_DAYS = 7;

/** 크론 요청인지. Vercel 이 `CRON_SECRET` 을 베어러로 붙여 보낸다. */
function isCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Vercel Cron 은 GET 으로 때리고, 어드민의 "지금 수집" 은 POST 로 보낸다. */
async function handle(req: Request) {
  if (!isCron(req)) {
    const blocked = await requireApiUser();
    if (blocked) return blocked;
  }

  // 없어도 돈다. 공개 레포라 익명으로 읽히고, 익명 한도(시간당 60회)는
  // 레포 수십 곳을 하루 한 번 훑는 데는 충분하다.
  const token = process.env.GITHUB_TOKEN;

  const db = dbAdmin();

  const { data: config } = await db
    .from("release_config")
    .select("collect_enabled")
    .eq("id", 1)
    .single();
  if (config && !config.collect_enabled) {
    return NextResponse.json({ skipped: "수집이 꺼져 있습니다" });
  }

  const { data: sources, error: srcErr } = await db
    .from("release_sources")
    .select("repo")
    .eq("enabled", true)
    .order("sort");
  if (srcErr) {
    return NextResponse.json({ error: srcErr.message }, { status: 500 });
  }

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? DEFAULT_DAYS);
  const since = Date.now() - days * 864e5;

  // 레포 수가 수십 개라 한 번에 띄운다. 실패한 레포는 빈 결과로 떨어진다.
  const results = await Promise.all(
    (sources ?? []).map((s) => collectFrom(s.repo, token, since)),
  );

  const rows = results.flatMap((r) => r.candidates);
  let added = 0;
  if (rows.length > 0) {
    // ignoreDuplicates: 이미 검토한 글감의 status 를 지킨다.
    const { data, error } = await db
      .from("release_candidates")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    added = data?.length ?? 0;
  }

  return NextResponse.json({
    days,
    repos: results.length,
    scanned: results.reduce((a, r) => a + r.recent, 0),
    matched: rows.length,
    added,
  });
}

export const GET = handle;
export const POST = handle;

/** 수집 결과가 매번 달라야 하므로 라우트를 캐시하지 않는다. */
export const dynamic = "force-dynamic";
