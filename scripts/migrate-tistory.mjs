#!/usr/bin/env node
/**
 * Tistory backup → markdown migrator.
 * Source: /Users/kun-macbook/Downloads/dong-ding-1-1/{n}/{*.html, img/}
 * Target: content/posts/{slug}.mdx + public/posts/{slug}/{img}
 *
 * --dry-run : print plan table only (no writes)
 */
import fs from "node:fs";
import path from "node:path";
import TurndownService from "turndown";

const SOURCE = "/Users/kun-macbook/Downloads/dong-ding-1-1";
const PROJECT = process.cwd();
const POSTS_OUT = path.join(PROJECT, "content/posts");
const PUBLIC_OUT = path.join(PROJECT, "public/posts");

const SKIP = new Set(["8", "19"]);

const PLAN = {
  "2":  { slug: "github-actions-spring-boot-aws-ci-cd", category: "system",
          summary: "GitHub Actions로 Spring Boot 앱을 AWS EC2에 자동 배포하는 CI/CD 파이프라인을 구축한다." },
  "3":  { slug: "dfs-bfs-baekjoon-1260", category: "algorithm",
          summary: "DFS와 BFS의 개념을 정리하고 백준 1260번을 자바로 풀어본다." },
  "4":  { slug: "java-testing-basics", category: "java",
          summary: "JUnit과 자바 테스트 작성의 기초 개념을 정리한다." },
  "5":  { slug: "baekjoon-2178-maze", category: "algorithm",
          summary: "백준 2178번 미로탐색 문제를 BFS로 푼다." },
  "6":  { slug: "baekjoon-2606-virus", category: "algorithm",
          summary: "백준 2606번 바이러스 문제 풀이." },
  "7":  { slug: "baekjoon-2667-apartment-numbering", category: "algorithm",
          summary: "백준 2667번 단지번호붙이기 풀이." },
  "9":  { slug: "baekjoon-2644-kinship", category: "algorithm",
          summary: "백준 2644번 촌수계산 풀이." },
  "10": { slug: "baekjoon-2468-safe-area", category: "algorithm",
          summary: "백준 2468번 안전 영역 풀이." },
  "11": { slug: "baekjoon-7569-tomato", category: "algorithm",
          summary: "백준 7569번 토마토 풀이." },
  "12": { slug: "baekjoon-2573-iceberg", category: "algorithm",
          summary: "백준 2573번 빙산 풀이." },
  "13": { slug: "baekjoon-9205-beer-walk", category: "algorithm",
          summary: "백준 9205번 맥주 마시면서 걸어가기 풀이." },
  "14": { slug: "baekjoon-14503-robot-cleaner", category: "algorithm",
          summary: "백준 14503번 로봇 청소기 풀이." },
  "15": { slug: "binary-search-decision-stable", category: "algorithm",
          summary: "결정 알고리즘과 이분탐색 — 마구간 정하기 예제 풀이." },
  "16": { slug: "kakao-api-login", category: "spring",
          summary: "카카오 OAuth API로 로그인 기능을 직접 구현한다." },
  "17": { slug: "baekjoon-3085-candy-game", category: "algorithm",
          summary: "백준 3085번 사탕 게임 풀이." },
  "18": { slug: "spring-mvc-architecture", category: "java",
          summary: "Spring MVC의 요청 처리 흐름과 핵심 컴포넌트 구조를 정리한다." },
  "20": { slug: "cloudwatch-dashboard", category: "system",
          summary: "AWS CloudWatch로 운영 대시보드를 구성한다." },
  "21": { slug: "aws-secrets-manager-kms", category: "system",
          summary: "AWS Secrets Manager와 KMS로 민감 정보를 안전하게 관리한다." },
};

const isDryRun = process.argv.includes("--dry-run");

