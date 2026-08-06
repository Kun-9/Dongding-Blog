/**
 * MCP OAuth 전 구간 점검 — `node scripts/check-oauth.mjs [베이스URL]`
 *
 * 브라우저에서 "연결 승인"을 한 번 누르는 것 말고는 전부 자동이다. 동의 화면은
 * 앱 로그인 세션이 있어야 뜨므로, 실행 전에 그 주소로 로그인해 두어야 한다.
 *
 * 무상태 JWT 만 쓰면 반드시 뚫리는 지점이 인가 코드 재사용이다. 마지막 단계에서
 * 같은 코드를 두 번 넣어 거부되는지까지 확인한다 — 여기가 제일 빠뜨리기 쉽다.
 */
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const PORT = 8765;
const REDIRECT = `http://127.0.0.1:${PORT}/cb`;

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const CLIENT_ID = env.MCP_OAUTH_CLIENT_ID;
const CLIENT_SECRET = env.MCP_OAUTH_CLIENT_SECRET;
if (!CLIENT_ID) throw new Error(".env.local 에 MCP_OAUTH_CLIENT_ID 가 없습니다");

let step = 0;
let failed = 0;
function check(label, ok, detail = "") {
  step++;
  console.log(`${ok ? "  통과" : "  실패"}  ${step}. ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const verifier = b64url(randomBytes(32));
const challenge = b64url(createHash("sha256").update(verifier).digest());

// 1~3. 메타데이터와 무인증 차단 ─────────────────────────────────────────────
const as = await (await fetch(`${BASE}/.well-known/oauth-authorization-server`)).json();
check(
  "AS 메타데이터",
  as.issuer === BASE && as.code_challenge_methods_supported?.includes("S256"),
  as.issuer,
);

const pr = await (
  await fetch(`${BASE}/.well-known/oauth-protected-resource/api/mcp`)
).json();
check(
  "보호 리소스 메타데이터(경로 붙인 형태)",
  pr.resource === `${BASE}/api/mcp` && pr.authorization_servers?.[0] === BASE,
  pr.resource,
);

const unauth = await fetch(`${BASE}/api/mcp/`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
check(
  "무인증 401 + WWW-Authenticate",
  unauth.status === 401 && !!unauth.headers.get("www-authenticate"),
  `status=${unauth.status}`,
);

// 4. 허용 목록에 없는 redirect_uri 는 리디렉션 자체를 안 한다 ────────────────
const evil = await fetch(
  `${BASE}/api/oauth/authorize/?response_type=code&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent("https://evil.example.com/cb")}` +
    `&code_challenge=${challenge}&code_challenge_method=S256`,
  { redirect: "manual" },
);
check(
  "허용되지 않은 redirect_uri 거부",
  evil.status === 400 && !evil.headers.get("location"),
  `status=${evil.status}`,
);

// 5~6. 동의 화면 → 인가 코드 ────────────────────────────────────────────────
const authUrl =
  `${BASE}/api/oauth/authorize/?response_type=code&client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}&state=verify-state` +
  `&code_challenge=${challenge}&code_challenge_method=S256`;

console.log(`\n  브라우저에서 "연결 승인"을 눌러 주세요 (${BASE} 에 로그인된 상태여야 합니다)`);
console.log(`  ${authUrl}\n`);

// 승인 페이지는 앱 도메인이라 루프백 서버가 뜨기 전에 열어도 상관없다.
// NO_OPEN=1 이면 열지 않는다 — 승인을 자동화(dev-browser)해서 돌릴 때 쓴다.
if (process.platform === "darwin" && !process.env.NO_OPEN) {
  spawn("open", [authUrl], { stdio: "ignore" });
}

const received = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, REDIRECT);
    if (url.pathname !== "/cb") return res.end();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<p>확인했습니다. 터미널로 돌아가세요.</p>");
    server.close();
    resolve({ code: url.searchParams.get("code"), state: url.searchParams.get("state") });
  });
  server.listen(PORT);
  setTimeout(() => {
    server.close();
    reject(new Error("2분 안에 승인이 오지 않았습니다"));
  }, 120_000);
});

check("승인 후 인가 코드 수신", !!received.code, `state=${received.state}`);

// 7~9. 토큰 교환 ────────────────────────────────────────────────────────────
const exchange = (body) =>
  fetch(`${BASE}/api/oauth/token/`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      ...(CLIENT_SECRET ? { client_secret: CLIENT_SECRET } : {}),
      redirect_uri: REDIRECT,
      code: received.code,
      ...body,
    }),
  });

const badPkce = await exchange({ code_verifier: b64url(randomBytes(32)) });
check(
  "잘못된 PKCE 거부",
  badPkce.status === 400,
  `status=${badPkce.status}`,
);

const good = await exchange({ code_verifier: verifier });
const token = good.ok ? (await good.json()).access_token : null;
check("정상 토큰 발급", !!token, good.ok ? "" : `status=${good.status} ${await good.text()}`);

// PKCE 실패로 코드를 태우지 않았어야 여기까지 온다.
const reuse = await exchange({ code_verifier: verifier });
check("같은 인가 코드 재사용 거부", reuse.status === 400, `status=${reuse.status}`);

// 10. 발급받은 토큰으로 실제 도구 호출 ──────────────────────────────────────
if (token) {
  const res = await fetch(`${BASE}/api/mcp/`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "list_taxonomy", arguments: {} },
    }),
  });
  const text = await res.text();
  check(
    "발급 토큰으로 tools/call 성공",
    res.ok && text.includes("categories"),
    `status=${res.status}`,
  );
} else {
  check("발급 토큰으로 tools/call 성공", false, "토큰이 없어 건너뜀");
}

console.log(failed === 0 ? "\nOAuth 전 구간 통과" : `\n${failed}개 항목 실패`);
process.exit(failed === 0 ? 0 : 1);
