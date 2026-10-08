#!/usr/bin/env node
/**
 * 블로그 글에 넣을 터미널 화면을 한 번에 뜬다 — 띄우기, 키 입력, 기다리기, 자르기,
 * 개인 정보 검사, SVG 만들기, 정리까지. 어디서 돌려도(로컬·클라우드 루틴·실행기)
 * 같은 크기·같은 절차라 같은 그림이 나온다. 쓰는 법은 같은 폴더의 SKILL.md.
 *
 *   node .claude/skills/blog-capture/capture.mjs --run "claude --model sonnet" \
 *     --keys /context --keys Enter --from "Context Usage" --to "Auto-compact window" \
 *     --out context-1m.svg
 *
 * --ansi <파일> 을 주면 띄우지 않고 이미 뜬 화면(tmux capture-pane -e -p)만 바꾼다.
 * claude 는 --safe-mode 를 붙여 띄운다 — 내 CLAUDE.md·플러그인·훅·MCP·상태줄 없이
 * 기본 설치 화면이 나와야 어디서 떠도 같은 그림이다. 꼭 내 구성이 보여야 하면 --no-safe-mode.
 *
 * 끝 코드: 0 성공 · 1 사용법 · 2 개인 정보가 보임 · 3 띄우지 못함(설치·로그인)
 *          4 tmux 없음 · 5 --from/--to 를 화면에서 못 찾음
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";

/* ── 인자 ─────────────────────────────────────────────────────────────── */

// /context 처럼 긴 출력도 위로 밀리지 않게 60행. 밀린 줄은 tmux 기록에도 안 남는다.
const opt = { keys: [], allow: [], size: "100x60", timeout: 40, safe: true };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  const v = () => argv[++i];
  if (k === "--run") opt.run = v();
  else if (k === "--ansi") opt.ansi = v();
  else if (k === "--keys") opt.keys.push(v());
  else if (k === "--from") opt.from = v();
  else if (k === "--to") opt.to = v();
  else if (k === "--out") opt.out = v();
  else if (k === "--size") opt.size = v();
  else if (k === "--timeout") opt.timeout = Number(v());
  else if (k === "--upload-json") opt.uploadSlug = v();
  else if (k === "--allow") opt.allow.push(v());
  else if (k === "--no-safe-mode") opt.safe = false;
  else fail(1, `모르는 인자: ${k}`);
}
if (!opt.out || (!opt.run && !opt.ansi)) {
  fail(1, "사용법: capture.mjs (--run \"<명령>\" [--keys <키>]… | --ansi <파일>) [--from <글자>] [--to <글자>] --out <이름>.svg");
}

function fail(code, msg) {
  console.error(`capture: ${msg}`);
  process.exit(code);
}

/* ── 띄우고 뜨기 ──────────────────────────────────────────────────────── */

