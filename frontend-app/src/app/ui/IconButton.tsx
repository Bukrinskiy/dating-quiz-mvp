import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { Button } from "./Button";

type IconButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
  }
>;

export function IconButton({ children, label, variant = "ghost", size = "md", ...props }: IconButtonProps) {
  return (
    <Button {...props} aria-label={label} iconOnly size={size} variant={variant}>
      {children}
    </Button>
  );
}
