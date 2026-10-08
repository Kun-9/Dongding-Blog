// blog-figure-extend 스크립트가 같이 쓰는 도우미 — 저장소 위치, 브라우저 준비.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** 지금 작업하는 저장소(워크트리면 워크트리) 뿌리. 스크립트는 여기서 실행한다. */
export function repoRoot() {
  const root = process.cwd();
  if (!existsSync(join(root, "src/lib/figure/kits/index.ts"))) {
    console.error("dongding-blog 저장소(또는 워크트리) 뿌리에서 실행하세요. src/lib/figure 가 없습니다.");
    process.exit(2);
  }
  return root;
}

/** 워크트리가 공유하는 원래 저장소 뿌리(.env.local·node_modules 가 있는 곳). */
export function mainRoot(root) {
  const out = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: root, encoding: "utf8" });
  return out.status === 0 ? dirname(out.stdout.trim()) : root;
}

const PW_VERSION = process.env.FIGURE_PLAYWRIGHT ?? "1.64.0";
const PW_CACHE = join(homedir(), ".cache", "dongding-figure-check");

/** Playwright 는 저장소 의존성이 아니다. 처음 한 번 사용자 캐시에 받아 둔다. */
export async function loadPlaywright() {
  const entry = join(PW_CACHE, "node_modules/playwright/index.mjs");
  if (!existsSync(entry)) {
    console.error(`Playwright ${PW_VERSION} 를 ${PW_CACHE} 에 받습니다(한 번만).`);
    const r = spawnSync("npm", ["i", "--prefix", PW_CACHE, "--no-audit", "--no-fund", `playwright@${PW_VERSION}`], { stdio: "inherit" });
    if (r.status !== 0) process.exit(2);
  }
  return import(pathToFileURL(entry).href);
}

/** 기본 브라우저로 띄우고, 버전이 안 맞으면 받아 둔 chromium 중 가장 새것으로. */
export async function launchChromium(pw) {
  try {
    return await pw.chromium.launch();
  } catch {
    const base = join(homedir(), "Library/Caches/ms-playwright");
    const dirs = existsSync(base) ? readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1])) : [];
    for (const d of dirs) {
      const exe = resolve(base, d, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
      if (existsSync(exe)) return pw.chromium.launch({ executablePath: exe });
    }
    console.error("chromium 을 찾지 못했습니다. `npx playwright install chromium` 으로 받으세요.");
    process.exit(2);
  }
}
