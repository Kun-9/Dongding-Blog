/**
 * 글 이미지 업로드 — multipart/form-data 의 "file" 을 Supabase Storage
 * (post-images/{slug}/{name})에 올리고 본문에 넣을 경로를 돌려준다.
 *
 * 돌려주는 URL 은 Storage 주소가 아니라 예전과 같은 `/posts/{slug}/{file}` 이다.
 * 그 경로는 next.config 의 fallback rewrite 가 Storage 로 넘겨준다 — 덕분에
 * 본문 마크다운이 짧게 유지되고, 나중에 저장소를 바꿔도 글은 그대로다.
 *
 * 파일명이 겹치면 `-1`, `-2` … 를 붙여 기존 이미지를 덮지 않는다. 글이 아직
 * 없어도 업로드할 수 있다 — Studio 가 자동저장 중인 초안에도 이미지를 붙인다.
 */
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/supabase";
import { requireApiUser } from "../../_shared";

const BUCKET = "post-images";
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

/**
 * Storage 키에는 한글·공백을 쓸 수 없다. 소문자 ASCII 로만 남긴다.
 * (이관 스크립트 scripts/upload-images.mjs 의 safeKey 와 같은 규칙)
 */
function sanitizeBaseName(name: string): string {
  const noExt = name.replace(/\.[^./\\]+$/, "");
  const ascii = noExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii || "image";
}

/** 이미 있는 이름이면 -1, -2 … 를 붙여 비어 있는 자리를 찾는다. */
async function pickAvailable(
  slug: string,
  base: string,
  ext: string,
): Promise<string> {
  const { data, error } = await dbAdmin()
    .storage.from(BUCKET)
    .list(slug, { limit: 1000 });
  if (error) throw new Error(`Storage 조회 실패: ${error.message}`);

  const taken = new Set((data ?? []).map((f) => f.name));
  for (let i = 0; ; i++) {
    const candidate = i === 0 ? `${base}.${ext}` : `${base}-${i}.${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "multipart/form-data 본문이 필요합니다" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "form 필드 'file' 이 필요합니다" },
      { status: 400 },
    );
  }

  const ext = MIME_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `지원하지 않는 mime: ${file.type || "unknown"}` },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다 (${file.size} bytes, 최대 ${MAX_BYTES})` },
      { status: 413 },
    );
  }

  const baseRaw = (form.get("name") as string | null) || file.name || "image";
  const filename = await pickAvailable(slug, sanitizeBaseName(baseRaw), ext);

  const bytes = await file.arrayBuffer();
  const { error } = await dbAdmin()
    .storage.from(BUCKET)
    .upload(`${slug}/${filename}`, bytes, { contentType: file.type });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { url: `/posts/${slug}/${filename}`, filename, bytes: bytes.byteLength },
    { status: 201 },
  );
}
