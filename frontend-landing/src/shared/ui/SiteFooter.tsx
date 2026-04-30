import { LegalLinks } from "./LegalLinks";

type SiteFooterVariant = "quiz" | "email" | "checkout" | "legal";

type SiteFooterProps = {
  variant?: SiteFooterVariant;
  className?: string;
};

export const SiteFooter = ({ variant = "quiz", className = "" }: SiteFooterProps) => {
  return (
    <footer className={`site-footer site-footer--${variant} ${className}`.trim()}>
      <LegalLinks className="site-footer__legal" />
    </footer>
  );
};

