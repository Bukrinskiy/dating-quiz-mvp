import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createAppApi } from "../api";
import { appCopy } from "../copy";
import { readOnboardingDismissed, readRecentSessions, writeOnboardingDismissed } from "../local-state";
import type { AccessStatus, AppAuthApi, SessionListItem } from "../types";
import { PrototypeIcon } from "../ui/icons";

const RECENT_SESSIONS_LIMIT = 10;

type AppHomePageProps = {
  authApi: AppAuthApi;
  accessStatus: AccessStatus | null;
  onStartMode: () => Promise<string>;
};

export function AppHomePage({ authApi, accessStatus, onStartMode }: AppHomePageProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboardingDismissed());
  const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([]);
  const statusCode = accessStatus?.access_status || authApi.auth?.access.access_status || "active";
  const api = useMemo(
    () =>
      createAppApi({
        getAccessToken: () => authApi.auth?.tokens.access_token ?? null,
        refreshAuth: authApi.refreshAuth,
      }),
    [authApi],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = normalizeRecentSessions(await api.listSessions());
        if (!cancelled) {
          setRecentSessions(next);
        }
      } catch {
        if (!cancelled) {
          setRecentSessions(
            normalizeRecentSessions(
              readRecentSessions().map((item) => ({
                session_id: item.id,
                mode: item.mode,
                status: "active",
                state: "collecting_context",
                created_at: item.createdAt,
                updated_at: item.createdAt,
                preview: item.preview,
              })),
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <section className="home-page">
      {showOnboarding ? (
        <OnboardingOverlay
          onDismiss={() => {
            writeOnboardingDismissed();
            setShowOnboarding(false);
          }}
        />
      ) : null}

      <div className="home-page__header">
        <div>
          <h1>{appCopy.home.startConsultation}</h1>
        </div>
      </div>

      <button
        className="mode-card mode-card--single"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const sessionId = await onStartMode();
            navigate(`/app/session/${sessionId}?mode=analyze_case`);
          } finally {
            setBusy(false);
          }
        }}
        type="button"
      >
        <span aria-hidden="true" className="mode-card__glow mode-card__glow--top" />
        <span aria-hidden="true" className="mode-card__glow mode-card__glow--side" />
        <span className="mode-card__icon mode-card__icon--analyze_case">
          <PrototypeIcon.sparkle color="currentColor" />
        </span>
        <strong>{appCopy.home.startCta}</strong>
        <span className="mode-card__subtitle">{appCopy.home.startBody}</span>
        {busy ? <em>{appCopy.home.opening}</em> : null}
      </button>

      {(statusCode === "grace_period" || statusCode === "token_issued") && (
        <Link className={`access-banner access-banner--${statusCode}`} to="/paywall">
          <strong>{appCopy.access[statusCode].title}</strong>
          <p>{appCopy.access[statusCode].body}</p>
          <span>{appCopy.access[statusCode].cta}</span>
        </Link>
      )}

      <section className="recent-panel">
        <div className="section-label">{appCopy.home.recentTitle}</div>
        <div className="recent-list">
          {recentSessions.length ? (
            recentSessions.map((item) => (
              <button
                className="recent-item"
                key={item.session_id}
                onClick={() => navigate(`/app/session/${item.session_id}?mode=${item.mode}`)}
                type="button"
              >
                <span className={`recent-item__icon recent-item__icon--${item.mode}`}>
                  {item.mode === "write_now" ? <PrototypeIcon.pencil color="var(--accent)" /> : <PrototypeIcon.compass color="var(--accent)" />}
                </span>
                <span className="recent-item__copy">
                  <strong>{buildRecentTitle(item.preview)}</strong>
                  <span>{item.preview || appCopy.home.recentFallbackPreview}</span>
                </span>
                <span className="recent-item__meta">
                  <span>{formatTimeAgo(item.updated_at)}</span>
                  <span aria-hidden="true">
                    <PrototypeIcon.chevron />
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="recent-empty">
              <strong>{appCopy.home.recentEmptyTitle}</strong>
              <p>{appCopy.home.recentEmptyBody}</p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function OnboardingOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const item = appCopy.home.onboardingSteps[step];

  return (
    <div className="onboarding-backdrop">
      <section className="onboarding-sheet">
        <div className="onboarding-sheet__handle" />
        <div className="onboarding-sheet__icon">
          {step === 0 ? <PrototypeIcon.emptyChat /> : step === 1 ? <PrototypeIcon.sparkle /> : <PrototypeIcon.compass color="var(--accent)" />}
        </div>
        <div className="onboarding-sheet__copy">
          <h2>{item.title}</h2>
          <p>{item.body}</p>
        </div>
        <div className="onboarding-dots">
          {appCopy.home.onboardingSteps.map((_, index) => (
            <span className={index === step ? "is-active" : ""} key={index} />
          ))}
        </div>
        {step < appCopy.home.onboardingSteps.length - 1 ? (
          <button className="button button--primary button--lg button--full" onClick={() => setStep((current) => current + 1)} type="button">
            {appCopy.home.onboardingNext}
          </button>
        ) : (
          <button className="button button--primary button--lg button--full" onClick={onDismiss} type="button">
            {appCopy.home.onboardingStart}
          </button>
        )}
        <button className="button button--link button--full" onClick={onDismiss} type="button">
          {appCopy.home.onboardingSkip}
        </button>
      </section>
    </div>
  );
}

function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.floor(diff / (1000 * 60 * 60)));
  if (hours < 24) {
    return `${hours} ч назад`;
  }
  const days = Math.floor(hours / 24);
  return `${days} д назад`;
}

function buildRecentTitle(preview: string) {
  const cleanPreview = preview.trim().replace(/\s+/g, " ");
  if (!cleanPreview) {
    return "Разбор ситуации";
  }
  if (cleanPreview.length <= 52) {
    return cleanPreview;
  }
  return `${cleanPreview.slice(0, 49).trimEnd()}...`;
}

function normalizeRecentSessions(items: SessionListItem[]) {
  return [...items]
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
    .slice(0, RECENT_SESSIONS_LIMIT);
}
