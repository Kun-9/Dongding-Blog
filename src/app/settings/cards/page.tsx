"use client";

/**
 * README 카드 설정 — `/card` 띠와 `/card/app/{slug}` 앱 카드의 문구·주소·아이콘.
 *
 * 미리보기는 `/api/settings/card-preview` 가 실제 카드 렌더러로 그려 준 SVG 다.
 * 화면용 복제본이 아니라서 카드 디자인을 고쳐도 따로 손댈 곳이 없다.
 *
 * 정본은 Supabase `site_settings` 이고 저장은 `/api/settings` 가 맡는다.
 * 접근은 proxy 의 로그인 검사로 막는다.
 */
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { API } from "@/lib/api-routes";
import type { AppCard, SiteMeta } from "@/lib/types";
import {
  Card,
  Row,
  SaveBar,
  Segmented,
  TextInput,
  Textarea,
} from "@/components/settings/Fields";
import { useSiteSettings } from "@/components/settings/useSiteSettings";

/** 업로드 아이콘 상한. data URI 로 설정 JSON 에 통째로 들어가는 값이다. */
const MAX_ICON_BYTES = 96 * 1024;
const ICON_ACCEPT = "image/png,image/jpeg,image/gif,image/svg+xml";

type PreviewBody =
  | {
      kind: "blog";
      label: string;
      headline: string[];
      tagline: string;
      host: string;
    }
  | { kind: "app"; name: string; desc: string; host: string; icon: string };

export default function Page() {
  const { form, setForm, dirty, status, save, reset } = useSiteSettings();

  const setOg = <K extends keyof SiteMeta["og"]>(
    key: K,
    value: SiteMeta["og"][K],
  ) => setForm((prev) => ({ ...prev, og: { ...prev.og, [key]: value } }));

  const setApps = (apps: AppCard[]) =>
    setForm((prev) => ({ ...prev, cards: { ...prev.cards, apps } }));

  const patchApp = (i: number, patch: Partial<AppCard>) =>
    setApps(form.cards.apps.map((a, n) => (n === i ? { ...a, ...patch } : a)));

  return (
    <main className="mx-auto max-w-[880px] px-[var(--gut)] pb-16 pt-10">
      <header className="mb-7">
        <a
          href="/settings"
          className="font-sans text-[12.5px] text-ink-muted no-underline"
        >
          ← 설정
        </a>
        <h1 className="mb-0 mt-2 font-sans text-[clamp(27px,6vw,36px)] font-semibold tracking-[-0.03em] text-ink">
          README 카드
        </h1>
        <p className="mt-2 text-sm leading-[1.6] text-ink-muted">
          GitHub 프로필 README 에 이미지로 거는 카드입니다. 저장하면 사이트 캐시는
          바로 비워지지만, README 에 보이는 그림은 GitHub 의 이미지 프록시(camo)와
          CDN 캐시 때문에 한동안 옛 그림일 수 있습니다.
        </p>
      </header>

      {/* 블로그 띠 — /card */}
      <Card
        id="cards-blog"
        title="블로그 띠"
        source="supabase · site_settings → og / cards.host"
      >
        <CardPreview
          body={{
            kind: "blog",
            label: form.og.label,
            headline: [...form.og.headline],
            tagline: form.og.tagline,
            host: form.cards.host,
          }}
        />
        <p className="font-mono text-[11.5px] text-ink-muted">/card</p>
        <Row label="라벨">
          <TextInput
            value={form.og.label}
            onChange={(v) => setOg("label", v)}
            mono
          />
        </Row>
        <Row label="헤드라인">
          <Textarea
            value={form.og.headline.join("\n")}
            onChange={(v) =>
              setOg(
                "headline",
                v
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              )
            }
            hint="줄바꿈으로 구분 (1~3줄) · SNS OG 이미지와 같이 씁니다"
            rows={3}
          />
        </Row>
        <Row label="태그라인">
          <TextInput
            value={form.og.tagline}
            onChange={(v) => setOg("tagline", v)}
          />
        </Row>
        <Row label="주소 표기">
          <TextInput
            value={form.cards.host}
            onChange={(v) =>
              setForm((prev) => ({
                ...prev,
                cards: { ...prev.cards, host: v },
              }))
            }
            mono
          />
        </Row>
      </Card>

      {/* 앱 카드 — /card/app/{slug} */}
      {form.cards.apps.map((app, i) => (
        <Card
          key={i}
          id={`cards-app-${i}`}
          title={app.name || "이름 없는 앱"}
          source={`supabase · site_settings → cards.apps[${i}]`}
        >
          <CardPreview
            body={{
              kind: "app",
              name: app.name,
              desc: app.desc,
              host: app.host,
              icon: app.icon,
            }}
          />
          <p className="font-mono text-[11.5px] text-ink-muted">
            /card/app/{app.slug || "…"}
          </p>
          <Row label="slug">
            <TextInput
              value={app.slug}
              onChange={(v) => patchApp(i, { slug: v })}
              mono
              placeholder="영소문자·숫자·하이픈"
            />
          </Row>
          <Row label="이름">
            <TextInput
              value={app.name}
              onChange={(v) => patchApp(i, { name: v })}
            />
          </Row>
          <Row label="설명">
            <TextInput
              value={app.desc}
              onChange={(v) => patchApp(i, { desc: v })}
            />
          </Row>
          <Row label="주소">
            <TextInput
              value={app.host}
              onChange={(v) => patchApp(i, { host: v })}
              mono
            />
          </Row>
          <Row label="아이콘">
            <IconField
              app={app}
              onChange={(icon) => patchApp(i, { icon })}
            />
          </Row>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setApps(form.cards.apps.filter((_, n) => n !== i))}
              className="cursor-pointer rounded-md border border-border-token bg-transparent px-2.5 py-1 font-sans text-[12.5px] text-ink-muted hover:text-ink"
            >
              이 카드 삭제
            </button>
          </div>
        </Card>
      ))}

      <button
        type="button"
        onClick={() =>
          setApps([
            ...form.cards.apps,
            { slug: "", name: "", desc: "", host: "", icon: "" },
          ])
        }
        className="w-full cursor-pointer rounded-xl border border-dashed border-border-token bg-transparent py-3 font-sans text-[13px] font-medium text-ink-soft hover:bg-hover"
      >
        + 앱 카드 추가
      </button>

      <SaveBar status={status} dirty={dirty} onReset={reset} onSave={save} />
    </main>
  );
}

