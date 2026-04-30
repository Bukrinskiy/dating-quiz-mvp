import type { HTMLAttributes, PropsWithChildren } from "react";

type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    tone?: "default" | "strong" | "soft";
    padding?: "sm" | "md" | "lg";
    as?: "article" | "section" | "div";
  }
>;

export function Card({
  as = "article",
  children,
  className = "",
  tone = "default",
  padding = "md",
  ...props
}: CardProps) {
  const Component = as;
  return (
    <Component {...props} className={["card", `card--${tone}`, `card--${padding}`, className].filter(Boolean).join(" ")}>
      {children}
    </Component>
  );
}
