/**
 * 릴리스 글 실행기 API — 루틴(Claude Code 세션)이 curl 로 부른다.
 *
 * kakepu 의 /api/ai/* 와 같은 방식이다. 블로그 MCP 커넥터 없이도 돌게 하려고
 * MCP 도구가 하던 일을 HTTP 로 연다. 루틴 API 로 깨운 새 세션에는 커넥터가
 * 붙지 않아서, 커넥터에 기대면 즉시 실행이 안 된다.
 *
 * 인증은 정적 Bearer(RELEASE_WORKER_TOKEN). 할 수 있는 일은 실행기 몫으로
 * 좁힌다: 발행은 못 하고(advance 가 발행 단계를 거절), 글 생성은 draft 만,
 * 수정과 이미지 업로드는 릴리스 주제에 묶인 draft 글에만.
 *
 * GET  → 지시서(markdown). 토큰 없이 연다 — 비밀값이 없고, 첫 호출에 토큰이
 *        실리면 루틴의 권한 분류기가 Data Exfiltration 으로 막을 수 있다.
 * POST → { action, ... }
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/supabase";
import { revalidateContent } from "@/lib/api-shared";
import { syncLinkMeta } from "@/lib/link-meta";
import { postExists, toRow, PostBodySchema } from "@/app/api/posts/_shared";
import { applyReplacements, loadPost, loadTaxonomy } from "@/lib/mcp-blog";
import { checkVoice, guide, releaseDay } from "@/lib/voice";
import { WORKER_PROMPT } from "@/lib/release-worker";
import { readPage } from "@/lib/trends";
import {
  TopicError,
  advanceTopic,
  claimAiWork,
  finishAi,
  kindOfSlug,
  reportAi,
  saveNotes,
} from "@/lib/release-topics";
import { nextStage } from "@/lib/release-stages";
import type { TopicRow } from "@/lib/release-topics";

const SLUG = z.string().regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);
const ID = z.number().int();
const KIND = z.enum(["release", "concept"]);
const BUCKET = "post-images";

function authorized(req: Request): boolean {
  const expected = process.env.RELEASE_WORKER_TOKEN;
  if (!expected) return false;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function deny() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

const ok = (value: unknown) => NextResponse.json(value);
const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

function withNext(t: TopicRow) {
  const next = nextStage(t.stage);
  return { ...t, next: next ? { stage: next.key, label: next.label, todo: next.todo } : null };
}

/** 실행기가 손댈 수 있는 글인가 — 진행 중(접거나 버리지 않은) 릴리스 주제에 묶인 draft 만. */
async function assertWorkerPost(slug: string) {
  const { data } = await dbAdmin()
    .from("release_topics")
    .select("id")
    .eq("post_slug", slug)
    .is("dropped_reason", null)
    .limit(1);
  if (!data?.length) throw new TopicError(`'${slug}' 는 릴리스 주제에 묶인 글이 아니다`);
  const post = await loadPost(slug);
  if (post && post.visibility !== "draft") {
    throw new TopicError(`'${slug}' 는 draft 가 아니다. 실행기는 draft 만 고친다`);
  }
  return post;
}

const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("claim"), id: ID.optional() }),
  z.object({ action: z.literal("report"), id: ID, message: z.string().min(1).max(200) }),
  z.object({
    action: z.literal("finish"),
    id: ID,
    ok: z.boolean(),
    message: z.string().min(1).max(500),
    todo: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal("notes"),
    id: ID,
    markdown: z.string().min(1).max(50_000),
    mode: z.enum(["append", "replace"]).default("append"),
  }),
  z.object({
    action: z.literal("advance"),
    id: ID,
    note: z.string().min(1).max(2000),
    postSlug: SLUG.optional(),
  }),
  z.object({ action: z.literal("candidates"), ids: z.array(z.string()).min(1).max(10) }),
  z.object({ action: z.literal("taxonomy") }),
  z.object({ action: z.literal("slugs") }),
  z.object({ action: z.literal("post_get"), slug: SLUG }),
  z.object({
    action: z.literal("post_create"),
    slug: SLUG,
    title: z.string().min(1).max(200),
    summary: z.string().min(1).max(300),
    category: z.string().min(1),
    tags: z.array(z.string()).max(10).default([]),
    body: z.string().min(1).max(200_000),
  }),
  z.object({
    action: z.literal("post_update"),
    slug: SLUG,
    title: z.string().min(1).max(200).optional(),
    summary: z.string().min(1).max(300).optional(),
    tags: z.array(z.string()).max(10).optional(),
    replacements: z.array(z.object({ old: z.string().min(1), new: z.string() })).max(50).optional(),
    /** 본문 통째 교체 — 초안을 다시 쓸 때. replacements 와 같이 쓰지 않는다. */
    body: z.string().min(1).max(200_000).optional(),
  }),
  z.object({
    action: z.literal("check"),
    slug: SLUG.optional(),
    title: z.string().optional(),
    body: z.string().optional(),
    /** 없으면 slug 가 묶인 주제의 종류, body 만 있으면 릴리스. */
    kind: KIND.optional(),
  }),
  z.object({
    action: z.literal("image"),
    slug: SLUG,
    name: z.string().regex(/^[a-z0-9][a-z0-9-]*\.(svg|png|jpg|jpeg|webp)$/),
    svg: z.string().max(500_000).optional(),
    base64: z.string().max(8_000_000).optional(),
  }),
  z.object({ action: z.literal("read"), url: z.string().url() }),
  z.object({ action: z.literal("guide"), kind: KIND }),
]);

