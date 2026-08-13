"use client";

/**
 * 사이트 전역 설정 폼의 상태 — 불러오기·변경 감지·저장.
 *
 * `/settings` 와 `/settings/cards` 가 같은 한 행(`site_settings`)을 편집한다.
 * 저장은 언제나 폼 전체를 PUT 하므로, 두 페이지를 동시에 열어 두면 나중에
 * 저장한 쪽이 이긴다 — 혼자 쓰는 관리 화면이라 잠금까지는 걸지 않았다.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { API } from "@/lib/api-routes";
import { site } from "@/lib/site";
import type { SiteMeta } from "@/lib/types";
import type { SaveStatus } from "@/components/settings/Fields";

export function useSiteSettings() {
  const router = useRouter();
  // 정본은 DB 지만 초기값은 번들에 박힌 기본값으로 채운다 — 로딩 중 빈 폼이
  // 깜빡이지 않게. 아래 effect 가 저장값을 받아 폼과 기준선을 함께 교체한다.
  const [form, setForm] = useState<SiteMeta>(site);
  const [baseline, setBaseline] = useState(() => JSON.stringify(site));
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    fetch(API.settings)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        // 실패하면 기본값을 그대로 둔다 — 저장할 때 검증에서 다시 걸린다.
        if (cancelled || !data) return;
        setForm(data as SiteMeta);
        setBaseline(JSON.stringify(data));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = JSON.stringify(form) !== baseline;

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch(API.settings, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setBaseline(JSON.stringify(form));
      setStatus("saved");
      // 헤더·푸터·메타가 서버에서 렌더되므로 새로 받아야 반영이 보인다.
      router.refresh();
    } catch (e) {
      setStatus({ error: e instanceof Error ? e.message : String(e) });
    }
  };

  const reset = () => {
    setForm(JSON.parse(baseline) as SiteMeta);
    setStatus("idle");
  };

  return {
    form,
    setForm,
    dirty,
    // 저장 후 다시 고치면 "저장됨" 배지는 걷는다.
    status: status === "saved" && dirty ? ("idle" as SaveStatus) : status,
    save,
    reset,
  };
}
