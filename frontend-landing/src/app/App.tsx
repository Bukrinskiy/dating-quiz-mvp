import { type ComponentProps, useEffect, useMemo, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { resolveLandingManifest, type LandingManifest } from "../entities/landing-manifest";
import { useI18n } from "../features/i18n/useI18n";
import { EmailPage } from "../pages/email/EmailPage";
import { LegalPage } from "../pages/legal/LegalPage";
import { LandingNotFoundPage } from "../pages/not-found/LandingNotFoundPage";
import { QuizPage } from "../pages/quiz/QuizPage";
import { DEFAULT_QUIZ_LANG, canonicalQuizLang, isQuizLang, quizRoutes } from "../shared/config/routes";
import { getClickId, propagateClickIdToLinks } from "../entities/tracking-attribution/model";
import { linkGaClientIdOnce } from "../shared/lib/tracking";
import { logTracking } from "../shared/lib/trackingLogger";
import { hitYandexMetrikaPage } from "../shared/lib/yandexMetrika";

type GtagFn = (
  command: "get",
  targetId: string,
  fieldName: "client_id",
  callback: (value: string | undefined) => void,
) => void;

type BPixelTokens = { bcid?: string | null } | undefined;

const RedirectWithSearch = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const LocalizedQuizEntryPage = ({ manifest }: { manifest: LandingManifest }) => {
  const location = useLocation();
  const { lang } = useParams<{ lang?: string }>();
  const isQuizPath = /\/quiz\/?$/.test(location.pathname);
  const englishEntry = isQuizPath ? quizRoutes.root(DEFAULT_QUIZ_LANG) : `/${DEFAULT_QUIZ_LANG}`;
  if (!isQuizLang(lang)) {
    return <RedirectWithSearch to={englishEntry} />;
  }
  if (lang !== DEFAULT_QUIZ_LANG) {
    return <RedirectWithSearch to={englishEntry} />;
  }

  return <QuizPage manifest={manifest} />;
};

const QuizStepRoute = ({ manifest }: { manifest: LandingManifest }) => {
  const { lang, step } = useParams<{ lang?: string; step?: string }>();
  if (!isQuizLang(lang) || lang !== DEFAULT_QUIZ_LANG) {
    return <RedirectWithSearch to={quizRoutes.step(DEFAULT_QUIZ_LANG, step ?? "1")} />;
  }

  return <QuizPage manifest={manifest} />;
};

const QuizEmailRoute = ({ manifest }: { manifest: LandingManifest }) => {
  const { lang, uuid } = useParams<{ lang?: string; uuid?: string }>();
  if (!isQuizLang(lang) || lang !== DEFAULT_QUIZ_LANG) {
    return <RedirectWithSearch to={quizRoutes.email(DEFAULT_QUIZ_LANG, uuid ?? "")} />;
  }

  return <EmailPage manifest={manifest} />;
};

const QuizLegalRoute = ({ document, route }: { document: ComponentProps<typeof LegalPage>["document"]; route: "terms" | "privacy" | "refund" }) => {
  const { lang } = useParams<{ lang?: string }>();
  if (!isQuizLang(lang) || lang !== DEFAULT_QUIZ_LANG) {
    const target =
      route === "terms" ? quizRoutes.terms(DEFAULT_QUIZ_LANG) : route === "privacy" ? quizRoutes.privacy(DEFAULT_QUIZ_LANG) : quizRoutes.refund(DEFAULT_QUIZ_LANG);
    return <RedirectWithSearch to={target} />;
  }

  return <LegalPage document={document} />;
};

const LegacyQuizRedirect = ({ manifest }: { manifest: LandingManifest }) => {
  const location = useLocation();
  const path = location.pathname;
  if (path === "/quiz" || path === "/quiz/") {
    return <RedirectWithSearch to={quizRoutes.root(manifest.default_locale)} />;
  }

  const stepMatch = path.match(/^\/quiz\/(\d+)$/);
  if (stepMatch) {
    return <RedirectWithSearch to={quizRoutes.step(manifest.default_locale, stepMatch[1])} />;
  }

  const emailMatch = path.match(/^\/quiz\/email\/(.+)$/);
  if (emailMatch) {
    return <RedirectWithSearch to={quizRoutes.email(manifest.default_locale, emailMatch[1])} />;
  }

  return <RedirectWithSearch to={quizRoutes.step(manifest.default_locale, 1)} />;
};

const HostBoundary = () => {
  const location = useLocation();
  const { copy, locale, setLocale } = useI18n();
  const manifest = useMemo(() => resolveLandingManifest(window.location.hostname), []);
  const didSendInitialPageViewRef = useRef(false);
  const didSendInitialYandexPageViewRef = useRef(false);

  useEffect(() => {
    const langCandidate = location.pathname.split("/")[1];
    const nextLocale = canonicalQuizLang(langCandidate);
    if (nextLocale === locale) {
      return;
    }
    setLocale(nextLocale);
  }, [locale, location.pathname, setLocale]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      propagateClickIdToLinks(location.search);
      logTracking("links", "propagateClickIdToLinks called", { pathname: location.pathname, search: location.search });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!didSendInitialPageViewRef.current) {
      didSendInitialPageViewRef.current = true;
      return;
    }

    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === "function") {
      fbq("track", "PageView");
      logTracking("facebook", "PageView tracked on route change", { pathname: location.pathname, search: location.search });
      return;
    }

    logTracking("facebook", "fbq is not available on route change", { pathname: location.pathname }, "warn");
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!didSendInitialYandexPageViewRef.current) {
      didSendInitialYandexPageViewRef.current = true;
      return;
    }

    hitYandexMetrikaPage(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const bPixel = (window as Window & {
      BPixelJS?: { useTokens?: (fn: (tokens: BPixelTokens) => void) => void };
    }).BPixelJS;
    if (!bPixel?.useTokens) {
      logTracking("mobi-slon", "BPixelJS.useTokens is not available", undefined, "warn");
      return;
    }

    const ga4Id = ((window.__APP_CONFIG__ && window.__APP_CONFIG__.VITE_GOOGLE_ADS_ID) || "").trim();
    const sourceParam = new URLSearchParams(window.location.search).get("source")?.trim().toLowerCase();
    const isGaSource = sourceParam === "ga";
    let gaClientId: string | undefined;
    let bcid: string | undefined;
    let linkFired = false;
    const tryLink = () => {
      if (linkFired || !gaClientId || !bcid) return;
      linkFired = true;
      linkGaClientIdOnce(bcid, gaClientId);
    };

    logTracking("mobi-slon", "BPixelJS.useTokens callback registered");
    bPixel.useTokens((tokens) => {
      propagateClickIdToLinks(window.location.search);
      logTracking("mobi-slon", "BPixelJS.useTokens callback fired");
      const resolved = (tokens?.bcid ?? "").toString().trim() || getClickId(window.location.search)?.trim();
      if (resolved) {
        bcid = resolved;
        tryLink();
      }
    });

    if (ga4Id && isGaSource) {
      const gtag = (window as Window & { gtag?: GtagFn }).gtag;
      if (typeof gtag === "function") {
        try {
          gtag("get", ga4Id, "client_id", (value) => {
            const resolved = value?.trim();
            if (resolved) {
              gaClientId = resolved;
              tryLink();
            } else {
              logTracking("binom-ga-link", "ga4 client_id is empty", undefined, "warn");
            }
          });
        } catch (error) {
          logTracking("binom-ga-link", "gtag get failed", { error: String(error) }, "warn");
        }
      } else {
        logTracking("binom-ga-link", "gtag is not available", undefined, "warn");
      }
    }
  }, []);

  if (!manifest) {
    return <LandingNotFoundPage defaultLang={DEFAULT_QUIZ_LANG} />;
  }

  return (
    <Routes>
      <Route path="/" element={<QuizPage manifest={manifest} />} />
      <Route path="/:lang" element={<LocalizedQuizEntryPage manifest={manifest} />} />
      <Route path="/:lang/quiz" element={<LocalizedQuizEntryPage manifest={manifest} />} />
      <Route path="/:lang/quiz/:step" element={<QuizStepRoute manifest={manifest} />} />
      <Route path="/:lang/quiz/email/:uuid" element={<QuizEmailRoute manifest={manifest} />} />
      <Route path="/:lang/terms.html" element={<QuizLegalRoute document={copy.legal.terms} route="terms" />} />
      <Route path="/:lang/privacy-policy.html" element={<QuizLegalRoute document={copy.legal.privacy} route="privacy" />} />
      <Route path="/:lang/refund-policy.html" element={<QuizLegalRoute document={copy.legal.refund} route="refund" />} />
      <Route path="/quiz" element={<LegacyQuizRedirect manifest={manifest} />} />
      <Route path="/quiz/:step" element={<LegacyQuizRedirect manifest={manifest} />} />
      <Route path="/quiz/email/:uuid" element={<LegacyQuizRedirect manifest={manifest} />} />
      <Route path="*" element={<LandingNotFoundPage defaultLang={manifest.default_locale} />} />
    </Routes>
  );
};

export const App = () => {
  return <HostBoundary />;
};
