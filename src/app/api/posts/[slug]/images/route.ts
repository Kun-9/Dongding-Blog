/**
 * Dev-only image upload — POST multipart/form-data with field "file" saves
 * the binary under `public/posts/{slug}/{name}` and returns the public URL.
 *
 * On filename collision an incrementing `-1`, `-2`, … suffix is appended so
 * uploads never overwrite an existing asset. The post itself does NOT need
 * to exist yet — uploading to a slug that has no .md file is allowed so the
 * Studio can persist images alongside an autosaved draft.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { devGuard } from "../../_shared";

const PUBLIC_POSTS_DIR = path.join(process.cwd(), "public", "posts");
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

function sanitizeBaseName(name: string): string {
  // Strip extension; lowercase; non [a-z0-9-_] → "-"; collapse runs.
  const noExt = name.replace(/\.[^./\\]+$/, "");
  const ascii = noExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii || "image";
}

async function pickAvailable(
  dir: string,
  base: string,
  ext: string,
): Promise<string> {
  let i = 0;
  while (true) {
    const candidate = i === 0 ? `${base}.${ext}` : `${base}-${i}.${ext}`;
    try {
      await fs.access(path.join(dir, candidate));
      i++;
    } catch {
      return candidate;
    }
  }
}

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const blocked = devGuard();
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
      {
        error: `파일이 너무 큽니다 (${file.size} bytes, 최대 ${MAX_BYTES})`,
      },
      { status: 413 },
    );
  }

  const dir = path.join(PUBLIC_POSTS_DIR, slug);
  await fs.mkdir(dir, { recursive: true });

  const baseRaw = (form.get("name") as string | null) || file.name || "image";
  const base = sanitizeBaseName(baseRaw);
  const filename = await pickAvailable(dir, base, ext);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);

  const url = `/posts/${slug}/${filename}`;
  return NextResponse.json({ url, filename, bytes: buffer.length }, {
    status: 201,
  });
}
