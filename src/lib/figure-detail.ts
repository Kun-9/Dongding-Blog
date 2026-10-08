/**
 * 그림의 자세히 — `data-detail` 이 달린 칸만 마우스를 올리면 미리 보이고, 누르면(터치·Enter)
 * 그림 아래 칸에 고정된다. 그림 블록의 `> 내용` 줄, figure·SVG 의 data-detail 이 같은 길을 쓴다.
 *
 * 핵심 정보는 그림과 본문에 있고 자세히는 보충(출처·계산 내역·배포일)이다. 자세히가 없는
 * 그림에는 아무것도 붙지 않는다. Motion 을 쓰지 않아 움직임 줄이기 설정에서도 그대로 동작한다.
 *
 * 브라우저 DOM 을 쓴다. 클라이언트에서만 부른다(components/prose/diagram/Motion).
 */
let seq = 0;

const HINT = "점선 칸을 누르면 자세한 내용이 열립니다";

export function attachFigureDetail(root: HTMLElement): () => void {
  const items = [...root.querySelectorAll<HTMLElement | SVGElement>("[data-detail]")];
  if (!items.length) return () => {};

  // 그림 판 아래, 캡션 위에 한 칸. 처음부터 자리를 잡아 둬 열 때 아래 글이 덜 밀린다.
  const fig = root.closest("figure") ?? root;
  const panel = document.createElement("p");
  panel.className = "dg-detail";
  panel.id = `dg-detail-${++seq}`;
  panel.setAttribute("aria-live", "polite");
  const cap = fig.querySelector(":scope > figcaption");
  if (cap) fig.insertBefore(panel, cap);
  else fig.append(panel);

  let pinned: Element | null = null;
  const show = (el: Element | null) => {
    const text = el?.getAttribute("data-detail");
    panel.textContent = text || HINT;
    panel.dataset.state = text ? "open" : "hint";
  };
  const pin = (el: Element | null) => {
    pinned = el;
    for (const it of items) it.setAttribute("aria-expanded", String(it === el));
    show(el);
  };
  show(null);

  for (const el of items) {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-expanded", "false");
    el.setAttribute("aria-controls", panel.id);
  }

  // 그림 하나에 한 번만 건다. 칸 안의 칸(겹친 상자)은 가장 안쪽이 잡힌다.
  const target = (e: Event) => {
    const el = (e.target as Element | null)?.closest("[data-detail]");
    return el && root.contains(el) ? el : null;
  };
  const onOver = (e: PointerEvent) => {
    if (e.pointerType === "mouse") show(target(e) ?? pinned);
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === "mouse") show(pinned);
  };
  const onClick = (e: MouseEvent) => {
    const el = target(e);
    if (!el) return;
    // 본문 SVG 는 확대 버튼 안에 있다. 칸을 누른 것은 확대가 아니다.
    e.stopPropagation();
    e.preventDefault();
    pin(pinned === el ? null : el);
  };
  const onKey = (e: KeyboardEvent) => {
    const el = target(e);
    if (e.key === "Escape") return pin(null);
    if (!el || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    e.stopPropagation();
    pin(pinned === el ? null : el);
  };
  root.addEventListener("pointerover", onOver);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKey);

  return () => {
    root.removeEventListener("pointerover", onOver);
    root.removeEventListener("pointerleave", onLeave);
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKey);
    panel.remove();
    for (const el of items) for (const a of ["tabindex", "role", "aria-expanded", "aria-controls"]) el.removeAttribute(a);
  };
}
