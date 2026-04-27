/**
 * Latest discussion comments fetched via the GitHub GraphQL API.
 * Only runs server-side and only when GITHUB_TOKEN + Giscus env are set;
 * any failure path returns an empty array so the admin UI degrades to a
 * "no comments" empty state rather than crashing.
 */
import "server-only";

import { getAllPosts } from "@/lib/posts";

export interface RecentComment {
  who: string;
  when: string;
  body: string;
  postTitle: string;
  postSlug: string;
}

const QUERY = /* GraphQL */ `
  query ($owner: String!, $name: String!, $categoryId: ID!) {
    repository(owner: $owner, name: $name) {
      discussions(
        first: 30
        categoryId: $categoryId
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          title
          comments(last: 5) {
            nodes {
              author {
                login
              }
              bodyText
              createdAt
            }
          }
        }
      }
    }
  }
`;

interface GraphQLResponse {
  data?: {
    repository?: {
      discussions?: {
        nodes?: Array<{
          title: string;
          comments: {
            nodes: Array<{
              author: { login: string } | null;
              bodyText: string;
              createdAt: string;
            }>;
          };
        }>;
      };
    };
  };
}

function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${dd}`;
}

function pathnameToSlug(pathname: string): string | null {
  const m = pathname.match(/\/posts\/([^/]+)/);
  return m ? m[1] : null;
}

function truncate(s: string, max = 140): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export async function getRecentComments(limit = 3): Promise<RecentComment[]> {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !categoryId || !token) return [];

  const [owner, name] = repo.split("/");
  if (!owner || !name) return [];

  let json: GraphQLResponse;
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "dongding-blog-admin",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { owner, name, categoryId },
      }),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    json = (await res.json()) as GraphQLResponse;
  } catch {
    return [];
  }

  const discussions = json.data?.repository?.discussions?.nodes ?? [];
  const slugToTitle = new Map(
    getAllPosts().map((p) => [p.slug, p.title] as const),
  );

  const flat: Array<{ entry: RecentComment; ts: number }> = [];
  for (const d of discussions) {
    const slug = pathnameToSlug(d.title);
    const postTitle = slug
      ? (slugToTitle.get(slug) ?? d.title)
      : d.title;
    for (const c of d.comments.nodes) {
      flat.push({
        entry: {
          who: c.author?.login ?? "unknown",
          when: fmtRelative(c.createdAt),
          body: truncate(c.bodyText.replace(/\s+/g, " ").trim()),
          postTitle,
          postSlug: slug ?? "",
        },
        ts: new Date(c.createdAt).getTime(),
      });
    }
  }
  flat.sort((a, b) => b.ts - a.ts);
  return flat.slice(0, limit).map((x) => x.entry);
}
