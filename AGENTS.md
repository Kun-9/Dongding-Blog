<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Vercel 한도 (개인 앱 팀 공유)

- 이 앱은 다른 개인 앱들과 같은 Vercel Hobby 팀에 있다. 30일 한도(Active CPU 4시간, Provisioned Memory 360 GB-hrs, 함수 호출 100만, Fast Origin Transfer 10GB)는 팀 합계라, 앱 하나가 넘기면 팀 전체가 30일 멈춘다. 2026-10-15 에 실제로 멈췄다.
- 쿼리로 조합되는 필터·정렬·더 보기 링크는 크롤러 함정이다. 조합마다 동적으로 렌더되면 robots 에서 `/<경로>?` 를 막고 링크에 `rel="nofollow"` 를 단다.
- SSE·스트리밍처럼 연결을 오래 여는 응답은 함수를 최대 실행 시간 300초까지 붙잡아 메모리 한도를 먹는다. MCP 서버(mcp-handler)에는 `capabilities: { tools: { listChanged: false } }` 를 넣는다.
- 사용량은 vercel-watch 저장소(GitHub Actions)가 매시간 본다. 급증하면 이슈를 열고, 범인이 봇이면 방화벽에 차단 규칙을 자동으로 게시한다. 직접 볼 때는 `vercel api "/v2/usage?teamId=<팀 id>&projectId=<id>&type=requests&granularity=hour&from=<ISO>&to=<ISO>"` 와 `vercel firewall traffic list --project <앱>` 을 쓴다. Hobby 에서는 `vercel metrics`·`vercel logs` 가 막힌다.
- `/api/mcp` 의 `listChanged: false` 를 빼지 않는다. 빼면 Claude Code 가 `subscriptions/listen` 스트림을 열어 함수가 300초씩 붙잡힌다. 30일 타임아웃 2,632건이 팀 메모리 한도를 넘긴 원인이었다.
