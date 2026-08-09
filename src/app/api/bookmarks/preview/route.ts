/**
 * 링크롤 입력 폼이 URL 을 붙여넣었을 때 제목·출처를 채워 주는 창구.
 * 실제 수집은 `lib/og` 가 한다 — 링크 프리뷰 카드와 같은 코드를 쓴다.
 */
import { NextResponse } from "next/server";
import { fetchOg, normalizeUrl } from "@/lib/og";
import { requireApiUser } from "../_shared";

export async function GET(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const rawUrl = (searchParams.get("url") ?? "").trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  if (!normalizeUrl(rawUrl)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const { title, source } = await fetchOg(rawUrl);
  return NextResponse.json({ title, source });
}
