export default function FluidBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="blob w-[36rem] h-[36rem] -top-32 -left-24 bg-accent/50"
        style={{ animation: "drift-one 26s ease-in-out infinite" }}
      />
      <div
        className="blob w-[30rem] h-[30rem] top-1/3 -right-20 bg-warn/40"
        style={{ animation: "drift-two 32s ease-in-out infinite" }}
      />
      <div
        className="blob w-[28rem] h-[28rem] -bottom-24 left-1/4 bg-ink/[0.06]"
        style={{ animation: "drift-three 22s ease-in-out infinite" }}
      />
      <div className="absolute inset-0 bg-bg/60" />
    </div>
  );
}