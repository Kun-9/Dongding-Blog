/**
 * 구조 — layers(겹친 상자 / 쌓인 층)와 tree(계층·파일 구조).
 */
import type { Item, TreeNode } from "@/lib/diagram";
import { Label, cx, step, tone } from "./parts";

/** 바깥에서 안쪽으로 겹친 상자. 바깥 상자가 안쪽을 감싼다(포함 관계). */
function Nest({ items, i }: { items: Item[]; i: number }) {
  const it = items[i];
  if (!it) return null;
  const inner = i === items.length - 1;
  // 겹마다 바탕을 번갈아 둬 경계가 보이게 한다.
  const plain = !it.accent && !it.muted;
  return (
    <div
      data-anim="fade"
      className={cx(
        "rounded-xl border px-3.5 pt-3 sm:px-4",
        inner ? "pb-3.5" : "pb-3.5 sm:pb-4",
        tone(it),
        plain && i % 2 === 1 && "bg-surface-alt",
      )}
      style={step(i)}
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <Label label={it.label} sub={it.sub} m={it} size="sm" />
        <span className="shrink-0 font-mono text-[10.5px] tracking-[0.04em] text-ink-subtle">L{i + 1}</span>
      </div>
      {!inner && <Nest items={items} i={i + 1} />}
    </div>
  );
}

/** 위에서 아래로 쌓인 층. 위가 먼저(우선순위·호출 순서). */
function Stack({ items }: { items: Item[] }) {
  return (
    <div className="relative flex gap-3 sm:gap-4">
      <div aria-hidden className="flex w-4 shrink-0 flex-col items-center py-1 text-ink-subtle">
        <svg viewBox="0 0 10 10" className="size-2.5"><path d="M5 1.5 8.5 7h-7z" fill="currentColor" /></svg>
        <span className="my-1 w-0 flex-1 border-l-[1.5px] border-dashed border-border-strong" />
        <svg viewBox="0 0 10 10" className="size-2.5 rotate-180"><path d="M5 1.5 8.5 7h-7z" fill="currentColor" /></svg>
      </div>
      <ol className="flex min-w-0 flex-1 flex-col gap-1.5">
        {items.map((it, i) => (
          <li
            key={i}
            data-anim="rise"
            className={cx("flex items-center gap-3 rounded-lg border px-3.5 py-2.5", tone(it))}
            style={step(i)}
          >
            <span className="w-5 shrink-0 font-mono text-[11px] tabular-nums text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
            <Label label={it.label} sub={it.sub} m={it} size="sm" />
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Layers({ items, layout }: { items: Item[]; layout: "nest" | "stack" }) {
  return layout === "stack" ? <Stack items={items} /> : <Nest items={items} i={0} />;
}

/* ── tree ─────────────────────────────────────────────────────────────── */

function Icon({ label }: { label: string }) {
  if (label.endsWith("/")) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 shrink-0 opacity-70">
        <path d="M1.75 4.25c0-.69.56-1.25 1.25-1.25h3.1l1.4 1.5H13c.69 0 1.25.56 1.25 1.25v6.25c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  if (/\.[a-z0-9]{1,6}$/i.test(label)) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 shrink-0 opacity-60">
        <path d="M4 1.75h5l3.25 3.25v9.25H4z M9 1.75V5h3.25" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  return null;
}

/** 등장 순서(위→아래). 그리기 전에 한 번 센다. */
type Order = Map<TreeNode, number>;

function preorder(nodes: TreeNode[], out: Order = new Map()): Order {
  for (const n of nodes) {
    out.set(n, out.size);
    preorder(n.children, out);
  }
  return out;
}

function Branch({ nodes, depth, order }: { nodes: TreeNode[]; depth: number; order: Order }) {
  return (
    <ul className={depth ? "ml-[11px]" : ""}>
      {nodes.map((n, i) => {
        const pathy = n.label.endsWith("/") || /\.[a-z0-9]{1,6}$/i.test(n.label);
        return (
          <li
            key={i}
            className={cx(
              "relative",
              depth > 0 &&
                "pl-[22px] before:absolute before:top-0 before:left-0 before:h-full before:w-0 before:border-l-[1.5px] before:border-border-strong after:absolute after:top-[20px] after:left-0 after:w-[16px] after:border-t-[1.5px] after:border-border-strong last:before:h-[20px]",
              n.muted && depth > 0 && "before:border-dashed after:border-dashed",
            )}
          >
            <div data-anim="rise" className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 py-[3px]" style={step(order.get(n) ?? 0)}>
              <span
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-[5px] text-[13.5px] leading-[1.45]",
                  tone(n),
                  pathy && "font-mono text-[12.5px]",
                  n.accent ? "font-semibold" : "font-medium",
                )}
              >
                <Icon label={n.label} />
                {n.label}
              </span>
              {n.sub ? <span className="text-[12.5px] leading-[1.45] text-ink-muted break-keep">{n.sub}</span> : null}
            </div>
            {n.children.length > 0 && <Branch nodes={n.children} depth={depth + 1} order={order} />}
          </li>
        );
      })}
    </ul>
  );
}

export function Tree({ roots }: { roots: TreeNode[] }) {
  return <Branch nodes={roots} depth={0} order={preorder(roots)} />;
}
