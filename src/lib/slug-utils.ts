/**
 * Slug helpers — shared between Studio (post/series creation) and any
 * client validation. The regex matches the server-side `SLUG_RE` in
 * `lib/api-shared.ts`; keep them in lockstep.
 */

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const MAX_TITLE_SLUG_LENGTH = 60;

/**
 * Derive a slug from a free-form title. Strips disallowed characters first,
 * collapses whitespace, then trims and caps at 60 chars.
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_TITLE_SLUG_LENGTH);
}

/**
 * Normalize a user-typed slug — accepts what the user wrote, fixes case,
 * collapses spaces and dashes, and drops any disallowed characters.
 * Does NOT trim edges (leaves dashes if user typed them).
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-");
}
