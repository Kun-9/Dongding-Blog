/**
 * RFC 8414 — 인가 서버 메타데이터. claude.ai 가 커넥터를 붙일 때 제일 먼저 읽는다.
 *
 * `registration_endpoint` 는 일부러 없다: 동적 등록(DCR) 대신 커넥터 고급설정에
 * 클라이언트 ID/시크릿을 직접 넣는 경로를 쓴다. 편집자가 한 명이라 등록 엔드포인트를
 * 열어 둘 이유가 없고, 코드도 라우트 하나만큼 줄어든다.
 */
import { getPublicOrigin, metadataCorsOptionsRequestHandler } from "mcp-handler";

export function GET(req: Request): Response {
  const origin = getPublicOrigin(req);

  return Response.json(
    {
      issuer: origin,
      // next.config 의 trailingSlash 때문에 슬래시 없는 주소는 308 로 튕긴다.
      // 토큰 교환은 POST 라 불필요한 리디렉션을 타지 않도록 슬래시까지 알린다.
      authorization_endpoint: `${origin}/api/oauth/authorize/`,
      token_endpoint: `${origin}/api/oauth/token/`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: [
        "client_secret_post",
        "client_secret_basic",
        "none",
      ],
      scopes_supported: ["blog"],
    },
    { headers: { "access-control-allow-origin": "*" } },
  );
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