export async function GET() {
  return new Response(WORKER_PROMPT, {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return deny();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad("JSON 본문이 아니다");
  }
  const parsed = Action.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return bad(`입력 오류: ${i ? `${i.path.join(".")} ${i.message}` : "형식"}`);
  }
  const input = parsed.data;

  try {
    switch (input.action) {
      case "claim": {
        const t = await claimAiWork(input.id);
        return ok({ work: t ? withNext(t) : null });
      }
      case "report":
        return ok(withNext(await reportAi(input.id, input.message)));
      case "finish":
        return ok(withNext(await finishAi(input.id, input.ok, input.message, input.todo)));
      case "notes":
        return ok(withNext(await saveNotes(input.id, input.markdown, input.mode)));
      case "advance":
        // 발행은 허용하지 않는다(allowPublish 기본 false).
        return ok(withNext(await advanceTopic(input.id, { note: input.note, postSlug: input.postSlug })));

      case "candidates": {
        const { data, error } = await dbAdmin()
          .from("release_candidates")
          .select("id, repo, tag, name, published_at, url, body")
          .in("id", input.ids);
        if (error) throw new Error(error.message);
        // released: 글 요약 박스에 그대로 쓰는 한국 날짜 배포일.
        return ok({ candidates: data.map((c) => ({ ...c, released: releaseDay(c.published_at) })) });
      }
      case "taxonomy": {
        const tax = await loadTaxonomy();
        const { data } = await dbAdmin().from("posts").select("tags");
        const tags = [...new Set((data ?? []).flatMap((p) => (p.tags as string[]) ?? []))].sort();
        return ok({ categories: tax.categories, tags });
      }
      case "slugs": {
        const { data } = await dbAdmin().from("posts").select("slug");
        return ok({ slugs: (data ?? []).map((p) => p.slug) });
      }
      case "post_get": {
        const post = await loadPost(input.slug);
        return post ? ok({ post }) : bad("없는 글", 404);
      }

      case "post_create": {
        const { data: topic } = await dbAdmin()
          .from("release_topics")
          .select("id")
          .eq("post_slug", input.slug)
          .is("dropped_reason", null)
          .limit(1);
        if (!topic?.length) {
          return bad("먼저 assets 단계 advance 에서 postSlug 를 정해야 초안을 만들 수 있다");
        }
        if (await postExists(input.slug)) return bad(`'${input.slug}' 는 이미 있는 slug 다`);
        const body = PostBodySchema.parse({ ...input, visibility: "draft" });
        const { error } = await dbAdmin().from("posts").insert(toRow(body));
        if (error) throw new Error(`생성 실패: ${error.message}`);
        await syncLinkMeta(input.body).catch(() => {});
        revalidateContent();
        const created = await loadPost(input.slug);
        return ok({ created: input.slug, voice: created ? checkVoice(created, await kindOfSlug(input.slug)) : null });
      }

      case "post_update": {
        const post = await assertWorkerPost(input.slug);
        if (!post) return bad("없는 글", 404);
        if (input.body && input.replacements?.length) return bad("body 와 replacements 는 같이 쓰지 않는다");
        const body = input.body
          ? input.body
          : input.replacements?.length
            ? applyReplacements(post.body, input.replacements)
            : post.body;
        const patch = {
          body: body.endsWith("\n") ? body : `${body}\n`,
          ...(input.title ? { title: input.title } : {}),
          ...(input.summary ? { summary: input.summary } : {}),
          ...(input.tags ? { tags: input.tags } : {}),
        };
        const { error } = await dbAdmin().from("posts").update(patch).eq("slug", input.slug);
        if (error) throw new Error(`수정 실패: ${error.message}`);
        await syncLinkMeta(body).catch(() => {});
        revalidateContent();
        const updated = await loadPost(input.slug);
        return ok({ updated: input.slug, voice: updated ? checkVoice(updated, await kindOfSlug(input.slug)) : null });
      }

      case "check": {
        if (input.slug) {
          const post = await loadPost(input.slug);
          return post ? ok(checkVoice(post, input.kind ?? (await kindOfSlug(input.slug)))) : bad("없는 글", 404);
        }
        if (!input.body) return bad("slug 나 body 중 하나는 있어야 한다");
        return ok(checkVoice({ title: input.title ?? "", summary: "", body: input.body }, input.kind));
      }

      case "image": {
        await assertWorkerPost(input.slug);
        if (!input.svg && !input.base64) return bad("svg 나 base64 중 하나는 있어야 한다");
        const ext = input.name.split(".").pop()!;
        if (ext === "svg" && !input.svg) return bad(".svg 는 svg 에 원문을 넣는다");
        if (input.svg && /<script|\son\w+\s*=|<foreignObject|(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/)/i.test(input.svg)) {
          return bad("SVG 에 script·이벤트 속성·foreignObject·외부 링크는 넣을 수 없다");
        }
        const type =
          ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        const bytes = input.svg ? new TextEncoder().encode(input.svg) : Buffer.from(input.base64!, "base64");
        const { error } = await dbAdmin()
          .storage.from(BUCKET)
          .upload(`${input.slug}/${input.name}`, bytes, { contentType: type, upsert: true });
        if (error) throw new Error(`업로드 실패: ${error.message}`);
        const path = `/posts/${input.slug}/${input.name}`;
        return ok({ path, markdown: `![설명](${path})` });
      }

      case "read":
        return ok(await readPage(input.url));

      case "guide":
        return new Response(guide(input.kind), { headers: { "content-type": "text/markdown; charset=utf-8" } });
    }
  } catch (e) {
    if (e instanceof TopicError) return bad(e.message, e.status);
    return bad(e instanceof Error ? e.message : "실패", 500);
  }
}
