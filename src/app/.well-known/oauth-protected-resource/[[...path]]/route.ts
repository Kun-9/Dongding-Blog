/**
 * RFC 9728 — 보호 리소스 메타데이터.
 *
 * 옵션 캐치올인 이유: 클라이언트가 `/.well-known/oauth-protected-resource` 로도,
 * 리소스 경로를 붙인 `/.well-known/oauth-protected-resource/api/mcp` 로도 묻는다.
 * 어느 쪽이든 리소스는 `${origin}/api/mcp` 하나로 고정해 답한다.
 */
import { getPublicOrigin, metadataCorsOptionsRequestHandler } from "mcp-handler";

export function GET(req: Request): Response {
  const origin = getPublicOrigin(req);

  return Response.json(
    {
      resource: `${origin}/api/mcp`,
      authorization_servers: [origin],
      bearer_methods_supported: ["header"],
      scopes_supported: ["blog"],
    },
    { headers: { "access-control-allow-origin": "*" } },
  );
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
