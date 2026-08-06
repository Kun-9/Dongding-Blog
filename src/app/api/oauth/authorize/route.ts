/**
 * OAuth 인가 엔드포인트 — GET 은 동의 화면, POST 는 승인 후 인가 코드 발급.
 *
 * 신원은 앱의 Supabase 로그인 세션을 그대로 쓴다. 미로그인 상태면 로그인
 * 라우트로 넘기지 않고 안내만 한다 — `next` 파라미터를 새로 끼우면 소셜 로그인
 * 콜백까지 손봐야 하는데, 여기는 커넥터를 처음 붙일 때 한 번 지나는 길이다.
 *
 * 검증 순서가 곧 보안이다. redirect_uri 허용목록을 **가장 먼저** 본다.
 * 통과 못 하면 리디렉션 자체를 하지 않는다 — 안 그러면 인가 코드를 공격자
 * 주소로 흘리게 된다.
 */
import { currentUser } from "@/lib/auth";
import {
  isAllowedRedirect,
  oauthClient,
  signAuthCode,
  signConsent,
  verifyConsent,
} from "@/lib/mcp-auth";

const PAGE_STYLE = `
  :root { color-scheme: light dark }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         font: 15px/1.7 ui-sans-serif, -apple-system, "Apple SD Gothic Neo", sans-serif;
         background:#fafaf9; color:#1c1917 }
  main { max-width: 30rem; padding: 2rem; }
  h1 { font-size: 1.25rem; margin: 0 0 .75rem }
  p { margin: 0 0 1rem; color:#57534e }
  dl { margin: 1.25rem 0; padding: 1rem; background:#f5f5f4; border-radius:.5rem }
  dt { font-size:.8rem; color:#78716c } dd { margin:0 0 .75rem; word-break:break-all }
  dd:last-child { margin-bottom:0 }
  button { font: inherit; padding:.6rem 1.2rem; border:0; border-radius:.5rem;
           background:#1c1917; color:#fafaf9; cursor:pointer }
  code { background:#f5f5f4; padding:.1rem .3rem; border-radius:.25rem }
  @media (prefers-color-scheme: dark) {
    body { background:#1c1917; color:#fafaf9 }
    p { color:#a8a29e } dl, code { background:#292524 }
    button { background:#fafaf9; color:#1c1917 }
  }
`;

function page(title: string, inner: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${title}</title><style>${PAGE_STYLE}</style></head>
     <body><main>${inner}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );

/** redirect_uri 검증을 통과한 뒤의 오류만 이쪽으로 돌려보낸다. */
function redirectError(
  redirectUri: string,
  error: string,
  state: string | null,
): Response {
  const to = new URL(redirectUri);
  to.searchParams.set("error", error);
  if (state) to.searchParams.set("state", state);
  return Response.redirect(to.toString(), 302);
}

export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const redirectUri = q.get("redirect_uri") ?? "";
  const state = q.get("state");

  // 1. 리디렉션 대상부터. 여기서 막히면 절대 리디렉션하지 않는다.
  if (!isAllowedRedirect(redirectUri)) {
    return page(
      "허용되지 않은 주소",
      `<h1>허용되지 않은 리디렉션 주소</h1>
       <p><code>${esc(redirectUri || "(없음)")}</code> 로는 인가 코드를 보내지 않습니다.</p>`,
      400,
    );
  }

  // 2. 클라이언트 식별.
  const client = oauthClient();
  const clientId = q.get("client_id") ?? "";
  if (clientId !== client.id) {
    return page(
      "알 수 없는 클라이언트",
      `<h1>알 수 없는 클라이언트</h1>
       <p>커넥터 고급 설정의 클라이언트 ID 가 서버에 등록된 값과 다릅니다.</p>`,
      400,
    );
  }

  // 3. 이후 오류는 규격대로 redirect_uri 로 돌려보낸다.
  if (q.get("response_type") !== "code") {
    return redirectError(redirectUri, "unsupported_response_type", state);
  }

  const challenge = q.get("code_challenge") ?? "";
  if (!challenge || q.get("code_challenge_method") !== "S256") {
    return redirectError(redirectUri, "invalid_request", state);
  }

  // 4. 신원 — 앱 로그인 세션.
  const user = await currentUser();
  if (!user) {
    return page(
      "로그인이 필요합니다",
      `<h1>로그인이 필요합니다</h1>
       <p>다른 탭에서 <a href="/login">블로그에 로그인</a>한 뒤 이 페이지를 새로고침하세요.</p>`,
      401,
    );
  }

  const consent = await signConsent({
    uid: user.id,
    clientId,
    redirectUri,
    challenge,
  });

  return page(
    "커넥터 연결",
    `<h1>Claude 에 블로그를 연결합니다</h1>
     <p>연결하면 Claude 가 글을 읽고, 점검하고, 만들거나 고치고 지울 수 있습니다.
        본인이 요청한 연결이 아니라면 이 창을 닫으세요.</p>
     <dl>
       <dt>계정</dt><dd>${esc(user.email ?? user.id)}</dd>
       <dt>돌아갈 주소</dt><dd>${esc(redirectUri)}</dd>
     </dl>
     <form method="post">
       <input type="hidden" name="consent" value="${esc(consent)}">
       <input type="hidden" name="state" value="${esc(state ?? "")}">
       <button type="submit">연결 승인</button>
     </form>`,
  );
}

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData();
  const granted = await verifyConsent(String(form.get("consent") ?? ""));
  if (!granted) {
    return page(
      "요청이 만료되었습니다",
      `<h1>요청이 만료되었습니다</h1><p>커넥터에서 연결을 다시 시도하세요.</p>`,
      400,
    );
  }

  // 동의 토큰이 위조되지 않았어도, 그 사이 로그아웃했을 수 있다.
  const user = await currentUser();
  if (!user || user.id !== granted.uid) {
    return page(
      "세션이 바뀌었습니다",
      `<h1>세션이 바뀌었습니다</h1><p>다시 로그인한 뒤 연결을 시도하세요.</p>`,
      401,
    );
  }

  const state = String(form.get("state") ?? "");
  const code = await signAuthCode(granted);
  const to = new URL(granted.redirectUri);
  to.searchParams.set("code", code);
  if (state) to.searchParams.set("state", state);

  return Response.redirect(to.toString(), 302);
}
