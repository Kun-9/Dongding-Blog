/**
 * MCP 커넥터 인증 — 두 갈래를 같이 받는다.
 *
 *  1. 정적 Bearer 토큰(`MCP_TOKEN`) — Claude Code 가 헤더로 직접 넣는 경로.
 *  2. OAuth 액세스 토큰 — claude.ai 웹·모바일용. 이 앱이 인가 서버까지 겸한다.
 *
 * 토큰은 둘 다 서명 JWT 라 조회용 저장소가 필요 없다. 다만 **인가 코드의
 * 1회용 보장만은 서명으로 불가능하다** — 서버리스는 인스턴스가 여러 개여서
 * 메모리 Set 을 믿을 수 없으므로 `oauth_code` 테이블에 jti 를 넣어 막는다.
 *
 * 리프레시 토큰은 두지 않는다. 액세스 30일 + 만료 시 커넥터 재연결이면
 * 개인 블로그 한 명에겐 충분하고, 폐기·회전 로직이 통째로 사라진다.
 */
import "server-only";

import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { dbAdmin } from "@/lib/supabase";

/** 인가 코드 수명. 발급 직후 곧바로 교환되므로 짧게 잡는다. */
export const CODE_TTL_SEC = 300;
/** 액세스 토큰 수명. */
export const ACCESS_TTL_SEC = 60 * 60 * 24 * 30;

const CODE_TYP = "mcp-code";
const ACCESS_TYP = "mcp-access";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다`);
  return value;
}

function signingKey(): Uint8Array {
  return new TextEncoder().encode(env("MCP_JWT_SECRET"));
}

/** `Authorization: Bearer xxx` 에서 토큰만 꺼낸다. */
export function bearer(authorization: string | null): string {
  return authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

/** 길이까지 감추지는 못하지만, 내용 비교는 상수시간으로 한다. */
function safeEqual(got: string, expected: string | undefined): boolean {
  if (!expected || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface CodePayload {
  uid: string;
  clientId: string;
  redirectUri: string;
  challenge: string;
}

export async function signAuthCode(payload: CodePayload): Promise<string> {
  return new SignJWT({ ...payload, typ: CODE_TYP })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${CODE_TTL_SEC}s`)
    .sign(signingKey());
}

export async function verifyAuthCode(
  code: string,
): Promise<(CodePayload & { jti: string; exp: number }) | null> {
  try {
    const { payload } = await jwtVerify(code, signingKey());
    if (payload.typ !== CODE_TYP || !payload.jti || !payload.exp) return null;
    return {
      uid: String(payload.uid),
      clientId: String(payload.clientId),
      redirectUri: String(payload.redirectUri),
      challenge: String(payload.challenge),
      jti: payload.jti,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * 인가 코드를 소진한다. 이미 쓴 코드면 false — 호출자는 거부해야 한다.
 * 겸사겸사 만료된 행을 치운다(테이블이 커질 일이 없으므로 별도 크론 불필요).
 */
export async function consumeAuthCode(
  jti: string,
  exp: number,
): Promise<boolean> {
  const db = dbAdmin();
  await db.from("oauth_code").delete().lt("expires_at", new Date().toISOString());

  const { error } = await db
    .from("oauth_code")
    .insert({ jti, expires_at: new Date(exp * 1000).toISOString() });

  // 23505 = unique 위반 → 같은 코드가 이미 교환됐다.
  if (error) {
    if (error.code === "23505") return false;
    throw new Error(`인가 코드 처리 실패: ${error.message}`);
  }
  return true;
}

/**
 * 동의 화면의 CSRF 방지 토큰. GET 때 로그인한 uid 로 서명해 폼에 심고 POST 에서
 * 되돌려 받는다 — 다른 사이트가 승인 POST 를 대신 쏘면 이 토큰을 만들 수 없다.
 * (그게 뚫리면 공격자가 자기 Claude 계정에 이 블로그를 연결할 수 있다.)
 */
export async function signConsent(payload: CodePayload): Promise<string> {
  return new SignJWT({ ...payload, typ: "mcp-consent" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(signingKey());
}

export async function verifyConsent(
  token: string,
): Promise<CodePayload | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey());
    if (payload.typ !== "mcp-consent") return null;
    return {
      uid: String(payload.uid),
      clientId: String(payload.clientId),
      redirectUri: String(payload.redirectUri),
      challenge: String(payload.challenge),
    };
  } catch {
    return null;
  }
}

export async function signAccessToken(uid: string): Promise<string> {
  return new SignJWT({ uid, typ: ACCESS_TYP })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(signingKey());
}

export type Identity =
  | { kind: "static"; uid: string }
  | { kind: "oauth"; uid: string };

/**
 * 요청의 신원. 실패하면 null 이고, 호출자는 401 + WWW-Authenticate 로 답한다.
 *
 * 이 블로그는 편집자가 한 명뿐이라 신원이 갈리지 않는다 — 라우트 핸들러의
 * `requireApiUser` 와 같은 신뢰 모델(로그인한 사람 = 편집자)을 그대로 쓴다.
 */
export async function identify(req: Request): Promise<Identity | null> {
  const token = bearer(req.headers.get("authorization"));
  if (!token) return null;

  if (safeEqual(token, process.env.MCP_TOKEN)) {
    return { kind: "static", uid: process.env.MCP_USER_ID || "static" };
  }

  try {
    const { payload } = await jwtVerify(token, signingKey());
    if (payload.typ !== ACCESS_TYP || !payload.uid) return null;
    return { kind: "oauth", uid: String(payload.uid) };
  } catch {
    return null;
  }
}

/** 커넥터 고급설정에 넣는 클라이언트 자격. 동적 등록(DCR)은 지원하지 않는다. */
export function oauthClient(): { id: string; secret: string | undefined } {
  return {
    id: env("MCP_OAUTH_CLIENT_ID"),
    secret: process.env.MCP_OAUTH_CLIENT_SECRET,
  };
}

export function checkClientSecret(got: string | undefined): boolean {
  const { secret } = oauthClient();
  if (!secret) return true; // 시크릿을 안 걸었으면 public client 로 취급
  return safeEqual(got ?? "", secret);
}

/**
 * 인가 코드를 흘리지 않으려면 redirect_uri 를 허용목록으로 **가장 먼저** 막아야
 * 한다. claude.ai 콜백과 로컬 루프백만 받는다.
 */
export function isAllowedRedirect(uri: string): boolean {
  if (uri === "https://claude.ai/api/mcp/auth_callback") return true;
  try {
    const url = new URL(uri);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

/** PKCE S256 검증. */
export async function verifyPkce(
  verifier: string,
  challenge: string,
): Promise<boolean> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const b64 = Buffer.from(digest).toString("base64url");
  return safeEqual(b64, challenge);
}
