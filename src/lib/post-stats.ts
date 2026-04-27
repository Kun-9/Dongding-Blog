/**
 * Aggregations over `getAllPosts()` for the admin dashboard.
 * The bucket array always ends on the current month; labels are
 * single-letter month initials to match the existing dashboard chart.
 */
import "server-only";

import { getAllPosts } from "@/lib/posts";

const MONTH_INITIAL = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

export interface MonthlyPublishBucket {
  ym: string;
  label: string;
  count: number;
  isCurrent: boolean;
}

function ym(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function isoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getMonthlyPublishCounts(months = 12): MonthlyPublishBucket[] {
  const counts = new Map<string, number>();
  for (const p of getAllPosts()) {
    const key = p.date.slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const now = new Date();
  const buckets: MonthlyPublishBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = ym(d);
    buckets.push({
      ym: key,
      label: MONTH_INITIAL[d.getMonth()],
      count: counts.get(key) ?? 0,
      isCurrent: i === 0,
    });
  }
  return buckets;
}

export function getPublishedThisWeek(): number {
  const now = new Date();
  const day = now.getDay();
  const offsetToMon = day === 0 ? 6 : day - 1;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - offsetToMon,
  );
  const mondayIso = isoLocal(monday);
  return getAllPosts().filter((p) => p.date >= mondayIso).length;
}
