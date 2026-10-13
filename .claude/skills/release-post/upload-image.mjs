#!/usr/bin/env node
/**
 * 글 이미지 올리기 — MCP 도구 upload_post_image 를 파일 경로로 부른다. 도구 인자에 base64 를 옮겨 적으면
 * 길어서 옮기다 깨질 수 있어, 파일을 직접 읽어 같은 도구를 JSON-RPC 로 부른다.
 *
 *   node .claude/skills/release-post/upload-image.mjs <slug> <파일> [--name <이름>] [--base https://blog.dongding.dev]
 *
 * 이름을 빼면 파일 이름(소문자)을 쓴다. 이름은 영소문자·숫자·하이픈 + .svg·.png·.jpg·.jpeg·.webp·.html.
 * .html 은 실제로 작동하는 결과물을 본문 ```embed 블록으로 띄울 때 쓴다(외부 스크립트 없이 한 파일로).
 * 같은 이름이 있으면 덮어쓴다. 끝나면 본문에 넣을 경로(/posts/<slug>/<이름>)를 출력한다.
 * 토큰은 .env.local 의 MCP_TOKEN 을 파일에서 읽어 쓰고 출력하지 않는다.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args.splice(at, 2)[1] : undefined;
};
const base = (opt("--base") ?? "https://blog.dongding.dev").replace(/\/$/, "");
const name = opt("--name");
const [slug, file] = args;
if (!slug || !file) {
  console.error("쓰는 법: upload-image.mjs <slug> <파일> [--name <이름>] [--base URL]");
  process.exit(2);
}
if (!existsSync(file)) {
  console.error(`파일이 없습니다: ${file}`);
  process.exit(2);
}
const target = name ?? basename(file).toLowerCase();
// 서버(src/app/api/mcp/route.ts)와 같은 규칙. 미리 막아야 무엇이 틀렸는지 바로 보인다.
if (!/^[a-z0-9][a-z0-9-]*\.(svg|png|jpg|jpeg|webp|html)$/.test(target)) {
  console.error(`이름은 영소문자·숫자·하이픈 + .svg·.png·.jpg·.jpeg·.webp·.html 입니다: ${target} (--name 으로 정한다)`);
  process.exit(2);
}

// 워크트리에서 돌려도 메인 체크아웃의 .env.local 을 찾게 위로 올라간다.
let env = {};
for (let d = process.cwd(); d !== resolve(d, ".."); d = dirname(d)) {
  const f = join(d, ".env.local");
  if (!existsSync(f)) continue;
  env = Object.fromEntries(
    readFileSync(f, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
  );
  break;
}
if (!env.MCP_TOKEN) {
  console.error(".env.local 에 MCP_TOKEN 이 없습니다");
  process.exit(2);
}

const bytes = readFileSync(file);
const input = target.endsWith(".svg")
  ? { svg: bytes.toString("utf8") }
  : target.endsWith(".html")
    ? { html: bytes.toString("utf8") }
    : { base64: bytes.toString("base64") };
const res = await fetch(`${base}/api/mcp/`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.MCP_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "upload_post_image", arguments: { slug, name: target, ...input } },
  }),
});
const raw = await res.text();
// 응답은 JSON 이거나 SSE(data: 줄)다.
const msg = (() => {
  try {
    return JSON.parse(raw.match(/^data: (.*)$/m)?.[1] ?? raw);
  } catch {
    return null;
  }
})();
const text = msg?.result?.content?.[0]?.text ?? msg?.error?.message ?? raw.slice(0, 300);
if (!res.ok || !msg?.result || msg.result.isError) {
  console.error(`올리지 못했습니다(${res.status}): ${text}`);
  process.exit(1);
}
console.log(JSON.parse(text).path);
