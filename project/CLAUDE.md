# CLAUDE.md — 프로젝트 작업 규칙

이 프로젝트의 모든 작업은 다음 규칙을 따른다.

## 1. 디자인 변경사항은 항상 추적한다

코드/디자인을 수정한 후에는 **반드시** 다음 두 파일을 함께 갱신한다.

### `CHANGELOG.md` — 무엇을 언제 바꿨는가
- 모든 사용자 가시 변경(UI, 동작, 페이지 추가/삭제)을 기록.
- 형식: [Keep a Changelog](https://keepachangelog.com/) + [SemVer](https://semver.org).
- 한 줄 요약 + 필요한 경우 한 줄 부연.
- 가장 최근 변경이 위로.
- 카테고리: `Added` / `Changed` / `Fixed` / `Removed`.

### `PRD.html` — 왜 그렇게 결정했는가
- "디자인 결정 로그" 섹션(`#design`)에 새 결정을 추가.
- DEC-NN 번호를 다음 번호로 이어 매김 (현재 마지막: DEC-08).
- MAJOR/MINOR 변경에만 연결. 단순 버그 수정·복구는 PRD에 추가하지 않는다.
- "방향성을 바꾼 결정"만 PRD에 올린다.

## 2. 버저닝 규칙 (SemVer)

`MAJOR.MINOR.PATCH` — 어디까지 서버에 반영됐는지 추적하기 위한 지표.

| 단계   | 올리는 시점                                                 |
| ------ | ----------------------------------------------------------- |
| MAJOR  | 방향성 전환 — 컬러 시스템 교체, IA 변경, 비목표 변경        |
| MINOR  | 새 페이지·컴포넌트·기능 추가 (하위 호환 OK)                 |
| PATCH  | 버그 수정·미세 조정·카피 수정                               |

작업 중인 변경은 `## [Unreleased] ⚪` 섹션에 누적한다.
서버 배포 시점에 다음 버전 번호로 승격하고 `Released: YYYY-MM-DD ✅ Deployed`를 붙인다.

CHANGELOG 최상단 `Latest deployed` / `Working on` 라인을 함께 갱신.

## 3. 배포 상태 표기

각 버전 헤더에 다음 중 하나:
- `✅ Deployed` — 실서버 반영 완료
- `🟡 Staged` — 빌드 됐으나 라이브 전
- `⚪ Unreleased` — 작업 중, 서버에 없음

## 4. 갱신 시점

작업의 마지막 단계에서, `done` 호출 직전에 두 파일을 갱신한다.
사소한 오타·whitespace 수정은 제외.

새 변경은 항상 `[Unreleased]`로 먼저 들어가고, 배포 명령이 떨어졌을 때만 버전이 매겨진다.

## 5. 형식 예시

`CHANGELOG.md` 새 항목:
```
## [Unreleased] ⚪

### Fixed
- 홈 Hero 안 글로우가 maskImage 페이드아웃 가장자리에서 끊겨 보이던 이슈 제거.

### Changed
- TOC·카테고리 사이드바·Callout에서 좌측 컬러 바 제거.
```

배포 시점에 승격:
```
## [1.1.2] — 2026-04-27 ✅ Deployed

> Released: 2026-04-27 · 디테일 정돈
```

`PRD.html`의 결정 로그 항목:
```html
<div class="decision">
  <div class="ref">DEC-09</div>
  <div class="body">
    <h3 class="h">제목</h3>
    <p>이유와 맥락.</p>
    <span class="tag kept">kept</span><span class="tag">v1.2.0</span>
  </div>
</div>
```

PRD 태그에는 날짜 대신 **버전 번호**를 넣는다 (어느 릴리즈에 묶이는지 명확).

## 6. 톤

- 문장은 짧게. 한 줄로 끝낼 수 있으면 한 줄로.
- "수정했습니다" 보다 "수정" 같은 명사형이 더 좋다.
- "왜"가 비자명하면 한 줄 부연. 자명하면 생략.