/**
 * 폼 값을 그대로 서버에 보내 진짜 카드 SVG 를 받아 그린다.
 *
 * 받은 SVG 는 `<img>` 의 data URI 로 넣는다 — 문서에 직접 붙이면 아이콘으로 넣은
 * 남의 이미지가 이 화면의 DOM 안에서 살게 된다.
 */
function CardPreview({ body }: { body: PreviewBody }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const key = JSON.stringify(body);

  useEffect(() => {
    // 타이핑마다 그리면 satori 를 한 글자당 한 번씩 부른다.
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(API.cardPreview, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(JSON.parse(key) as PreviewBody), theme }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSvg(await res.text());
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [key, theme]);

  return (
    <div
      className="rounded-lg border border-border-token px-3.5 pb-3.5 pt-3"
      style={{ background: "var(--bg)" }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span className="mr-auto font-mono text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
          preview
        </span>
        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            ["light", "라이트"],
            ["dark", "다크"],
          ]}
        />
      </div>
      {svg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
          alt=""
          className="block w-full"
        />
      ) : (
        <p className="font-mono text-[11.5px] text-ink-muted">
          {error ? `그리지 못했습니다 — ${error}` : "그리는 중…"}
        </p>
      )}
    </div>
  );
}

/** 파비콘 자동 수집 + 직접 업로드. 둘 다 결과는 data URI 한 줄이다. */
function IconField({
  app,
  onChange,
}: {
  app: AppCard;
  onChange: (icon: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const grab = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(API.cardIcon, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: app.host }),
      });
      const data = (await res.json()) as { icon?: string; error?: string };
      if (!res.ok || !data.icon) throw new Error(data.error ?? `HTTP ${res.status}`);
      onChange(data.icon);
      setMsg("가져왔습니다");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const upload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_ICON_BYTES) {
      setMsg("96KB 이하 이미지만 됩니다");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange(String(reader.result));
      setMsg("올렸습니다");
    };
    reader.onerror = () => setMsg("파일을 읽지 못했습니다");
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {app.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={app.icon}
          alt=""
          width={32}
          height={32}
          className="rounded-lg border border-border-token"
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-border-token font-sans text-[13px] text-ink-muted">
          {[...app.name][0] ?? "?"}
        </span>
      )}
      <button
        type="button"
        onClick={grab}
        disabled={busy || !app.host}
        className="cursor-pointer rounded-md border border-border-token bg-transparent px-2.5 py-1.5 font-sans text-[12.5px] text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "가져오는 중…" : "주소에서 파비콘 가져오기"}
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-md border border-border-token bg-transparent px-2.5 py-1.5 font-sans text-[12.5px] text-ink"
      >
        직접 올리기
      </button>
      {app.icon && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setMsg("");
          }}
          className="cursor-pointer border-none bg-transparent p-0 font-sans text-[12.5px] text-ink-muted underline"
        >
          비우기
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={ICON_ACCEPT}
        onChange={upload}
        className="hidden"
      />
      {msg && (
        <span className="basis-full font-mono text-[11.5px] text-ink-muted">
          {msg}
        </span>
      )}
    </div>
  );
}
