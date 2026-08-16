import { cn } from "@/lib/utils";

export default function Card({
  children,
  className,
  hover = false,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("card", hover && "card-hover", className)} style={style}>
      {children}
    </div>
  );
}
