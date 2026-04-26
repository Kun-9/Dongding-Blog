/**
 * Tistory backup → MDX migrator.
 *
 * Tistory exports a single XML file containing every published post.
 * This script:
 *   1. parses the XML (fast-xml-parser)
 *   2. converts each entry's HTML body to Markdown (turndown)
 *   3. downloads inline images into public/images/posts/<slug>/
 *   4. writes content/posts/<slug>.mdx with normalized frontmatter
 *
 * Run:
 *   pnpm tsx scripts/migrate-tistory.ts <path-to-tistory.xml>
 *
 * Idempotent — re-running with the same input rewrites the same files.
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { XMLParser } from "fast-xml-parser";
import TurndownService from "turndown";

interface CliArgs {
  xmlPath: string;
}

function parseArgs(): CliArgs {
  const xmlPath = process.argv[2];
  if (!xmlPath) {
    console.error("Usage: tsx scripts/migrate-tistory.ts <path-to-tistory.xml>");
    process.exit(1);
  }
  return { xmlPath };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function inferCategory(rawCat: string | undefined): string {
  if (!rawCat) return "system";
  const c = rawCat.toLowerCase();
  if (/(jpa|mysql|db|index|innodb|hibernate)/.test(c)) return "db";
  if (/(spring|boot|aop)/.test(c)) return "spring";
  if (/(java|jvm|동시성|record)/.test(c)) return "java";
  if (/(면접|interview|cs)/.test(c)) return "interview";
  return "system";
}

function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadImage(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const out = fs.createWriteStream(dest);
        res.pipe(out);
        out.on("finish", () => out.close(() => resolve()));
      })
      .on("error", reject);
  });
}

interface TistoryEntry {
  title?: string;
  category?: string;
  tag?: string | string[];
  published?: string;
  content?: { "#text"?: string; "@_type"?: string };
  // …other Tistory fields are ignored.
}

async function main() {
  const { xmlPath } = parseArgs();
  if (!fs.existsSync(xmlPath)) {
    console.error(`File not found: ${xmlPath}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(xmlPath, "utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: "__cdata",
    textNodeName: "#text",
  });
  const parsed = parser.parse(xml);

  // Tistory backup root: <tistory><posts><post>… or <feed><entry>…
  const entries: TistoryEntry[] =
    parsed?.tistory?.posts?.post ??
    parsed?.feed?.entry ??
    [];

  if (!Array.isArray(entries) || entries.length === 0) {
    console.error("No entries found. Check XML structure (expected tistory/posts/post or feed/entry).");
    process.exit(1);
  }

  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  td.addRule("preserveCodeFences", {
    filter: ["pre"],
    replacement: (content, node) => {
      const codeEl = (node as Element).querySelector?.("code");
      const lang = codeEl?.className?.match(/language-([\w-]+)/)?.[1] ?? "";
      const text = codeEl?.textContent ?? content;
      return `\n\n\`\`\`${lang}\n${text.trimEnd()}\n\`\`\`\n\n`;
    },
  });

  const outDir = path.resolve("content/posts");
  fs.mkdirSync(outDir, { recursive: true });
  const imageRoot = path.resolve("public/images/posts");

  let count = 0;
  for (const entry of entries) {
    const title = entry.title?.toString().trim();
    if (!title) continue;
    const slug = slugify(title);
    const date =
      entry.published?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const category = inferCategory(entry.category);
    const tags = Array.isArray(entry.tag)
      ? entry.tag
      : entry.tag
        ? [entry.tag]
        : [];

    let html =
      entry.content?.["#text"] ??
      (typeof entry.content === "string" ? entry.content : "") ??
      "";

    const imgDir = path.join(imageRoot, slug);
    fs.mkdirSync(imgDir, { recursive: true });
    const imgUrls = [...html.matchAll(/<img[^>]+src=['"]([^'"]+)['"]/g)].map(
      (m) => m[1],
    );
    let i = 0;
    for (const src of imgUrls) {
      try {
        const ext = path.extname(new URL(src).pathname).slice(1) || "png";
        const localName = `${String(++i).padStart(2, "0")}.${ext}`;
        await downloadImage(src, path.join(imgDir, localName));
        html = html.replaceAll(src, `/images/posts/${slug}/${localName}`);
      } catch (err) {
        console.warn(`  ! image fetch failed (${src}): ${(err as Error).message}`);
      }
    }

    const md = td.turndown(html).trim();
    const summary = md
      .split("\n")
      .find((l) => l.length > 30)
      ?.replace(/[#*`>]/g, "")
      .slice(0, 160) ?? title;

    const fm = [
      "---",
      `title: ${JSON.stringify(title)}`,
      `summary: ${JSON.stringify(summary)}`,
      `category: ${JSON.stringify(category)}`,
      `tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]`,
      `date: ${JSON.stringify(date)}`,
      "---",
      "",
    ].join("\n");

    fs.writeFileSync(path.join(outDir, `${slug}.mdx`), fm + md + "\n");
    count++;
    console.log(`✓ ${slug}.mdx`);
  }

  console.log(`\n${count} posts migrated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
