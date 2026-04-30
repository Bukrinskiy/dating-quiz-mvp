import { Link } from "react-router-dom";
import { type QuizLang, payRoutes } from "../../shared/config/routes";
import { flirtoLogoSrc } from "../../shared/branding/flirtoLogo";
import { SiteFooter } from "../../shared/ui/SiteFooter";

type PayNotFoundPageProps = {
  defaultLang: QuizLang;
};

export const PayNotFoundPage = ({ defaultLang }: PayNotFoundPageProps) => {
  return (
    <main className="source-success">
      <section className="source-success__container">
        <div className="source-success__topbar">
          <Link to={payRoutes.manage(defaultLang)} className="source-success__logo-link" aria-label="Go to manage">
            <img src={flirtoLogoSrc} alt="Flirto Guru" />
          </Link>
        </div>
        <section className="source-success__card">
          <h1>404</h1>
          <p className="source-success__copy">Pay page not found</p>
          <div className="source-success__actions">
            <Link className="source-success__action-btn" to={payRoutes.manage(defaultLang)}>
              Go to manage
            </Link>
          </div>
        </section>
        <SiteFooter variant="checkout" />
      </section>
    </main>
  );
};
