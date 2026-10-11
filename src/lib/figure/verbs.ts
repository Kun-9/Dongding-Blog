/**
 * 핵심 장면 고르기 — 글의 내용에서 "무엇이 일어나는가"(움직임 동사)로 장면 종류를 고른다.
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
  { verb: "옮겨 간다", figure: "figure 장면 + data-at", use: "토큰·요청·메시지가 참여자 사이를 오간다(JWT, 쿠키, 이벤트, 큐)", how: "참여자 칸에 data-spot, 옮겨 다니는 칩에 data-at" },
  { verb: "복사된다", figure: "figure 장면 + data-at(from>to)", use: "값이나 상태가 복사돼 따로 놀거나 공유된다(fork, 값·참조, 빈 범위)", how: "복사본에 data-step 과 `2:원본>새자리`, 꺼지는 쪽은 data-on 의 bad" },
  { verb: "덮어쓴다", figure: "figure 장면(레인) + data-at·data-text", use: "동시에 도는 것이 같은 값을 덮는다(경쟁 상태, 동시 요청, 캐시 무효화)", how: "레인마다 data-spot, 값 칩이 메모리로 가고 data-text 로 값이 바뀐다" },
  { verb: "번진다", figure: "grid 장면", use: "칸이 차례로 찬다(BFS·DFS, DP 표, 시뮬레이션)", how: "`step:` 마다 격자 전체, 바뀐 칸이 숫자 순서로 차오른다" },
  { verb: "바뀐다", figure: "figure 장면의 터미널 diff", use: "무엇을 무엇으로 바꾸나(설정 값, 모델 이름, 마이그레이션)", how: "옛 줄에 `data-on=\"2+:strike\"`, 새 줄은 `fig-t-add` 에 `data-step=\"2\"`. 파일마다 fig-layer" },
  { verb: "늘고 준다", figure: "bars 장면", use: "조건마다 숫자가 달라진다(가격, 성능, 한도)", how: "`step:` 마다 행 값, 필요하면 `zoom`" },
  { verb: "시점이 온다", figure: "timeline 장면", use: "버전·날짜마다 동작이 바뀐다(기본값 전환, 은퇴 일정)", how: "시점마다 `>`" },
  { verb: "차례로 지난다", figure: "flow·sequence 장면", use: "하나가 정해진 단계를 차례로 지난다. 오가는 물건이 중요하면 '옮겨 간다'로", how: "칸마다 `>`" },
  { verb: "화면이 뜬다", figure: "figure 장면의 터미널", use: "활용 예의 실제 화면, 직접 돌린 코드와 결과", how: "fig-layer 에 단계마다 화면 하나", evidence: true },
];
