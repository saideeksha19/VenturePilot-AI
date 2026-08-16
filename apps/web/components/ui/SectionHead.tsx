import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SectionHead({
  title,
  sub,
  linkHref,
  linkLabel,
  children,
}: {
  title: string;
  sub?: string;
  linkHref?: string;
  linkLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {children}
        {linkHref && (
          <Link href={linkHref} className="section-link">
            {linkLabel ?? "View all"} <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
}