function getMatch(re, s) {
  const m = re.exec(s);
  return m ? m[1] : "";
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/ /g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseHtml(html) {
  const title = decodeEntities(getMatch(/<h2 class="title-article">([\s\S]*?)<\/h2>/, html)).trim();
  const dateRaw = getMatch(/<p class="date">([^<]+)<\/p>/, html).trim();
  const date = dateRaw.slice(0, 10); // YYYY-MM-DD
  const tagBlock = getMatch(/<div class="tags">([\s\S]*?)<\/div>/, html);
  const tags = [...tagBlock.matchAll(/#([^\s#]+(?:\s[^\s#]+)*)/g)]
    .map((m) => m[1].trim().toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-"))
    .filter(Boolean);

  // Body sits between contents_style start and the trailing tags div.
  const start = html.indexOf('<div class="contents_style">');
  const end = html.indexOf('<div class="tags">');
  if (start === -1 || end === -1) throw new Error("contents not found");
  let body = html.slice(start + '<div class="contents_style">'.length, end);
  // Trim trailing closing divs and breaks left over from the wrapper.
  body = body.replace(/(?:\s*<\/?div[^>]*>|\s*<br\s*\/?>)+\s*$/i, "");
  return { title, date, tags, body };
}

function makeTurndown() {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    fence: "```",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });

  // Strip color spans / size attrs etc — keep only text content.
  td.addRule("plainSpan", {
    filter: "span",
    replacement: (content) => content,
  });

  // Tistory codeblock: <pre data-ke-type="codeblock" data-ke-language="java"><code>...</code></pre>
  td.addRule("tistoryCode", {
    filter: (node) =>
      node.nodeName === "PRE" &&
      node.getAttribute &&
      node.getAttribute("data-ke-type") === "codeblock",
    replacement: (_content, node) => {
      const lang = (node.getAttribute("data-ke-language") || "").trim();
      const codeEl = node.querySelector("code") || node;
      const code = codeEl.textContent.replace(/\s+$/g, "");
      return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    },
  });

  // <figure><span><img/></span><figcaption>cap</figcaption></figure> → ![cap](src)
  td.addRule("tistoryFigure", {
    filter: (node) => node.nodeName === "FIGURE",
    replacement: (_content, node) => {
      const img = node.querySelector("img");
      if (!img) return "";
      const src = img.getAttribute("src") || "";
      const cap =
        (node.querySelector("figcaption")?.textContent ||
          img.getAttribute("alt") ||
          "").trim();
      return `\n\n![${cap}](${src})\n\n`;
    },
  });

  return td;
}

function cleanProse(text) {
  return text
    // Strip ** wrapping inside headings: "### **foo**" → "### foo"
    .replace(/^(#{1,4})\s+\*\*(.+?)\*\*\s*$/gm, "$1 $2")
    // Ensure space after heading marker
    .replace(/^(#{1,4})([^# \n])/gm, "$1 $2")
    // Collapse turndown-escaped triple-emphasis "**\*\*foo\*\***" → "**foo**"
    .replace(/\*\*\\\*\\\*\s*([^\n]+?)\s*\\\*\\\*\*\*/g, "**$1**")
    // Unescape brackets that turndown added (e.g. graph\[n\]\[i\])
    .replace(/\\([\[\]])/g, "$1")
    // Normalize list marker spacing: "-   x" → "- x"
    .replace(/^([ \t]*)[-*][ \t]{2,}/gm, "$1- ")
    // Same for ordered lists
    .replace(/^([ \t]*)(\d+)\.[ \t]{2,}/gm, "$1$2. ");
}

function postProcess(md) {
  // Only clean prose; leave fenced code blocks untouched.
  const parts = md.split(/(```[\s\S]*?```)/g);
  const merged = parts.map((p, i) => (i % 2 === 0 ? cleanProse(p) : p)).join("");
  return merged
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "") + "\n";
}

function buildFrontmatter({ title, summary, category, tags, date }) {
  const yamlEsc = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const lines = [
    "---",
    `title: ${yamlEsc(title)}`,
    `summary: ${yamlEsc(summary)}`,
    `category: ${category}`,
    `tags:`,
    ...(tags.length ? tags.map((t) => `  - ${t}`) : ["  []"]),
    `date: '${date}'`,
    `visibility: published`,
    "---",
    "",
  ];
  // gray-matter handles `tags: []` better when empty
  if (!tags.length) {
    const idx = lines.indexOf("tags:");
    lines.splice(idx, 2, "tags: []");
  }
  return lines.join("\n");
}

function processOne(num, planEntry, td) {
  const folder = path.join(SOURCE, num);
  const htmlFile = fs.readdirSync(folder).find((f) => f.endsWith(".html"));
  if (!htmlFile) throw new Error(`no html in ${num}`);
  const html = fs.readFileSync(path.join(folder, htmlFile), "utf8");
  const { title, date, tags, body } = parseHtml(html);

  const slug = planEntry.slug;
  // Replace image relative paths before turndown so img src is final.
  const fixed = body.replace(/\.\/img\//g, `/posts/${slug}/`);

  let md = td.turndown(fixed);
  md = postProcess(md);

  const fm = buildFrontmatter({
    title,
    summary: planEntry.summary,
    category: planEntry.category,
    tags,
    date,
  });

  return { slug, title, date, category: planEntry.category, tags, mdx: fm + md, folder };
}

function main() {
  const td = makeTurndown();
  const entries = Object.keys(PLAN)
    .filter((n) => !SKIP.has(n))
    .sort((a, b) => Number(a) - Number(b));

  console.log("\n[migrate-tistory] plan");
  console.log("─".repeat(110));
  console.log(
    [
      "#".padEnd(3),
      "date".padEnd(11),
      "category".padEnd(10),
      "slug".padEnd(40),
      "title",
    ].join(" │ "),
  );
  console.log("─".repeat(110));

  const results = [];
  for (const num of entries) {
    const plan = PLAN[num];
    try {
      const r = processOne(num, plan, td);
      results.push({ num, ...r });
      console.log(
        [
          num.padEnd(3),
          r.date.padEnd(11),
          r.category.padEnd(10),
          r.slug.padEnd(40),
          r.title,
        ].join(" │ "),
      );
    } catch (e) {
      console.error(`#${num} failed: ${e.message}`);
    }
  }
  console.log("─".repeat(110));
  console.log(`total: ${results.length} (skipped: ${[...SKIP].join(", ")})\n`);

  if (isDryRun) {
    console.log("[dry-run] no files written.");
    return;
  }

  fs.mkdirSync(POSTS_OUT, { recursive: true });
  fs.mkdirSync(PUBLIC_OUT, { recursive: true });

  for (const r of results) {
    const mdPath = path.join(POSTS_OUT, `${r.slug}.md`);
    fs.writeFileSync(mdPath, r.mdx);
    const imgSrc = path.join(r.folder, "img");
    if (fs.existsSync(imgSrc)) {
      const dest = path.join(PUBLIC_OUT, r.slug);
      fs.mkdirSync(dest, { recursive: true });
      for (const f of fs.readdirSync(imgSrc)) {
        fs.copyFileSync(path.join(imgSrc, f), path.join(dest, f));
      }
    }
  }
  console.log(`wrote ${results.length} md + images.`);
}

main();
