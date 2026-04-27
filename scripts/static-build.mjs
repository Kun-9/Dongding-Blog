#!/usr/bin/env node
/**
 * Static build wrapper.
 *
 * `next build` with `output: "export"` rejects route handlers that aren't
 * statically renderable (any PUT/POST/DELETE). The dev-only /api/settings
 * route uses PUT, so we move the entire src/app/api directory out of the
 * way for the duration of the build, then restore it.
 *
 * Run via `npm run build`. Sets BUILD_TARGET=static so next.config.ts
 * switches `output` to "export" and applies the GitHub Pages basePath.
 */
import { spawnSync } from "node:child_process";
import { renameSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const API = resolve(ROOT, "src/app/api");
const STASH = resolve(ROOT, "src/app/_api_stashed");

let stashed = false;
function restore() {
  if (stashed && existsSync(STASH)) {
    renameSync(STASH, API);
    stashed = false;
  }
}

process.on("SIGINT", () => {
  restore();
  process.exit(130);
});
process.on("SIGTERM", () => {
  restore();
  process.exit(143);
});

if (existsSync(API)) {
  renameSync(API, STASH);
  stashed = true;
}

const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  env: { ...process.env, BUILD_TARGET: "static" },
});

restore();

process.exit(result.status ?? 1);
