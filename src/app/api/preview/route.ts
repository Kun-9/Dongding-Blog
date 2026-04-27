/**
 * Dev-only MDX preview compile endpoint.
 * Studio sends the body source on each debounce tick; we serialize it the same
 * way the post page does (same rehype plugins) and ship the result back so the
 * client can render via <MDXRemote/>.
 */
import { NextResponse } from "next/server";
import { serialize } from "next-mdx-remote/serialize";
import rehypeSlug from "rehype-slug";
import { devGuard } from "../posts/_shared";

export async function POST(req: Request) {
  const blocked = devGuard();
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const source =
    raw && typeof raw === "object" && "source" in raw
      ? (raw as { source: unknown }).source
      : null;
  if (typeof source !== "string") {
    return NextResponse.json({ error: "source must be a string" }, { status: 400 });
  }

  try {
    const result = await serialize(source, {
      mdxOptions: { rehypePlugins: [rehypeSlug] },
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
