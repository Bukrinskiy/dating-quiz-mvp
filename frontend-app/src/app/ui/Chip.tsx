import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ChipProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
  }
>;

export function Chip({ children, className = "", active = false, type = "button", ...props }: ChipProps) {
  return (
    <button
      {...props}
      className={["chip", active ? "chip--active" : "", className].filter(Boolean).join(" ")}
      type={type}
    >
      {children}
    </button>
  );
}
