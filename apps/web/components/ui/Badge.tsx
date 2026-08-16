export default function Badge({
  children,
  color = "var(--accent)",
  live = false,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  live?: boolean;
  className?: string;
}) {
  return (
    <span className={`badge ${className ?? ""}`}>
      <span
        className={`status-dot${live ? " live" : ""}`}
        style={{ ["--status" as string]: color }}
        aria-hidden
      />
      {children}
    </span>
  );
}
