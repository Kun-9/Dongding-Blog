/**
 * Shared runtime helpers for the dev-only API surface.
 * Production builds (`BUILD_TARGET=static`) exclude API routes entirely;
 * the runtime guard here is belt-and-suspenders.
 */
import "server-only";

import { NextResponse } from "next/server";

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function devGuard(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return null;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
