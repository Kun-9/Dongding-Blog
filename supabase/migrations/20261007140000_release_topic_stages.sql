-- 집필 단계 개편 — 수요 확인(demand)을 빼고 자료(assets)·점검(review)을 넣는다.
--
-- 차별점은 "누가 먼저 썼나"가 아니라 말투와 자료다. 그래서 자료(표·그림)를
-- 초안보다 앞에 두고, 발행 전에 문체·구성 점검을 거친다. 점검은 서버가 본문을
-- lib/voice 기준(합니다체, 필수 구성)으로 직접 검사한다.
--
-- 20261007120000 이 이미 적용된 DB 와 아직 안 된 DB 모두에서 같은 결과가
-- 나오도록 별도 파일로 둔다. 적용 기록은 버전 번호만 비교하므로 앞 파일을
-- 고쳐서는 적용된 DB 에 반영되지 않는다.

-- 수요 확인까지 갔던 주제는 글감 묶음으로 되돌린다. 그 단계가 없어졌다.
update release_topics
   set stage = 'picked',
       checks = checks - 'demand',
       updated_at = now()
 where stage = 'demand' or checks ? 'demand';

alter table release_topics drop constraint release_topics_stage_check;
alter table release_topics add constraint release_topics_stage_check
  check (stage in ('picked', 'sources', 'assets', 'draft', 'review', 'published'));

-- 초기 주제의 가제에서 헤드라인 말투를 걷어낸다. 사람이 이미 고친 제목은
-- 옛 제목과 달라 걸리지 않는다.
update release_topics t
   set title = v.new_title, angle = v.new_angle, updated_at = now()
  from (values
    ('Claude Mods', 'Claude Code Mods 정리',
     '플러그인 구조가 미들웨어 방식으로 바뀜. 개념 설명과 구조 그림이 필요'),
    ('auto mode 가 기본값이 됐다', 'auto mode 기본값 전환 정리',
     '세 릴리스에 걸쳐 모든 실행 환경에서 기본값으로. 버전별 변화 표가 중심'),
    ('AGENTS.md 지원', 'Claude Code의 AGENTS.md 지원',
     'Codex·Cursor와 설정 파일을 같이 쓰는 방법. 도구별 비교 표'),
    ('Opus 5.5 · Sonnet 5.5 와 1M 컨텍스트', 'Opus 5.5·Sonnet 5.5 가격과 1M 컨텍스트',
     '가격, 플랜별 기본 모델, 1M 기본값 변경. 가격 비교 표'),
    ('턴 중간에 끼어들기 — send now', 'send now 동작 변화 (2.1.275~2.1.286)',
     '추가 뒤 동작이 두 번 바뀜. 버전별 동작 흐름 그림'),
    ('프롬프트·플러그인 품질 도구', '/doctor prompt-audit와 플러그인 평가',
     '기존 CLAUDE.md·스킬·플러그인을 점검하는 도구 두 가지. 실행 화면 중심'),
    ('두 달 치 터미널 개편', '터미널 UX 변경 모음 (8~10월)',
     '릴리스마다 한 줄씩 들어온 터미널 변경을 한 편으로. 전/후 스크린샷')
  ) as v(old_title, new_title, new_angle)
 where t.title = v.old_title;