const tmux = (...a) => spawnSync("tmux", a, { encoding: "utf8" });
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const plain = (s) => s.replace(/\x1b\[[0-9;:]*m/g, "");

/** 화면이 ms 동안 그대로면 멈춘 것으로 본다. 마지막 화면(색 포함)을 돌려준다. */
function settle(session, ms = 1200) {
  const end = Date.now() + opt.timeout * 1000;
  let last = "";
  let since = Date.now();
  for (;;) {
    const now = tmux("capture-pane", "-t", session, "-e", "-p").stdout ?? "";
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (Date.now() - since >= ms) return last;
    if (Date.now() > end) return last;
    sleep(250);
  }
}

const KEY = /^(Enter|Escape|Tab|BTab|Up|Down|Left|Right|Space|BSpace|PageUp|PageDown|Home|End|F\d{1,2}|[CM]-.)$/;

function shoot() {
  if (tmux("-V").error) fail(4, "tmux 가 없다. 자료 조사로 넘어간다(SKILL.md 2단계).");
  const [w, h] = opt.size.split("x");
  // 늘 같은 빈 폴더에서 띄운다. 새 폴더마다 Claude Code 가 신뢰 기록을 ~/.claude.json 에 쌓는다.
  const dir = join(tmpdir(), "blogcap-screen");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir);
  const real = realpathSync(dir);
  // 띄운 세션의 기록(~/.claude/projects/<폴더 경로>). 캡처 전용 폴더라 남의 기록과 겹치지 않는다.
  const log = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "projects", real.replace(/[^a-zA-Z0-9]/g, "-"));
  rmSync(log, { recursive: true, force: true });
  const session = `blogcap-${process.pid}`;
  // Claude Code 안에서 Claude Code 를 띄우면 중첩 실행 검사에 걸린다. 지금 세션을 가리키는
  // 변수만 뺀다. 로그인 변수(…_OAUTH_TOKEN, ANTHROPIC_*)는 남겨야 클라우드에서도 뜬다.
  const nested = ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_SSE_PORT", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_CHILD_SESSION", "CLAUDE_PID",
    ...Object.keys(process.env).filter((k) => k.startsWith("CLAUDE_CODE_MESSAGING_"))];
  let run = opt.run;
  if (opt.safe && /^claude(\s|$)/.test(run) && !run.includes("--safe-mode")) run = run.replace(/^claude/, "claude --safe-mode");
  // 명령이 끝나도 화면이 남도록 [exit] 를 찍고 기다린다.
  const cmd = `env ${nested.map((k) => `-u ${k}`).join(" ")} ${run}; echo "[blogcap exit $?]"; sleep 600`;
  // 캡션에 적을 버전. 따로 `--version` 을 치면 띄운 실행 파일과 다를 수 있다.
  const bin = run.split(/\s+/)[0];
  const ver = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 15000 }).stdout?.trim().split("\n")[0];
  if (ver) console.error(`버전: ${ver}`);
  const started = tmux("new-session", "-d", "-s", session, "-x", w, "-y", h, "-c", dir, cmd);
  if (started.status !== 0) fail(3, `tmux 세션을 못 열었다: ${started.stderr.trim()}`);
  try {
    let screen = plain(settle(session, 2000));
    // 방금 만든 빈 폴더라 신뢰해도 된다. 고른 줄이 Yes 가 아니면 한 칸 내린다.
    if (/trust this folder/i.test(screen)) {
      const picked = screen.split("\n").find((l) => l.includes("❯")) ?? "";
      if (!/Yes, I trust/.test(picked)) tmux("send-keys", "-t", session, "Down");
      sleep(300);
      tmux("send-keys", "-t", session, "Enter");
      screen = plain(settle(session, 2000));
    }
    if (/\[blogcap exit \d+\]/.test(screen) || /Select login method|Please run \/login|Invalid API key|not logged in/i.test(screen)) {
      fail(3, `명령이 화면을 띄우지 못했다(설치·로그인 확인). 마지막 화면:\n${screen.trimEnd().split("\n").slice(-8).join("\n")}`);
    }
    for (const k of opt.keys) {
      if (KEY.test(k) || k === "Esc") tmux("send-keys", "-t", session, k === "Esc" ? "Escape" : k);
      else tmux("send-keys", "-t", session, "-l", k);
      sleep(400);
    }
    return settle(session, 1500);
  } finally {
    tmux("kill-session", "-t", session);
    rmSync(dir, { recursive: true, force: true });
    // Claude Code 는 끝나면서 기록을 한 번 더 쓴다. 잠깐 기다렸다 지운다(남아도 다음 캡처가 시작할 때 지운다).
    sleep(1500);
    rmSync(log, { recursive: true, force: true });
  }
}

/* ── 자르기·검사 ──────────────────────────────────────────────────────── */

const ansi = opt.ansi ? readFileSync(opt.ansi, "utf8") : shoot();
const lines = ansi.replace(/\n+$/, "").split("\n");
const text = lines.map(plain);
let from = 0;
let to = text.length - 1;
if (opt.from) {
  from = text.findIndex((l) => l.includes(opt.from));
  if (from < 0) fail(5, `--from "${opt.from}" 이 화면에 없다. 지금 화면:\n${text.join("\n")}`);
}
if (opt.to) {
  const at = text.findIndex((l, i) => i >= from && l.includes(opt.to));
  if (at < 0) fail(5, `--to "${opt.to}" 이 --from 아래에 없다. 지금 화면:\n${text.join("\n")}`);
  to = at;
}
while (to > from && !text[to].trim()) to--;

