/**
 * 글감 상태 변경 — 검토 화면이 쓰는 유일한 쓰기 경로.
 *
 * 글감은 공개 페이지에 나가지 않으므로 ISR 무효화를 하지 않는다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-shared";
import { dbAdmin } from "@/lib/supabase";

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "queued", "skipped", "written"]),
  /**
   * queued/skipped 로 옮긴 이유, 또는 written 의 글 slug. 빼면 기존 메모를
   * 그대로 둔다 — 상태만 옮기다 메모가 지워지면 안 된다.
   */
  note: z.string().max(200).nullable().optional(),
});

export async function PATCH(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, status, note } = parsed.data;
  const { data, error } = await dbAdmin()
    .from("release_candidates")
    .update(note === undefined ? { status } : { status, note })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "없는 글감" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
