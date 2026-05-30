import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { createQuizSession } from "../api";
import { resolveStatusLabel } from "../access-status";
import { useAccessStatus } from "../hooks/useAccessStatus";
import { languageLabels, normalizeAppLocale, useI18n } from "../i18n";
import type { AppLocale } from "../i18n";
import { resetOnboardingState, type AppTheme } from "../local-state";
import type { AppAuthApi } from "../types";
import { BottomSheet } from "../ui/BottomSheet";
import { AppLegalLinks } from "../ui/AppLegalLinks";
import { PrototypeIcon } from "../ui/icons";
import { buildAppAccessEmailUrl, buildAppAccessQuizSessionPayload } from "./paywallCheckout";

type ProfilePageProps = {
  authApi: AppAuthApi;
  theme: AppTheme;
  onLocaleChange: (locale: AppLocale) => Promise<void>;
  onThemeChange: (value: AppTheme) => void;
  redirectTo?: (url: string) => void;
};

export function ProfilePage({
  authApi,
  theme,
  onLocaleChange,
  onThemeChange,
  redirectTo = (url) => window.location.assign(url),
}: ProfilePageProps) {
  const navigate = useNavigate();
  const { locale, messages } = useI18n();
  const { status: accessStatus } = useAccessStatus();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageBusy, setLanguageBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);
  const access = accessStatus ?? authApi.auth?.access ?? null;
  const hasAccess = Boolean(access?.has_access);
  const statusLabel = resolveStatusLabel(access);
  const selectedLocale = normalizeAppLocale(authApi.auth?.user.locale ?? locale);
  const languageLabel = languageLabels[selectedLocale];
  const subscriptionLabel = hasAccess
    ? formatSubscriptionExpiry(access?.expires_at, selectedLocale) || access?.plan || formatBasePlan(selectedLocale)
    : messages.paywall.title;

  const startAppAccessCheckout = async () => {
    if (checkoutBusy || !authApi.auth?.user.email) {
      return;
    }
    setCheckoutBusy(true);
    setCheckoutError(false);
    try {
      const payload = await createQuizSession(buildAppAccessQuizSessionPayload(window.location.host));
      redirectTo(buildAppAccessEmailUrl(payload.uuid, authApi.auth.user.email));
    } catch {
      setCheckoutError(true);
      setCheckoutBusy(false);
    }
  };

  return (
    <section className="stack-page profile-page">
      <div className="profile-head">
        <div className="avatar-button avatar-button--lg">
          <span>{(authApi.auth?.user.email?.[0] || "F").toUpperCase()}</span>
        </div>
        <div className="profile-head__copy">
          <strong>{authApi.auth?.user.email}</strong>
          <div className="profile-head__badges">
            <span className={`badge ${hasAccess ? "badge--green" : "badge--accent"}`}>
              <PrototypeIcon.shield />
              {statusLabel}
            </span>
            <span className="badge badge--muted">{subscriptionLabel}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="section-label">{messages.profile.account}</div>
        <div className="settings-card">
          <button className="settings-row" onClick={() => onThemeChange(theme === "light" ? "dark" : "light")} type="button">
            <span className="settings-row__icon">{theme === "light" ? <PrototypeIcon.sun /> : <PrototypeIcon.moon />}</span>
            <span className="settings-row__main">
              <strong>{theme === "light" ? messages.shell.themeLight : messages.shell.themeDark}</strong>
              <span>{theme === "light" ? messages.shell.themeDark : messages.shell.themeLight}</span>
            </span>
            <span className="settings-row__value">{theme}</span>
          </button>
          <button className="settings-row" onClick={() => setLanguageOpen(true)} type="button">
            <span className="settings-row__icon"><PrototypeIcon.globe /></span>
            <span className="settings-row__main">
              <strong>{messages.profile.language}</strong>
            </span>
            <span className="settings-row__value">{languageLabel}</span>
          </button>
          <button
            className="settings-row"
            disabled={checkoutBusy}
            onClick={() => {
              if (hasAccess) {
                navigate("/paywall");
                return;
              }
              void startAppAccessCheckout();
            }}
            type="button"
          >
            <span className="settings-row__icon"><PrototypeIcon.lock /></span>
            <span className="settings-row__main">
              <strong>{hasAccess ? messages.profile.manageAccess : messages.paywall.primaryCta}</strong>
              {!hasAccess ? <span>{checkoutBusy ? messages.paywall.checkoutStarting : messages.paywall.body}</span> : null}
            </span>
            <span className="settings-row__chevron"><PrototypeIcon.chevron /></span>
          </button>
        </div>
        {!hasAccess && checkoutError ? <p className="form-error">{messages.paywall.checkoutError}</p> : null}
      </div>

      <div>
        <div className="section-label">{messages.profile.assistance}</div>
        <div className="settings-card">
          <Link className="settings-row settings-row--link" to="/app/support">
            <span className="settings-row__icon"><PrototypeIcon.msgIcon /></span>
            <span className="settings-row__main">
              <strong>{messages.support.title}</strong>
              <span>{messages.profile.supportSubtitle}</span>
            </span>
            <span className="settings-row__chevron"><PrototypeIcon.chevron /></span>
          </Link>
          <Link className="settings-row settings-row--link" to="/help">
            <span className="settings-row__icon"><PrototypeIcon.info /></span>
            <span className="settings-row__main">
              <strong>{messages.profile.help}</strong>
            </span>
            <span className="settings-row__chevron"><PrototypeIcon.chevron /></span>
          </Link>
          <button
            className="settings-row"
            onClick={() => {
              resetOnboardingState();
              navigate("/app/profile?onboarding=1");
            }}
            type="button"
          >
            <span className="settings-row__icon"><PrototypeIcon.helpC /></span>
            <span className="settings-row__main">
              <strong>{messages.staticPages.help.replayOnboarding}</strong>
            </span>
            <span className="settings-row__chevron"><PrototypeIcon.chevron /></span>
          </button>
        </div>
      </div>

      <div>
        <div className="section-label">Legal</div>
        <div className="settings-card">
          <AppLegalLinks />
        </div>
      </div>

      <button className="settings-row settings-row--danger" onClick={() => void authApi.logout()} type="button">
        <span className="settings-row__icon"><PrototypeIcon.logout /></span>
        <span className="settings-row__main">
          <strong>{messages.shell.logout}</strong>
        </span>
      </button>

      <p className="profile-footnote">Flirto Guru · app.flirto.guru</p>

      <BottomSheet open={languageOpen} title={messages.profile.language} onClose={() => setLanguageOpen(false)}>
        <div className="sheet-choice-grid">
          {(["en", "ru", "fr", "es"] as const).map((itemLocale) => (
            <button
              className={`sheet-choice${selectedLocale === itemLocale ? " is-active" : ""}`}
              disabled={languageBusy}
              key={itemLocale}
              onClick={async () => {
                setLanguageBusy(true);
                try {
                  await onLocaleChange(itemLocale);
                  setLanguageOpen(false);
                } finally {
                  setLanguageBusy(false);
                }
              }}
              type="button"
            >
              <strong>{languageLabels[itemLocale]}</strong>
            </button>
          ))}
        </div>
      </BottomSheet>
    </section>
  );
}

function formatSubscriptionExpiry(value?: string | null, locale?: AppLocale | null) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const dateLocale = locale === "ru" ? "ru-RU" : locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : "en-US";
  const formatted = new Intl.DateTimeFormat(dateLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  if (locale === "ru") {
    return `до ${formatted}`;
  }
  if (locale === "fr") {
    return `valable jusqu’au ${formatted}`;
  }
  if (locale === "es") {
    return `válido hasta ${formatted}`;
  }
  return `valid until ${formatted}`;
}

function formatBasePlan(locale: AppLocale) {
  if (locale === "ru") {
    return "Базовый";
  }
  if (locale === "fr") {
    return "Basique";
  }
  if (locale === "es") {
    return "Básico";
  }
  return "Basic";
}