/** 글에 실으면 안 되는 것. 걸리면 범위를 좁힌다. 화면 자체가 그 내용이면 --allow <이름>. */
const PRIVATE = {
  path: /(^|\s)(~|\/)[\w.…-]+\/[\w.…-]+/,
  email: /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
  secret: /\bsk-[\w-]{10,}|\b[a-f0-9]{32,}\b|\beyJ[\w-]{10,}\./i,
  usage: /\b(5h|wk|7d|extra):\[|usage limit|resets? (at|in)\b/i,
  account: /Claude (Max|Pro|Team|Enterprise)\b|Organization:|Logged in as/i,
};
const cut = text.slice(from, to + 1);
const hits = [];
for (const [name, re] of Object.entries(PRIVATE)) {
  if (opt.allow.includes(name)) continue;
  cut.forEach((l, i) => re.test(l) && hits.push(`  [${name}] ${from + i + 1}행: ${l.trim()}`));
}
console.error(`잘라 낸 화면 (${from + 1}~${to + 1}행):\n${cut.join("\n")}`);
if (hits.length) fail(2, `개인 정보로 보이는 줄이 있다. --from/--to 로 빼고 다시 뜬다:\n${hits.join("\n")}`);

/* ── SVG ──────────────────────────────────────────────────────────────── */

const CW = 8.4; // 14px 고정폭 글꼴 한 칸
const LH = 20;
const PAD_X = 24;
const PAD_Y = 18;
const FG = "#dcdfe4";
const BG = "#1e1e1e";
const BASE = ["#1e1e1e", "#e06c75", "#98c379", "#e5c07b", "#61afef", "#c678dd", "#56b6c2", "#dcdfe4",
  "#5c6370", "#e06c75", "#98c379", "#e5c07b", "#61afef", "#c678dd", "#56b6c2", "#ffffff"];
const hex = (...rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

function c256(n) {
  if (n < 16) return BASE[n];
  if (n >= 232) return hex(...Array(3).fill(8 + (n - 232) * 10));
  const s = [0, 95, 135, 175, 215, 255];
  const k = n - 16;
  return hex(s[Math.floor(k / 36)], s[Math.floor(k / 6) % 6], s[k % 6]);
}

/** 터미널에서 두 칸을 차지하는 글자(한글·한자·전각). */
const wide = (cp) =>
  (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) ||
  (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6);

/** 한 줄을 칸 목록으로. 칸마다 글자와 그때의 색·굵기. */
function cells(line, st) {
  const out = [];
  let col = 0;
  for (const part of line.split(/(\x1b\[[0-9;:]*m)/)) {
    const m = part.match(/^\x1b\[([0-9;:]*)m$/);
    if (!m) {
      for (const ch of part) {
        out.push({ ch, col, ...st });
        col += wide(ch.codePointAt(0)) ? 2 : 1;
      }
      continue;
    }
    const p = (m[1] || "0").split(/[;:]/).map(Number);
    for (let k = 0; k < p.length; k++) {
      const v = p[k];
      if (v === 0) Object.assign(st, { fg: null, bg: null, b: false, d: false, i: false });
      else if (v === 1) st.b = true;
      else if (v === 2) st.d = true;
      else if (v === 3) st.i = true;
      else if (v === 22) st.b = st.d = false;
      else if (v === 23) st.i = false;
      else if (v === 39) st.fg = null;
      else if (v === 49) st.bg = null;
      else if (v >= 30 && v <= 37) st.fg = BASE[v - 30];
      else if (v >= 90 && v <= 97) st.fg = BASE[v - 82];
      else if (v >= 40 && v <= 47) st.bg = BASE[v - 40];
      else if (v >= 100 && v <= 107) st.bg = BASE[v - 92];
      else if ((v === 38 || v === 48) && p[k + 1] === 5) {
        const c = c256(p[k + 2]);
        if (v === 38) st.fg = c;
        else st.bg = p[k + 2] === 0 || p[k + 2] === 16 ? null : c; // 검정 바탕은 판 색으로 둔다
        k += 2;
      } else if ((v === 38 || v === 48) && p[k + 1] === 2) {
        const c = hex(p[k + 2], p[k + 3], p[k + 4]);
        if (v === 38) st.fg = c;
        else st.bg = c;
        k += 4;
      }
    }
  }
  return out;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const style = (c) => `${c.fg ?? FG}|${c.bg ?? ""}|${c.b}|${c.d}|${c.i}`;

const st = { fg: null, bg: null, b: false, d: false, i: false };
for (const line of lines.slice(0, from)) cells(line, st); // 자르기 전 행의 색 상태를 이어받는다
const rows = lines.slice(from, to + 1).map((line) => cells(line, st));
for (const r of rows) while (r.length && r[r.length - 1].ch === " " && !r[r.length - 1].bg) r.pop();
// 모든 행에 공통인 앞 여백은 걷는다.
const indent = Math.min(...rows.filter((r) => r.length).map((r) => r.find((c) => c.ch !== " ")?.col ?? 0));
const cols = Math.max(1, ...rows.map((r) => (r.length ? r[r.length - 1].col + 1 - indent : 0)));
const W = Math.round(PAD_X * 2 + cols * CW);
const H = Math.round(PAD_Y * 2 + rows.length * LH);

const body = [];
rows.forEach((r, y) => {
  const top = PAD_Y + y * LH;
  const runs = [];
  for (const c of r) {
    const last = runs[runs.length - 1];
    if (last && style(last[0]) === style(c)) last.push(c);
    else runs.push([c]);
  }
  for (const run of runs) {
    const c0 = run[0];
    const x = (c) => (PAD_X + (c.col - indent) * CW).toFixed(1);
    if (c0.bg) {
      const w = (run[run.length - 1].col - c0.col + 1) * CW;
      body.push(`<rect x="${x(c0)}" y="${top}" width="${w.toFixed(1)}" height="${LH}" fill="var(--term-bg-${c0.bg.slice(1)}, ${c0.bg})"/>`);
    }
    // 글자마다 칸 좌표를 박아 읽는 쪽 글꼴이 달라도 줄이 맞는다. 띄어쓰기도 남겨야
    // 복사·검색할 때 단어가 붙지 않는다. 양 끝 공백만 버린다.
    let a = 0;
    let z = run.length;
    while (a < z && run[a].ch === " ") a++;
    while (z > a && run[z - 1].ch === " ") z--;
    const ink = run.slice(a, z);
    if (!ink.length) continue;
    const attrs = [
      `x="${ink.map(x).join(" ")}"`,
      `y="${top + 15}"`,
      `fill="var(--term-fg-${(c0.fg ?? FG).slice(1)}, ${c0.fg ?? FG})"`,
      c0.b && `font-weight="700"`,
      c0.d && `opacity="0.6"`,
      c0.i && `font-style="italic"`,
    ].filter(Boolean);
    body.push(`<text ${attrs.join(" ")}>${esc(ink.map((c) => c.ch).join(""))}</text>`);
  }
});

// 색은 var(--term-*, #hex) 라 본문 SVG 테마 변환(lib/svg-theme)이 바꾸지 않는다. 판은 다크 고정.
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="font-family: var(--font-mono, Menlo), Menlo, Consolas, monospace; white-space: pre" font-size="14">\n` +
  `<rect width="${W}" height="${H}" rx="10" fill="var(--term-bg, ${BG})"/>\n` +
  body.join("\n") +
  `\n</svg>\n`;
writeFileSync(opt.out, svg);
if (opt.uploadSlug) {
  // 실행기 API 의 image 요청 본문. curl --data-binary @<파일> 로 그대로 보낸다.
  writeFileSync(`${opt.out}.json`, JSON.stringify({ action: "image", slug: opt.uploadSlug, name: basename(opt.out), svg }));
}
console.error(`만듦: ${opt.out} (${W}x${H}, ${rows.length}행)${opt.uploadSlug ? ` · 올릴 요청: ${opt.out}.json` : ""}`);
