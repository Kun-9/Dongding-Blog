/**
 * 글 주제 — 목록(GET), 만들기(POST), 단계 이동·편집·AI 맡기기·접기·버리기(PATCH).
 *
 * 지우는 길은 없다. 쓰지 않을 주제는 버린다 — 초안과 노트는 지워도 무엇을
 * 왜 버렸는지는 남는다.
 *
 * 규칙은 `lib/release-topics` 에 있다. 여기는 입력 검증과 상태 코드만 맡는다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-shared";
import {
  AI_UNTIL,
  TopicError,
  advanceTopic,
  cancelAi,
  queueAi,
  createTopic,
  discardTopic,
  dropTopic,
  editTopic,
  getTopics,
  revertTopic,
} from "@/lib/release-topics";
import { STAGES, type StageKey } from "@/lib/release-stages";

const Title = z.string().trim().min(1).max(120);
const Angle = z.string().trim().max(300).nullable();
const CandidateIds = z.array(z.string().min(1)).max(50);

const CreateSchema = z.object({
  title: Title,
  angle: Angle.optional(),
  candidateIds: CandidateIds.optional(),
});

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("advance"),
    id: z.number().int(),
    note: z.string().trim().min(1, "근거를 남겨주세요").max(2000),
    postSlug: z.string().trim().min(1).max(120).nullable().optional(),
    /** 넘어갈 단계. 다르면 거절한다 — 띄워 둔 화면에서 엉뚱한 단계를 넘기지 않게. */
    expect: z.enum(STAGES.map((s) => s.key) as [StageKey, ...StageKey[]]).optional(),
  }),
  z.object({ action: z.literal("revert"), id: z.number().int() }),
  z.object({
    action: z.literal("drop"),
    id: z.number().int(),
    reason: z.string().trim().min(1).max(300).nullable(),
  }),
  z.object({
    action: z.literal("discard"),
    id: z.number().int(),
    reason: z.string().trim().min(1, "버리는 이유를 적어 주세요").max(300),
  }),
  z.object({
    action: z.literal("ai"),
    id: z.number().int(),
    until: z.enum(AI_UNTIL as [string, ...string[]]),
    /** 예약 — 루틴을 깨우지 않고 로컬 CLI 가 집기를 기다린다. */
    local: z.boolean().default(false),
    /** 고치기 지시. 발행 대기 초안을 이 지시대로 고치게 맡긴다. */
    prompt: z.string().trim().min(1, "지시를 써 주세요").max(2000).optional(),
  }),
  z.object({ action: z.literal("ai_cancel"), id: z.number().int() }),
  z.object({
    action: z.literal("edit"),
    id: z.number().int(),
    title: Title.optional(),
    angle: Angle.optional(),
    candidateIds: CandidateIds.optional(),
  }),
]);

async function parse<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<z.infer<T> | NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return NextResponse.json(
      { error: first ?? "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  return parsed.data;
}

function failed(e: unknown) {
  if (e instanceof TopicError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "실패" },
    { status: 500 },
  );
}

/** 화면이 AI 작업 상태를 다시 읽을 때 쓴다. */
export async function GET() {
  const blocked = await requireApiUser();
  if (blocked) return blocked;
  try {
    return NextResponse.json({ topics: await getTopics() });
  } catch (e) {
    return failed(e);
  }
}

export async function POST(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;
  const input = await parse(req, CreateSchema);
  if (input instanceof NextResponse) return input;

  try {
    return NextResponse.json({ topic: await createTopic(input) });
  } catch (e) {
    return failed(e);
  }
}

export async function PATCH(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;
  const input = await parse(req, PatchSchema);
  if (input instanceof NextResponse) return input;

  try {
    // 버리기는 무시로 옮긴 글감 id 도 돌려준다. 화면의 글감 목록을 맞춘다.
    if (input.action === "discard") {
      return NextResponse.json(await discardTopic(input.id, input.reason));
    }
    const topic =
      input.action === "advance"
        ? await advanceTopic(input.id, input, { allowPublish: true })
        : input.action === "revert"
          ? await revertTopic(input.id)
          : input.action === "drop"
            ? await dropTopic(input.id, input.reason)
            : input.action === "ai"
              ? await queueAi(input.id, input.until as (typeof AI_UNTIL)[number], input.local, input.prompt ?? null)
              : input.action === "ai_cancel"
                ? await cancelAi(input.id)
                : await editTopic(input.id, input);
    return NextResponse.json({ topic });
  } catch (e) {
    return failed(e);
  }
}
