import { Link } from "react-router-dom";
import { quizRoutes, type QuizLang } from "../../shared/config/routes";
import { SiteFooter } from "../../shared/ui/SiteFooter";

type LandingNotFoundPageProps = {
  defaultLang: QuizLang;
};

export const LandingNotFoundPage = ({ defaultLang }: LandingNotFoundPageProps) => {
  return (
    <main className="source-success">
      <section className="source-success__container">
        <div className="source-success__topbar">
          <Link to={quizRoutes.root(defaultLang)} className="source-success__logo-link" aria-label="Go to quiz">
            <img src="/flirto-logo.png" alt="Flirto Guru" />
          </Link>
        </div>
        <section className="source-success__card">
          <h1>404</h1>
          <p className="source-success__copy">Landing page not found</p>
          <div className="source-success__actions">
            <Link className="source-success__action-btn" to={quizRoutes.root(defaultLang)}>
              Go to quiz
            </Link>
          </div>
        </section>
        <SiteFooter variant="checkout" />
      </section>
    </main>
  );
};
