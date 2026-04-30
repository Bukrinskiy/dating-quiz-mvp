import { Link } from "react-router-dom";
import { runtimeConfig } from "../../../shared/config/runtime";
import { type SiteLocale, siteRoutes } from "../../../shared/config/routes";
import { siteContent } from "../../../shared/i18n/siteContent";

type SiteFooterProps = {
  locale: SiteLocale;
};

export const SiteFooter = ({ locale }: SiteFooterProps) => {
  const copy = siteContent[locale];

  return (
    <footer className="site-footer">
      <div className="site-container site-footer__row">
        <div className="site-footer__stack">
          <Link className="site-footer__brand" to={siteRoutes.home(locale)}>
            <img className="site-footer__logo" src="/flirto-logo.png" alt={runtimeConfig.appBrand} />
          </Link>
          <p className="site-footer__copy">{copy.footer.summary}</p>
        </div>

        <nav className="site-footer__legal" aria-label="Legal links">
          <Link className="site-footer__legal-link" to={siteRoutes.legal(locale, "terms")}>
            {copy.legal.terms.title}
          </Link>
          <Link className="site-footer__legal-link" to={siteRoutes.legal(locale, "privacy")}>
            {copy.legal.privacy.title}
          </Link>
          <Link className="site-footer__legal-link" to={siteRoutes.legal(locale, "refund")}>
            {copy.legal.refund.title}
          </Link>
        </nav>
      </div>
    </footer>
  );
};
