import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import type { AppMessages } from "../i18n";
import { useI18n } from "../i18n";
import {
  readInstallHintDismissed,
  readOnboardingDismissed,
  writeInstallHintDismissed,
  writeOnboardingDismissed,
} from "../local-state";
import { PrototypeIcon } from "../ui/icons";
import { startInstallFlow, getInstallPlatform, isStandaloneDisplay, type InstallPlatform } from "../../shared/install-prompt";

const ONBOARDING_ENABLED_ROUTES = [/^\/paywall$/, /^\/app$/, /^\/app\/profile$/, /^\/app\/support$/, /^\/app\/session\/.+$/];

type OnboardingMode = "full" | "install-only";

type OnboardingStep =
  | {
      kind: "install";
      platform: InstallPlatform;
      title: string;
      body: string;
      action: string;
    }
  | {
      kind: "intro";
      title: string;
      body: string;
    };

export function AppOnboardingOverlay({ enabled }: { enabled: boolean }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const forceFull = searchParams.get("onboarding") === "1";
  const routeEligible = enabled && ONBOARDING_ENABLED_ROUTES.some((pattern) => pattern.test(location.pathname));
  const [mode, setMode] = useState<OnboardingMode | false>(() => (routeEligible ? resolveInitialOnboardingMode(forceFull) : false));

  useEffect(() => {
    if (!routeEligible) {
      setMode(false);
      return;
    }
    const next = resolveInitialOnboardingMode(forceFull);
    setMode((current) => {
      if (forceFull) {
        return "full";
      }
      return current || next;
    });
  }, [forceFull, routeEligible]);

  if (!mode) {
    return null;
  }

  return (
    <OnboardingOverlay
      mode={mode}
      onDismiss={() => {
        writeOnboardingDismissed();
        writeInstallHintDismissed();
        setMode(false);
        if (forceFull) {
          const nextSearchParams = new URLSearchParams(searchParams);
          nextSearchParams.delete("onboarding");
          setSearchParams(nextSearchParams, { replace: true });
        }
      }}
    />
  );
}

function OnboardingOverlay({ mode, onDismiss }: { mode: OnboardingMode; onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const [installAssistMessage, setInstallAssistMessage] = useState<string | null>(null);
  const { messages } = useI18n();
  const installPlatform = getInstallPlatform();
  const includeInstallStep = !isStandaloneDisplay();
  const steps = useMemo(() => buildOnboardingSteps(messages, mode, installPlatform, includeInstallStep), [includeInstallStep, installPlatform, messages, mode]);
  const item = steps[Math.min(step, steps.length - 1)];

  useEffect(() => {
    setStep(0);
    setInstallAssistMessage(null);
  }, [mode]);

  if (!item) {
    return null;
  }

  const isLastStep = step >= steps.length - 1;
  const showInstallButton = item.kind === "install";

  return (
    <div className="onboarding-backdrop">
      <section className="onboarding-sheet">
        <div className="onboarding-sheet__handle" />
        <div className="onboarding-sheet__icon">
          {item.kind === "install" ? (
            item.platform === "desktop" ? (
              <PrototypeIcon.link color="var(--accent)" />
            ) : (
              <PrototypeIcon.phone />
            )
          ) : step === (includeInstallStep ? 1 : 0) ? (
            <PrototypeIcon.emptyChat />
          ) : step === (includeInstallStep ? 2 : 1) ? (
            <PrototypeIcon.sparkle />
          ) : (
            <PrototypeIcon.compass color="var(--accent)" />
          )}
        </div>
        <div className="onboarding-sheet__copy">
          <h2>{item.title}</h2>
          <p>{item.body}</p>
        </div>
        <div className="onboarding-dots">
          {steps.map((_, index) => (
            <span className={index === step ? "is-active" : ""} key={index} />
          ))}
        </div>
        {showInstallButton ? (
          <button
            className="button button--primary button--lg button--full"
            onClick={async () => {
              if (item.kind !== "install") {
                return;
              }
              const outcome = await startInstallFlow({
                title: "Flirto Guru",
                text: item.title,
                url: window.location.href,
              });
              if (outcome === "accepted") {
                writeInstallHintDismissed();
                if (isLastStep) {
                  onDismiss();
                } else {
                  setStep((current) => current + 1);
                }
                setInstallAssistMessage(null);
                return;
              }
              if (outcome === "opened_share") {
                setInstallAssistMessage(item.body);
                return;
              }
              if (outcome === "manual" || outcome === "unavailable") {
                setInstallAssistMessage(messages.home.installAssist[item.platform]);
              }
            }}
            type="button"
          >
            {item.action}
          </button>
        ) : null}
        {installAssistMessage ? <p className="inline-status">{installAssistMessage}</p> : null}
        {!isLastStep ? (
          <button className="button button--primary button--lg button--full" onClick={() => setStep((current) => current + 1)} type="button">
            {messages.home.onboardingNext}
          </button>
        ) : (
          <button className="button button--primary button--lg button--full" onClick={onDismiss} type="button">
            {messages.home.onboardingStart}
          </button>
        )}
        <button className="button button--link button--full" onClick={onDismiss} type="button">
          {messages.home.onboardingSkip}
        </button>
      </section>
    </div>
  );
}

function resolveInitialOnboardingMode(forceFull: boolean): OnboardingMode | false {
  if (forceFull) {
    return "full";
  }
  if (!readOnboardingDismissed()) {
    return "full";
  }
  if (!isStandaloneDisplay() && !readInstallHintDismissed()) {
    return "install-only";
  }
  return false;
}

function buildOnboardingSteps(
  messages: AppMessages,
  mode: OnboardingMode,
  installPlatform: InstallPlatform,
  includeInstallStep: boolean,
): OnboardingStep[] {
  const introSteps = messages.home.onboardingSteps.map((item) => ({ kind: "intro" as const, title: item.title, body: item.body }));
  if (!includeInstallStep) {
    return mode === "install-only" ? [] : introSteps;
  }
  const installCopy = messages.home.installSteps[installPlatform];
  const installStep: OnboardingStep = {
    kind: "install",
    platform: installPlatform,
    title: installCopy.title,
    body: installCopy.body,
    action: installCopy.action,
  };
  return mode === "install-only" ? [installStep] : [installStep, ...introSteps];
}
