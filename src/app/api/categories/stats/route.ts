/**
 * Dev-only stats endpoint — feeds the Settings page CategoryManager with
 * post-count badges and the "글이 매핑됐어요" deletion guard. Production
 * builds exclude API routes; the devGuard is a runtime safety net.
 */
import { NextResponse } from "next/server";
import { getCategoriesWithCounts } from "@/lib/category-stats";
import { devGuard } from "../../posts/_shared";

export async function GET() {
  const blocked = devGuard();
  if (blocked) return blocked;
  return NextResponse.json(getCategoriesWithCounts());
}
