/**
 * HeroGlow — ambient radial gradient background for hero sections.
 * Faithful port of components.jsx#HeroGlow. Colors come from the active
 * theme (--glow-1, --glow-2). Mask fades the glow into the page.
 */
export function HeroGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to bottom, rgba(0,0,0,1) 50%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, rgba(0,0,0,1) 50%, transparent)",
      }}
    >
      <div
        className="absolute h-[600px] w-[600px]"
        style={{
          top: "-20%",
          right: "-10%",
          background:
            "radial-gradient(circle, var(--glow-1), transparent 65%)",
          filter: "blur(20px)",
        }}
      />
      <div
        className="absolute h-[500px] w-[600px]"
        style={{
          top: "0%",
          left: "-15%",
          background:
            "radial-gradient(circle, var(--glow-2), transparent 65%)",
          filter: "blur(20px)",
        }}
      />
    </div>
  );
}
