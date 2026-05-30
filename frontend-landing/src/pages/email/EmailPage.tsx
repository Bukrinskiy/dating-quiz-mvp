import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { DEFAULT_QUIZ_LANG, isQuizLang, quizRoutes } from "../../shared/config/routes";
import { addClickIdToPath } from "../../entities/tracking-attribution/model";
import { updateQuizSessionEmail } from "../../entities/quiz-session";
import { sendPostbackOnce } from "../../shared/lib/tracking";
import { SiteFooter } from "../../shared/ui/SiteFooter";
import { quizCheckoutContent } from "../../features/email-capture/newCheckoutContent";
import { buildPayHandoffUrl } from "../../features/handoff-to-pay/lib/buildPayHandoffUrl";
import type { LandingManifest } from "../../entities/landing-manifest";
import { resolveInitialEmail } from "./emailQuery";

const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value.trim());

type EmailPageProps = {
  manifest: LandingManifest;
};

export const EmailPage = ({ manifest }: EmailPageProps) => {
  const { uuid, lang: langParam } = useParams<{ uuid: string; lang?: string }>();
  const location = useLocation();
  const lang = isQuizLang(langParam) ? langParam : DEFAULT_QUIZ_LANG;
  const [email, setEmail] = useState(() => resolveInitialEmail(location.search));
  const [busy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const copy = quizCheckoutContent[lang].email;
  const homeHref = addClickIdToPath(quizRoutes.root(manifest.default_locale), location.search);
  const privacyHref = addClickIdToPath(quizRoutes.privacy(lang), location.search);

  useEffect(() => {
    if (!uuid) {
      window.location.replace(addClickIdToPath(quizRoutes.root(lang), location.search));
      return;
    }
  }, [lang, location.search, uuid]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!uuid || !emailValid || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await updateQuizSessionEmail(uuid, normalizedEmail);
      sendPostbackOnce("email_question_completed", location.search, {
        forceSend: true,
        sessionId: uuid,
        trackingParams: { email: normalizedEmail },
      });
      const payHandoffUrl = buildPayHandoffUrl({
        lang,
        sessionId: uuid,
        manifest,
        search: location.search,
      });
      window.location.assign(payHandoffUrl);
    } catch {
      setError(copy.saveEmailError);
    } finally {
      setSaving(false);
    }
  };

  if (busy) {
    return (
      <main className="flirt-quiz">
        <section className="flirt-quiz__container">
          <section className="flirt-quiz__body">
            <section className="flirt-quiz__prompt">
              <h2>{copy.preparingStep}</h2>
            </section>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="source-email">
      <section className="source-email__container">
        <div className="source-email__topbar">
          <Link to={homeHref} className="source-email__logo-link" aria-label={copy.goHomeAria}>
            <img src="/flirto-logo.png" alt="Flirto Guru" />
          </Link>
        </div>
        <img src="/icons/email/email-affemity-funnel/email-img.svg" alt={copy.emailHeroAlt} className="source-email__hero" />
        <h1>{copy.title}</h1>
        <form onSubmit={onSubmit} className="source-email__form">
          <div className="source-email__input-wrap">
            <img src="/icons/email/email-affemity-funnel/email-input-img.svg" alt="" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.emailPlaceholder}
              autoComplete="email"
              required
            />
          </div>
          <div className="source-email__privacy">
            <img src="/icons/email/email-affemity-funnel/email-locked.svg" alt="" />
            <p>
              {copy.privacyText}{" "}
              <a href={privacyHref} target="_blank" rel="noreferrer">{copy.privacyLink}</a>.
            </p>
          </div>
          <button type="submit" className="flirt-quiz__cta" disabled={!emailValid || saving}>
            {saving
              ? copy.loading
              : copy.submit}
          </button>
        </form>
        {error ? <p className="flirt-quiz__error">{error}</p> : null}
        <SiteFooter variant="email" />
      </section>
    </main>
  );
};
