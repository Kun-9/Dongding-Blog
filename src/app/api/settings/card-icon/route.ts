/**
 * 앱 주소에서 파비콘을 찾아 data URI 로 돌려준다.
 *
 * 링크 카드와 같은 규칙이다 — 주소를 매번 받아오지 않고 **가져오는 시점에**
 * 바이트를 박아 둔다. 남의 사이트가 죽어도 카드는 그대로 나온다.
 *
 * 찾지 못하면 그렇게 알려준다. 설정 화면은 그때 직접 업로드로 넘어간다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api-shared";
import { fetchOg, normalizeUrl } from "@/lib/og";

/** satori 가 그릴 수 있는 것만. ico·webp 는 카드에서 빈칸이 된다. */
const OK_TYPES = ["image/png", "image/jpeg", "image/gif", "image/svg+xml"];
const MAX_BYTES = 96 * 1024;

export async function POST(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const parsed = z
    .object({ url: z.string() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "주소를 넣어주세요" }, { status: 400 });
  }

  const target = normalizeUrl(parsed.data.url);
  if (!target) {
    return NextResponse.json({ error: "읽을 수 없는 주소" }, { status: 400 });
  }

  const { icon } = await fetchOg(target.toString());
  if (!icon) {
    return NextResponse.json(
      { error: "파비콘을 찾지 못했습니다 — 직접 올려주세요" },
      { status: 404 },
    );
  }

  let res: Response;
  try {
    res = await fetch(icon, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; dongding-blog-bot)" },
    });
  } catch {
    return NextResponse.json(
      { error: "파비콘을 받지 못했습니다 — 직접 올려주세요" },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: `파비콘 응답 ${res.status} — 직접 올려주세요` },
      { status: 502 },
    );
  }

  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!OK_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `카드가 못 그리는 형식(${type || "알 수 없음"}) — 직접 올려주세요` },
      { status: 415 },
    );
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "파비콘이 96KB 를 넘습니다 — 직접 올려주세요" },
      { status: 413 },
    );
  }

  const base64 = Buffer.from(bytes).toString("base64");
  return NextResponse.json({ icon: `data:${type};base64,${base64}` });
}
