/**
 * OAuth 토큰 엔드포인트 — 인가 코드를 액세스 토큰으로 바꾼다.
 *
 * 검증 순서에 함정이 하나 있다: **PKCE 가 틀렸다고 코드를 태우면 안 된다.**
 * 먼저 소진해 버리면 정상 클라이언트의 재시도가 막힌다. 서명·바인딩·PKCE 를
 * 전부 통과한 뒤에야 1회용 처리를 한다.
 */
import {
  ACCESS_TTL_SEC,
  checkClientSecret,
  consumeAuthCode,
  oauthClient,
  signAccessToken,
  verifyAuthCode,
  verifyPkce,
} from "@/lib/mcp-auth";

function fail(error: string, status = 400): Response {
  return Response.json(
    { error },
    { status, headers: { "cache-control": "no-store" } },
  );
}

/** client_secret_basic — `Authorization: Basic base64(id:secret)`. */
function basicAuth(header: string | null): { id: string; secret: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  const raw = Buffer.from(header.slice(6), "base64").toString("utf8");
  const sep = raw.indexOf(":");
  if (sep < 0) return null;
  return {
    id: decodeURIComponent(raw.slice(0, sep)),
    secret: decodeURIComponent(raw.slice(sep + 1)),
  };
}

export async function POST(req: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("invalid_request");
  }

  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };

  if (str("grant_type") !== "authorization_code") {
    return fail("unsupported_grant_type");
  }

  const basic = basicAuth(req.headers.get("authorization"));
  const clientId = basic?.id ?? str("client_id") ?? "";
  const clientSecret = basic?.secret ?? str("client_secret");

  if (clientId !== oauthClient().id) return fail("invalid_client", 401);
  if (!checkClientSecret(clientSecret)) return fail("invalid_client", 401);

  const payload = await verifyAuthCode(str("code") ?? "");
  if (!payload) return fail("invalid_grant");

  // 코드에 박아 둔 것과 다른 클라이언트·주소로는 교환할 수 없다.
  if (payload.clientId !== clientId) return fail("invalid_grant");
  if (payload.redirectUri !== str("redirect_uri")) return fail("invalid_grant");

  const verifier = str("code_verifier") ?? "";
  if (!verifier || !(await verifyPkce(verifier, payload.challenge))) {
    return fail("invalid_grant");
  }

  // 여기까지 통과한 뒤에 소진한다. 이미 쓴 코드면 재사용이다.
  if (!(await consumeAuthCode(payload.jti, payload.exp))) {
    return fail("invalid_grant");
  }

  return Response.json(
    {
      access_token: await signAccessToken(payload.uid),
      token_type: "Bearer",
      expires_in: ACCESS_TTL_SEC,
      scope: "blog",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
