/**
 * 릴리스 글감 탐색기 API — 매일 수집 직후 도는 탐색 루틴이 curl 로 부른다.
 *
 * 실행기 API(../worker)와 같은 토큰(RELEASE_WORKER_TOKEN)을 쓴다. 할 수 있는
 * 일은 탐색기 몫으로 좁힌다: 새 글감 읽기, 주제 만들기, new 글감 건너뛰기.
 * 사람이 정한 글감 상태와 이미 있는 주제는 바꾸지 못한다.
 *
 * GET  → 지시서(markdown)
 * POST → { action, ... }
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/supabase";
import { SCOUT_PROMPT } from "@/lib/release-scout";
import { TopicError, createTopic, getTopics, saveNotes } from "@/lib/release-topics";

/** 글감 본문은 분류에 이 정도면 족하다. 수십 건을 한 세션에서 읽는다. */
const BODY_LIMIT = 8_000;

function authorized(req: Request): boolean {
  const expected = process.env.RELEASE_WORKER_TOKEN;
  if (!expected) return false;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const deny = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const ok = (value: unknown) => NextResponse.json(value);
const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

const IDS = z.array(z.string().min(1)).min(1);

const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("inbox") }),
  z.object({ action: z.literal("candidates"), ids: IDS.max(10) }),
  z.object({ action: z.literal("topics") }),
  z.object({
    action: z.literal("topic_create"),
    title: z.string().min(1).max(120),
    angle: z.string().min(1).max(300),
    candidateIds: IDS.max(50).optional(),
    notes: z.string().min(1).max(20_000),
  }),
  z.object({ action: z.literal("skip"), ids: IDS.max(50), note: z.string().min(1).max(200) }),
]);

export async function GET(req: Request) {
  if (!authorized(req)) return deny();
  return new Response(SCOUT_PROMPT, {
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
  const db = dbAdmin();

  try {
    switch (input.action) {
      case "inbox": {
        const sources = await db.from("release_sources").select("repo").eq("enabled", true).order("sort");
        if (sources.error) throw new Error(sources.error.message);
        const repos = sources.data.map((s) => s.repo);
        // 추적을 끈 레포의 글감은 사람 몫으로 남긴다. 탐색기는 켜 둔 레포만 본다.
        const fresh = await db
          .from("release_candidates")
          .select("id, repo, tag, name, published_at, url")
          .eq("status", "new")
          .in("repo", repos)
          .order("published_at", { ascending: false })
          .limit(300);
        if (fresh.error) throw new Error(fresh.error.message);
        return ok({ sources: repos, candidates: fresh.data });
      }

      case "candidates": {
        const { data, error } = await db
          .from("release_candidates")
          .select("id, repo, tag, name, published_at, url, status, body")
          .in("id", input.ids);
        if (error) throw new Error(error.message);
        return ok({
          candidates: data.map(({ body, ...c }) => ({
            ...c,
            body: (body ?? "").slice(0, BODY_LIMIT),
            truncated: (body ?? "").length > BODY_LIMIT,
          })),
        });
      }

      case "topics": {
        const topics = await getTopics();
        return ok({
          topics: topics.map((t) => ({
            id: t.id,
            title: t.title,
            angle: t.angle,
            stage: t.stage,
            droppedReason: t.droppedReason,
            candidateIds: t.candidates.map((c) => c.id),
          })),
        });
      }

      case "topic_create": {
        const ids = input.candidateIds ?? [];
        if (ids.length) {
          const { data, error } = await db.from("release_candidates").select("id, status").in("id", ids);
          if (error) throw new Error(error.message);
          const fresh = new Set(data.filter((c) => c.status === "new").map((c) => c.id));
          const rejected = ids.filter((id) => !fresh.has(id));
          if (rejected.length) return bad(`new 가 아니거나 없는 글감: ${rejected.join(", ")}`);
        }
        const created = await createTopic({ title: input.title, angle: input.angle, candidateIds: ids });
        const t = await saveNotes(created.id, input.notes, "replace");
        return ok({ created: { id: t.id, title: t.title, candidateIds: t.candidates.map((c) => c.id) } });
      }

      case "skip": {
        // new 인 것만 바꾼다. 사람이 정한 상태는 그대로 둔다.
        const { data, error } = await db
          .from("release_candidates")
          .update({ status: "skipped", note: input.note })
          .in("id", input.ids)
          .eq("status", "new")
          .select("id");
        if (error) throw new Error(error.message);
        return ok({ skipped: data.map((c) => c.id) });
      }
    }
  } catch (e) {
    if (e instanceof TopicError) return bad(e.message, e.status);
    return bad(e instanceof Error ? e.message : "실패", 500);
  }
}
