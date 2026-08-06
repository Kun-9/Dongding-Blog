/**
 * 사이트 전역 설정 API. 정본은 Supabase `site_settings` 한 행이다.
 *
 * 예전에는 `src/lib/site.json` 을 fs.writeFile 로 덮어썼는데, Vercel 서버리스는
 * 파일시스템이 읽기 전용이라 운영에서 저장이 500 으로 떨어졌다. 쓰기가 됐더라도
 * site.json 은 빌드 타임 import 라 렌더에는 반영되지 않았다.
 */
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/supabase";
import { getStoredSite, SiteSchema } from "@/lib/site-db";
import { requireApiUser, revalidateContent } from "../posts/_shared";

export async function GET() {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  // env 오버라이드를 얹지 않은 저장값. 폼이 편집하는 값 그대로여야 한다.
  return NextResponse.json(await getStoredSite());
}

export async function PUT(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { error } = await dbAdmin()
    .from("site_settings")
    .upsert({ id: 1, data: parsed.data, updated_at: new Date().toISOString() });
  if (error) {
    return NextResponse.json(
      { error: `설정 저장 실패: ${error.message}` },
      { status: 500 },
    );
  }

  // 제목·저작권·OG 문구가 루트 레이아웃과 모든 글에 걸려 있다.
  revalidateContent();

  return NextResponse.json(parsed.data);
}
