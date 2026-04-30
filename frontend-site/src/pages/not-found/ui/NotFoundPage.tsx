import { Link } from "react-router-dom";
import { runtimeConfig } from "../../../shared/config/runtime";
import { type SiteLocale, siteRoutes } from "../../../shared/config/routes";
import { siteContent } from "../../../shared/i18n/siteContent";
import { SiteFooter } from "../../../widgets/site-footer/ui/SiteFooter";
import { SiteHeader } from "../../../widgets/site-header/ui/SiteHeader";

type NotFoundPageProps = {
  locale: SiteLocale;
};

export const NotFoundPage = ({ locale }: NotFoundPageProps) => {
  const copy = siteContent[locale].notFound;

  return (
    <div className="site-shell">
      <SiteHeader locale={locale} />
      <main className="site-main">
        <div className="site-container">
          <section className="not-found">
            <h1 className="not-found__title">{copy.title}</h1>
            <p className="not-found__body">{copy.body}</p>
            <div className="not-found__actions">
              <Link className="hero-cta__secondary" to={siteRoutes.home(locale)}>
                {copy.home}
              </Link>
              <a className="hero-cta__button" href={runtimeConfig.primaryLandingUrl}>
                {copy.cta}
              </a>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
};
