/**
 * 링크 끝에 붙는 방향 꺾쇠. 글꼴의 → 는 글꼴마다 길이가 달라(JetBrains Mono 는 한 칸을
 * 가로선으로 꽉 채운다) SVG 로 그린다. 크기는 글자 크기(1em), 색은 글자색을 따른다.
 */
export function Chevron({
  dir = "right",
  className = "",
}: {
  dir?: "left" | "right";
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block h-[1em] w-[1em] shrink-0 ${className}`}
    >
      <path d={dir === "left" ? "M7.5 2.5 4 6l3.5 3.5" : "M4.5 2.5 8 6l-3.5 3.5"} />
    </svg>
  );
}
