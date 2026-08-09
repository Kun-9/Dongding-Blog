/**
 * 글 생성 API — Supabase `posts` 에 새 행을 넣는다.
 * slug 는 unique 라 충돌하면 409 로 기존 slug 를 돌려준다.
 */
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/supabase";
import { syncLinkMeta } from "@/lib/link-meta";
import { getAllPosts, getFeaturedPost } from "@/lib/posts";
import { getCategory } from "@/lib/categories";
import { PostBodySchema, requireApiUser, revalidateContent, toRow } from "./_shared";

/** unique 위반 — 같은 slug 가 이미 있다. */
const UNIQUE_VIOLATION = "23505";

/**
 * 설정 화면 SEO 미리보기가 쓸 표본 글 한 건. 공개된 글의 메타만 돌려주므로
 * 인증을 걸지 않는다 — 어차피 목록 페이지에 다 나와 있는 값이다.
 * 필드 구성은 글 OG 이미지(`posts/[slug]/opengraph-image.tsx`)가 그리는 것과
 * 맞춘다. 미리보기가 실물과 다르면 없느니만 못하다.
 * ponytail: 표본 한 건만 준다. 목록이 필요해지면 그때 페이징을 붙인다.
 */
export async function GET() {
  const sample = (await getFeaturedPost()) ?? (await getAllPosts())[0];
  if (!sample) return NextResponse.json(null);

  const cat = await getCategory(sample.category);

  return NextResponse.json({
    slug: sample.slug,
    title: sample.title,
    summary: sample.summary,
    date: sample.date,
    readTime: sample.readTime,
    label: cat?.name ?? null,
  });
}

export async function POST(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const { error } = await dbAdmin().from("posts").insert(toRow(data));

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: "이미 존재하는 slug입니다", slug: data.slug },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 링크 카드 메타 수집. 남의 사이트가 죽어 있다고 저장이 실패하면 안 된다.
  await syncLinkMeta(data.body).catch(() => {});

  revalidateContent();
  return NextResponse.json({ slug: data.slug }, { status: 201 });
}
