/**
 * 개념 글감 찾기 — 어드민에서 큰 주제(area)를 골라 누르면 실행기 루틴을
 * `scout=concept area=<key>` 로 깨운다. 루틴은 개념 글감 탐색기 지시서
 * (`/api/releases/scout/?kind=concept`)를 따라 주제를 만들고 끝낸다.
 *
 * 정기 실행은 없다. 루틴의 API 트리거 토큰은 루틴마다 따로라, 새 루틴 대신
 * "AI에게 맡기기"가 쓰는 실행기 트리거를 같이 쓴다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-shared";
import { CONCEPT_AREA_KEYS } from "@/lib/concept-areas";
import { fireReleaseRoutine } from "@/lib/routine-fire";

const Body = z.object({ area: z.enum(CONCEPT_AREA_KEYS) });

export async function POST(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "큰 주제를 고르세요" }, { status: 400 });

  const fire = await fireReleaseRoutine(`scout=concept area=${parsed.data.area}`);
  return NextResponse.json(fire, { status: fire.fired ? 200 : 503 });
}
