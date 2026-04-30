import { Link, useNavigate } from "react-router-dom";

import { appCopy } from "../copy";
import type { AppTheme } from "../local-state";
import type { AppAuthApi } from "../types";
import { PrototypeIcon } from "../ui/icons";

type ProfilePageProps = {
  authApi: AppAuthApi;
  theme: AppTheme;
  onThemeChange: (value: AppTheme) => void;
};

export function ProfilePage({ authApi, theme, onThemeChange }: ProfilePageProps) {
  const navigate = useNavigate();
  const access = authApi.auth?.access;
  const subscriptionLabel = formatSubscriptionExpiry(access?.expires_at, authApi.auth?.user.locale) || access?.plan || "Базовый";

  return (
    <section className="stack-page">
      <div className="profile-head">
        <div className="avatar-button avatar-button--lg">
          <span>{(authApi.auth?.user.email?.[0] || "F").toUpperCase()}</span>
        </div>
        <div className="profile-head__copy">
          <strong>{authApi.auth?.user.email}</strong>
          <div className="profile-head__badges">
            <span className="badge badge--green">
              <PrototypeIcon.shield />
              {access?.access_status || "active"}
            </span>
            <span className="badge badge--muted">{subscriptionLabel}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="section-label">{appCopy.profile.account}</div>
        <div className="settings-card">
          <button className="settings-row" onClick={() => onThemeChange(theme === "light" ? "dark" : "light")} type="button">
            <span className="settings-row__icon">{theme === "light" ? <PrototypeIcon.sparkle /> : <PrototypeIcon.bell />}</span>
            <span className="settings-row__main">
              <strong>{theme === "light" ? appCopy.shell.themeLight : appCopy.shell.themeDark}</strong>
              <span>{theme === "light" ? appCopy.shell.themeDark : appCopy.shell.themeLight}</span>
            </span>
            <span className="settings-row__value">{theme}</span>
          </button>
          <button className="settings-row" onClick={() => navigate("/paywall")} type="button">
            <span className="settings-row__icon"><PrototypeIcon.card /></span>
            <span className="settings-row__main">
              <strong>{appCopy.profile.manageAccess}</strong>
            </span>
            <span className="settings-row__chevron"><PrototypeIcon.chevron /></span>
          </button>
        </div>
      </div>

      <div>
        <div className="section-label">{appCopy.profile.assistance}</div>
        <div className="settings-card">
          <Link className="settings-row settings-row--link" to="/app/support">
            <span className="settings-row__icon"><PrototypeIcon.msgIcon /></span>
            <span className="settings-row__main">
              <strong>{appCopy.support.title}</strong>
              <span>{appCopy.profile.supportSubtitle}</span>
            </span>
            <span className="settings-row__chevron"><PrototypeIcon.chevron /></span>
          </Link>
          <Link className="settings-row settings-row--link" to="/help">
            <span className="settings-row__icon"><PrototypeIcon.info /></span>
            <span className="settings-row__main">
              <strong>{appCopy.profile.help}</strong>
            </span>
            <span className="settings-row__chevron"><PrototypeIcon.chevron /></span>
          </Link>
        </div>
      </div>

      <button className="settings-row settings-row--danger" onClick={() => void authApi.logout()} type="button">
        <span className="settings-row__icon"><PrototypeIcon.logout /></span>
        <span className="settings-row__main">
          <strong>{appCopy.shell.logout}</strong>
        </span>
      </button>

      <p className="profile-footnote">Flirto Guru · app.flirto.guru</p>
    </section>
  );
}

function formatSubscriptionExpiry(value?: string | null, locale?: string | null) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const formatted = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  return locale === "en" ? `valid until ${formatted}` : `до ${formatted}`;
}
