import { Link } from "react-router-dom";
import { runtimeConfig } from "../../../shared/config/runtime";
import { type SiteLocale, siteRoutes } from "../../../shared/config/routes";
import { siteContent } from "../../../shared/i18n/siteContent";

type SiteHeaderProps = {
  locale: SiteLocale;
};

export const SiteHeader = ({ locale }: SiteHeaderProps) => {
  const copy = siteContent[locale];

  return (
    <header className="site-header">
      <div className="site-container site-header__row">
        <Link className="site-header__brand" to={siteRoutes.home(locale)}>
          <img className="site-header__logo" src="/flirto-logo-header-transparent.png" alt={runtimeConfig.appBrand} />
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
          {siteRoutes.primaryNav(locale).map((item) => (
            <a key={item.href} className="site-header__nav-link" href={item.href}>
              {item.label}
            </a>
          ))}
          <a className="site-header__nav-link" href={runtimeConfig.appPublicBaseUrl}>
            {copy.navigation.openApp}
          </a>
          <a className="site-header__cta" href={runtimeConfig.primaryLandingUrl}>
            {copy.navigation.launchLanding}
          </a>
        </nav>
      </div>
    </header>
  );
};
