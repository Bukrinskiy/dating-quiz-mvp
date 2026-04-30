import { runtimeConfig } from "../../../shared/config/runtime";
import { type SiteLocale } from "../../../shared/config/routes";
import { siteContent } from "../../../shared/i18n/siteContent";

type HeroCtaProps = {
  locale: SiteLocale;
};

export const HeroCta = ({ locale }: HeroCtaProps) => {
  const copy = siteContent[locale].hero;
  return (
    <section className="hero-cta">
      <div className="hero-cta__content">
        <div className="hero-cta__panel">
          <h1 className="hero-cta__title">{copy.title}</h1>
          <p className="hero-cta__lead">{copy.lead}</p>
          <div className="hero-cta__actions">
            <a className="hero-cta__button" href={runtimeConfig.primaryLandingUrl}>
              {copy.primaryCta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
