/**
 * 설정 화면의 카드 미리보기. 저장하기 전 폼 값을 그대로 받아 실제 카드와
 * **같은 렌더러**로 SVG 를 그려 돌려준다 — 화면용 복제본을 따로 만들면 카드
 * 디자인을 고칠 때마다 미리보기가 조용히 거짓말을 하게 된다.
 *
 * 편집 화면 전용이라 로그인 검사를 건다. 아무나 부르면 이 도메인에서 임의
 * 문구를 그린 이미지를 뽑을 수 있게 된다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api-shared";
import { renderAppCard, renderBlogCard } from "@/lib/card-render";

const BodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("blog"),
    theme: z.enum(["light", "dark"]),
    label: z.string(),
    headline: z.array(z.string()),
    tagline: z.string(),
    host: z.string(),
  }),
  z.object({
    kind: z.literal("app"),
    theme: z.enum(["light", "dark"]),
    name: z.string(),
    desc: z.string(),
    host: z.string(),
    icon: z.string(),
  }),
]);

export async function POST(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const input = parsed.data;

  const svg =
    input.kind === "blog"
      ? await renderBlogCard(input, input.theme)
      : await renderAppCard(input, input.theme);

  // 타이핑마다 새로 그리는 값이라 캐시하지 않는다.
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
