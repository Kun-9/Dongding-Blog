#!/usr/bin/env bash
# 릴리스 글 실행기 — 로컬 크론용.
#
# 어드민에서 "AI에게 맡기기"로 쌓인 작업 하나를 Claude Code 가 집어서 처리한다.
# 지시문은 scripts/release-worker-prompt.md 하나로, 클라우드 루틴과 같다.
#
# 준비 (한 번):
#   claude mcp add --scope user --transport http dongding-blog \
#     https://blog.dongding.dev/api/mcp \
#     --header "Authorization: Bearer <MCP_TOKEN>"
#
# 크론 (매시 정각):
#   crontab -e
#   0 * * * * /path/to/Dongding-Blog/scripts/release-worker.sh >> "$HOME/.release-worker.log" 2>&1
#
# 크론은 로그인 셸 PATH 를 안 읽는다. claude 가 안 잡히면 CLAUDE_BIN 에 절대 경로를 넣는다.
set -euo pipefail

cd "$(dirname "$0")/.."
CLAUDE_BIN="${CLAUDE_BIN:-claude}"

# 앞 실행이 아직 돌고 있으면 건너뛴다. macOS 에는 flock 이 없어 mkdir 로 잠근다.
LOCK="${TMPDIR:-/tmp}/dongding-release-worker.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date '+%F %T') 앞 실행이 아직 돌고 있어 건너뜀"
  exit 0
fi
trap 'rmdir "$LOCK"' EXIT

echo "$(date '+%F %T') 시작"
"$CLAUDE_BIN" -p "$(cat scripts/release-worker-prompt.md)" \
  --allowedTools "mcp__dongding-blog__*" "WebSearch" "WebFetch"
echo "$(date '+%F %T') 끝"
