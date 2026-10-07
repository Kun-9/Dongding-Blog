/**
 * 추적 레포와 전역 수집 스위치 — 어드민 설정이 통째로 보낸다.
 *
 * `/api/categories` 와 같이 목록 전체를 교체한다. 빠진 레포는 삭제되고,
 * FK 가 cascade 라 그 레포의 글감도 같이 지워진다 — 화면이 글감 수를
 * 보여주고 확인을 받은 뒤에 보낸다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-shared";
import { dbAdmin } from "@/lib/supabase";

/** owner/name. GitHub 가 허용하는 글자만. */
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

const PutSchema = z.object({
  collectEnabled: z.boolean(),
  sources: z
    .array(
      z.object({
        repo: z.string().regex(REPO_RE, "owner/name 형식이어야 합니다"),
        enabled: z.boolean(),
      }),
    )
    .max(200),
});

export async function PUT(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { sources, collectEnabled } = parsed.data;

  const seen = new Set<string>();
  for (const s of sources) {
    if (seen.has(s.repo)) {
      return NextResponse.json(
        { error: `중복된 레포: ${s.repo}` },
        { status: 400 },
      );
    }
    seen.add(s.repo);
  }

  const db = dbAdmin();

  if (sources.length > 0) {
    const { error } = await db.from("release_sources").upsert(
      sources.map((s, i) => ({ repo: s.repo, enabled: s.enabled, sort: i })),
      { onConflict: "repo" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: existing, error: readErr } = await db
    .from("release_sources")
    .select("repo");
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const removed = (existing ?? [])
    .map((r) => r.repo)
    .filter((repo) => !seen.has(repo));
  if (removed.length > 0) {
    const { error } = await db
      .from("release_sources")
      .delete()
      .in("repo", removed);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { error: cfgErr } = await db
    .from("release_config")
    .update({ collect_enabled: collectEnabled, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (cfgErr) {
    return NextResponse.json({ error: cfgErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, removed: removed.length });
}
