import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { resolveStatusLabel } from "../access-status";
import { ApiError, createAppApi } from "../api";
import { useAccessStatus } from "../hooks/useAccessStatus";
import { buildPayUrl, runtimeConfig } from "../../shared/runtime";
import { createQuizSession } from "../api";
import { useI18n, type AppLocale } from "../i18n";
import { AppLegalLinks } from "../ui/AppLegalLinks";
import { PrototypeIcon } from "../ui/icons";
import { Skeleton } from "../ui/Skeleton";
import type { AccessStatus, AuthPayload } from "../types";
import { buildAppAccessEmailUrl, buildAppAccessQuizSessionPayload } from "./paywallCheckout";

type PaywallPageProps = {
  auth: AuthPayload | null;
  accessStatus: AccessStatus | null;
  redirectTo?: (url: string) => void;
};

export function PaywallPage({ auth, accessStatus, redirectTo = (url) => window.location.assign(url) }: PaywallPageProps) {
  const location = useLocation();
  const { locale, messages } = useI18n();
  const { refresh: refreshAccessStatus } = useAccessStatus();
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const effectiveAccess = accessStatus ?? auth?.access ?? null;
  const hasAccess = Boolean(effectiveAccess?.has_access || auth?.access.has_access);
  const accessLabel = formatAccessLabel(effectiveAccess ?? auth?.access ?? null, locale);
  const statusLabel = resolveStatusLabel(effectiveAccess ?? auth?.access ?? null);
  const api = createAppApi({
    getAccessToken: () => auth?.tokens.access_token ?? null,
    refreshAuth: async () => auth,
  });
  const payUrl = auth
    ? buildPayUrl(
        `/ru/pay/manage?email=${encodeURIComponent(auth.user.email)}&return_to=${encodeURIComponent(
          `${runtimeConfig.appPublicBaseUrl}${location.pathname}`,
        )}`,
      )
    : buildPayUrl("/ru/pay/manage");

  const startAppAccessCheckout = async () => {
    if (checkoutBusy || !auth?.user.email) {
      return;
    }
    setCheckoutBusy(true);
    setCheckoutError(false);
    try {
      const payload = await createQuizSession(buildAppAccessQuizSessionPayload(window.location.host));
      redirectTo(buildAppAccessEmailUrl(payload.uuid, auth.user.email));
    } catch {
      setCheckoutError(true);
      setCheckoutBusy(false);
    }
  };

  const redeemPromoCode = async () => {
    const value = promoCode.trim();
    if (!value || promoBusy) {
      return;
    }
    setPromoBusy(true);
    setPromoError(null);
    setPromoSuccess(null);
    try {
      await api.redeemAccessCode(value);
      await refreshAccessStatus();
      setPromoCode("");
      setPromoSuccess(messages.profile.promoSuccess.replace("{code}", value.toUpperCase()));
    } catch (error) {
      const message = error instanceof ApiError && error.detail ? error.detail : messages.profile.promoError;
      setPromoError(message);
    } finally {
      setPromoBusy(false);
    }
  };

  if (hasAccess) {
    return (
      <section className="stack-page">
        <div className="page-heading">
          <span className="badge badge--green">{messages.paywall.eyebrow}</span>
          <h1>{messages.paywall.activeTitle}</h1>
          <p>{messages.paywall.activeBody}</p>
        </div>

        <div className="settings-card">
          {accessLabel ? (
            <div className="settings-row settings-row--static">
              <span className="settings-row__icon">
                <PrototypeIcon.shield />
              </span>
              <span className="settings-row__main">
                <strong>{messages.paywall.activeStatusLabel}</strong>
                <span>{statusLabel}{accessLabel ? ` · ${accessLabel}` : ""}</span>
              </span>
            </div>
          ) : null}
          {auth?.user.email ? (
            <div className="settings-row settings-row--static">
              <span className="settings-row__icon">
                <PrototypeIcon.link />
              </span>
              <span className="settings-row__main">
                <strong>{messages.paywall.activeEmailLabel}</strong>
                <span>{auth.user.email}</span>
              </span>
            </div>
          ) : null}
        </div>

        <a className="button button--primary button--lg button--full" href={payUrl}>
          {messages.paywall.manageCta}
        </a>
        <Link className="button button--secondary button--lg button--full" to="/app/support">
          {messages.session.support}
        </Link>
      </section>
    );
  }

  return (
    <section className="stack-page">
      <div className="page-heading">
        <span className="badge badge--accent">{messages.paywall.eyebrow}</span>
        <h1>{messages.paywall.title}</h1>
        <p>{messages.paywall.body}</p>
      </div>

      {!accessStatus ? <Skeleton lines={4} /> : null}

      <div className="settings-card">
        {messages.paywall.bullets.map((item, index) => (
          <div className="settings-row settings-row--static" key={item}>
            <span className="settings-row__icon">
              {index === 0 ? <PrototypeIcon.users /> : index === 1 ? <PrototypeIcon.link /> : index === 2 ? <PrototypeIcon.shield /> : <PrototypeIcon.support />}
            </span>
            <span className="settings-row__body">{item}</span>
          </div>
        ))}
      </div>

      <button className="button button--primary button--lg button--full" disabled={checkoutBusy} onClick={startAppAccessCheckout} type="button">
        {checkoutBusy ? messages.paywall.checkoutStarting : messages.paywall.primaryCta}
      </button>
      {checkoutError ? <p className="form-error">{messages.paywall.checkoutError}</p> : null}
      <div className="section-label">Legal</div>
      <div className="settings-card">
        <div className="settings-row settings-row--static settings-row--tall">
          <span className="settings-row__main">
            <strong>Review the legal terms before purchase</strong>
            <span>Terms, privacy, and refund rules apply across the website, checkout, and app.</span>
          </span>
        </div>
        <AppLegalLinks />
      </div>

      <div>
        <div className="section-label">{messages.profile.promoSection}</div>
        <div className="settings-card promo-card">
          <label className="promo-card__field">
            <span>{messages.profile.promoLabel}</span>
            <input
              autoCapitalize="characters"
              autoCorrect="off"
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              placeholder={messages.profile.promoPlaceholder}
              type="text"
              value={promoCode}
            />
          </label>
          <button className="button button--primary promo-card__submit" disabled={promoBusy || !promoCode.trim()} onClick={() => void redeemPromoCode()} type="button">
            {promoBusy ? messages.profile.promoSubmitting : messages.profile.promoSubmit}
          </button>
        </div>
        {promoSuccess ? <p className="promo-success">{promoSuccess}</p> : null}
        {promoError ? <p className="form-error">{promoError}</p> : null}
      </div>
    </section>
  );
}

function formatAccessLabel(access: AccessStatus | null, locale: AppLocale) {
  if (access?.expires_at) {
    const date = new Date(access.expires_at);
    if (!Number.isNaN(date.getTime())) {
      const dateLocale = locale === "ru" ? "ru-RU" : locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : "en-US";
      return new Intl.DateTimeFormat(dateLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    }
  }
  return access?.plan || null;
}
