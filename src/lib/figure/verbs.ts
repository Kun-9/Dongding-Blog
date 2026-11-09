/**
 * 핵심 장면 고르기 — 글의 내용에서 "무엇이 일어나는가"(움직임 동사)로 그림을 고른다. 흐름·구조는 멈춘
 * 한 장의 ```svg(blog-figures/svg-samples.md 견본)로, 칸이 차오르거나 숫자·시점이 바뀌는 것만 장면으로.
 * 같은 무대라도 동사가 다르면 움직임이 달라져, 글마다 같은 장면(터미널 화면 바꾸기, 지금 칸
 * 빛내기)이 되풀이되지 않는다.
 *
 * 쓰기 기준(lib/voice)과 blog-figures 스킬 표(sync-docs 의 `<!-- figure:verbs -->`)가 이 목록을
 * 따라간다. 새 그림 어휘를 더하면 여기에 동사 한 줄을 더한다.
 */
export interface SceneVerb {
  /** 움직임 동사. */
  verb: string;
  /** 그리는 그림. */
  figure: string;
  /** 이런 내용일 때. */
  use: string;
  /** 쓰는 법 한 줄. */
  how: string;
  /** 증거 자리 — 글의 핵심 장면으로는 고르지 않는다. */
  evidence?: boolean;
}

export const SCENE_VERBS: SceneVerb[] = [
  { verb: "옮겨 간다", figure: "svg 주고받기", use: "토큰·요청·메시지가 참여자 사이를 오간다(JWT, 쿠키, 이벤트, 큐)", how: "참여자 머리 상자와 생명선, 오가는 것마다 이름 붙은 화살표. 끊기는 자리에 mark-x" },
  { verb: "복사된다", figure: "svg 퍼짐·같은 모양 두 판", use: "값이나 상태가 복사돼 따로 놀거나 공유된다(fork, 값·참조, broadcast 사본)", how: "원본에서 사본으로 가는 선, 세거나 막히는 선만 bad. 두 방식이면 같은 배치 두 판" },
  { verb: "덮어쓴다", figure: "svg 주고받기", use: "동시에 도는 것이 같은 값을 덮는다(경쟁 상태, 동시 요청, 캐시 무효화)", how: "참여자와 값 칸 사이 시간 순 화살표(읽기 5, 쓰기 6), 덮이는 쓰기에 mark-x 와 기대값" },
  { verb: "번진다", figure: "grid 장면", use: "칸이 차례로 찬다(BFS·DFS, DP 표, 시뮬레이션)", how: "`step:` 마다 격자 전체, 바뀐 칸이 숫자 순서로 차오른다" },
  { verb: "바뀐다", figure: "figure 장면의 터미널 diff", use: "무엇을 무엇으로 바꾸나(설정 값, 모델 이름, 마이그레이션)", how: "옛 줄에 `data-on=\"2+:strike\"`, 새 줄은 `fig-t-add` 에 `data-step=\"2\"`. 파일마다 fig-layer" },
  { verb: "늘고 준다", figure: "bars 장면", use: "조건마다 숫자가 달라진다(가격, 성능, 한도)", how: "`step:` 마다 행 값, 필요하면 `zoom`" },
  { verb: "시점이 온다", figure: "timeline 장면", use: "버전·날짜마다 동작이 바뀐다(기본값 전환, 은퇴 일정)", how: "시점마다 `>`" },
  { verb: "차례로 지난다", figure: "svg 층 통과", use: "하나가 정해진 단계를 차례로 지나며 무엇이 붙고 바뀐다(미들웨어, 파이프라인). 오가는 물건이 중요하면 '옮겨 간다'로", how: "층을 zone 띠로 쌓고 요청 한 줄이 뚫고 내려간다. 층마다 바뀌는 것 한 줄" },
  { verb: "막힌다", figure: "svg 길×관문", use: "여러 경로가 각자 어느 관문에서 막히나(권한, 방화벽, 훅, 샌드박스)", how: "길은 행, 관문은 칸. 막는 관문 앞에 mark-x 와 응답(403·401), 설정 키는 관문 옆" },
  { verb: "걸러진다", figure: "svg 층 통과", use: "요청이 층을 지나며 일부만 남는다(RLS, 필터, 정책)", how: "마지막 층에 남는 행은 good, 빠진 행은 faint" },
  { verb: "넘어간다", figure: "svg 상태 이동", use: "무엇이 조건에 따라 다른 상태로 넘어간다(토큰 회전, 주문 상태, 세션)", how: "상태는 상자, 조건은 화살표 옆 글자. 나쁜 길만 bad" },
  { verb: "화면이 뜬다", figure: "figure 장면의 터미널", use: "활용 예의 실제 화면, 직접 돌린 코드와 결과", how: "fig-layer 에 단계마다 화면 하나", evidence: true },
];
