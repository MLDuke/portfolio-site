import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({
  children,
  className = "",
}: PageTransitionProps) {
  return (
    <div className={["site-page-content min-w-0", className].join(" ")}>
      {children}
    </div>
  );
}
