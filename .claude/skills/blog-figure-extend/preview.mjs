#!/usr/bin/env node
// 마크다운 한 장을 블로그 렌더러로 그리는 임시 페이지 + 개발 서버.
//   node .claude/skills/blog-figure-extend/preview.mjs link                     워크트리에 node_modules·.env.local 잇기(처음 한 번)
//   node .claude/skills/blog-figure-extend/preview.mjs start <글.md> [--port 3107]
//   node .claude/skills/blog-figure-extend/preview.mjs stop
// 페이지는 요청마다 파일을 다시 읽어서 글.md 를 고치고 새로 고치면 바로 보인다.
// 워크트리는 link 로 원래 저장소의 node_modules·.env.local 을 잇는다(둘 다 git 이 무시한다).
// start 가 대신 이은 것은 stop 이 걷는다.
// 임시 페이지(src/app/figure-preview)는 커밋하지 않는다 — sync-docs --check 가 잡는다.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { mainRoot, repoRoot } from "./lib.mjs";

const root = repoRoot();
const state = join(tmpdir(), `figure-preview-${createHash("sha1").update(root).digest("hex").slice(0, 10)}.json`);
const pageDir = join(root, "src/app/figure-preview");
const [cmd, file] = process.argv.slice(2);
const port = Number(process.argv[process.argv.indexOf("--port") + 1]) || 3107;

function stop() {
  if (!existsSync(state)) return console.log("떠 있는 미리보기가 없습니다.");
  const s = JSON.parse(readFileSync(state, "utf8"));
  try {
    process.kill(-s.pid, "SIGTERM"); // 프로세스 묶음째(next dev 가 띄운 자식까지)
  } catch {}
  rmSync(pageDir, { recursive: true, force: true });
  // next dev 가 만든 라우트 타입이 지운 페이지를 가리켜 tsc 가 깨진다 — 다음 dev 가 다시 만든다.
  rmSync(join(root, ".next/dev/types"), { recursive: true, force: true });
  for (const link of s.links) if (existsSync(link)) unlinkSync(link);
  rmSync(state);
  console.log("미리보기를 내렸습니다.");
}

async function start() {
  if (!file || !existsSync(file)) {
    console.error("사용법: preview.mjs start <글.md> [--port 3107]");
    process.exit(2);
  }
  if (existsSync(state)) stop();
  const links = link();
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(
    join(pageDir, "page.tsx"),
    `// blog-figure-extend 임시 미리보기 — 커밋하지 않는다(preview.mjs stop 이 지운다).
import fs from "node:fs";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export default function Page() {
  const body = fs.readFileSync(${JSON.stringify(resolve(file))}, "utf8");
  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,700px)] justify-center px-[var(--gut)]">
      <article className="pb-[60vh] pt-10">{renderMarkdown(body)}</article>
    </div>
  );
}
`,
  );
  // 남은 dev 캐시가 예전 globals.css 를 그대로 내줘 장면 CSS 가 빠진 적이 있다 — 매번 새로 컴파일한다.
  rmSync(join(root, ".next/dev"), { recursive: true, force: true });
  const log = join(tmpdir(), `figure-preview-${port}.log`);
  const out = openSync(log, "w"); // 지난 실행의 오류가 섞여 원인을 잘못 짚지 않게 비우고 시작한다
  const child = spawn("npx", ["next", "dev", "-p", String(port)], { cwd: root, detached: true, stdio: ["ignore", out, out] });
  child.unref();
  writeFileSync(state, JSON.stringify({ pid: child.pid, links, port }));
  const url = `http://localhost:${port}/figure-preview/`;
  for (let i = 0; i < 90; i++) {
    const r = spawnSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", url], { encoding: "utf8" });
    if (r.stdout === "200") return console.log(`미리보기: ${url}\n로그: ${log}`);
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  console.error(`3분 안에 뜨지 않았습니다. 로그: ${log}`);
  stop();
  process.exit(1);
}

/** 워크트리에 원래 저장소의 node_modules·.env.local 을 잇는다. 이은 것을 돌려준다. */
function link() {
  const made = [];
  const main = mainRoot(root);
  for (const name of ["node_modules", ".env.local"]) {
    if (!existsSync(join(root, name)) && main !== root && existsSync(join(main, name))) {
      symlinkSync(join(main, name), join(root, name));
      made.push(join(root, name));
    }
  }
  return made;
}

if (cmd === "link") console.log(link().map((x) => `이음 ${x}`).join("\n") || "이을 것이 없습니다.");
else if (cmd === "start") await start();
else if (cmd === "stop") stop();
else {
  console.error("사용법: preview.mjs link | start <글.md> [--port 3107] | stop");
  process.exit(2);
}
