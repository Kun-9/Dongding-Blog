/**
 * Dev-only stats endpoint — feeds the Settings page CategoryManager with
 * post-count badges and the "글이 매핑됐어요" deletion guard. Production
 * builds exclude API routes; the devGuard is a runtime safety net.
 */
import { NextResponse } from "next/server";
import { getCategoriesWithCounts } from "@/lib/category-stats";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return NextResponse.json(getCategoriesWithCounts());
}
