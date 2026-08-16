import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Button({
  children,
  variant = "primary",
  size,
  href,
  onClick,
  className,
  type = "button",
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  variant?: "primary" | "solid" | "ghost";
  size?: "sm";
  href?: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const cls = cn("btn", variant === "solid" ? "btn-solid" : variant === "ghost" ? "btn-ghost" : "btn-primary", size === "sm" && "btn-sm", className);
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
