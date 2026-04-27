import { NextResponse } from "next/server";
import {
  umamiConfigured,
  umamiGet,
  rangeFromDays,
} from "@/lib/umami-server";

export async function GET(req: Request) {
  if (!umamiConfigured()) {
    return NextResponse.json(
      { error: "UMAMI_API_KEY missing" },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "7");
  const unit = url.searchParams.get("unit") ?? "day";
  const { startAt, endAt } = rangeFromDays(days);
  try {
    const data = await umamiGet("pageviews", {
      startAt,
      endAt,
      unit,
      timezone: "Asia/Seoul",
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
