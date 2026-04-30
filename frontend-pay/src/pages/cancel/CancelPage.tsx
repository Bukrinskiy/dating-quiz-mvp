import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../../features/i18n/useI18n";
import { addClickIdToPath } from "../../entities/tracking-attribution/model";
import { DEFAULT_QUIZ_LANG, isQuizLang, payRoutes } from "../../shared/config/routes";
import { flirtoLogoSrc } from "../../shared/branding/flirtoLogo";
import { reachYandexMetrikaGoal } from "../../shared/lib/yandexMetrika";
import { BrandHomeLink } from "../../shared/ui/BrandHomeLink";
import { SiteFooter } from "../../shared/ui/SiteFooter";

export const CancelPage = () => {
  const { copy } = useI18n();
  const location = useLocation();
  const pathLang = location.pathname.split("/")[1];
  const lang = isQuizLang(pathLang) ? pathLang : DEFAULT_QUIZ_LANG;
  const sessionId = new URLSearchParams(location.search).get("session_id") || "";
  const retryTarget = sessionId ? payRoutes.checkout(lang, sessionId) : payRoutes.manage(lang);
  const payHref = addClickIdToPath(retryTarget, location.search);

  useEffect(() => {
    reachYandexMetrikaGoal("pay_cancel");
  }, []);

  return (
    <main className="source-success">
      <section className="source-success__container">
        <div className="source-success__topbar">
          <BrandHomeLink className="source-success__logo-link" ariaLabel="Go home">
            <img src={flirtoLogoSrc} alt="Flirto Guru" />
          </BrandHomeLink>
        </div>
        <section className="source-success__card">
          <h1>{copy.ui.payCancelTitle}</h1>
          <p className="source-success__copy">{copy.ui.payCancelBody}</p>
          <div className="source-success__actions">
            <Link to={payHref} className="source-success__action-btn">
              {copy.ui.payStart}
            </Link>
          </div>
        </section>
        <SiteFooter variant="checkout" />
      </section>
    </main>
  );
};
