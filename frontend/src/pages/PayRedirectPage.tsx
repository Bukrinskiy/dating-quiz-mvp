import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../features/i18n/I18nProvider";
import { getClickId } from "../shared/lib/clickid";
import { MobiSlonEvent } from "../shared/lib/mobiSlonEvents";
import { ApiError, createCheckoutSession, getPaymentPlans, type MoneyAmount, type PublicPlan } from "../shared/lib/paymentApi";
import { sendPostbackOnce } from "../shared/lib/tracking";
import { logTracking } from "../shared/lib/trackingLogger";
import { reachYandexMetrikaGoal } from "../shared/lib/yandexMetrika";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value.trim());

const formatMoney = (amount: MoneyAmount, locale: string): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: amount.currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount.amount_minor / 100);

const resolveBillingCopy = (plan: PublicPlan, copy: ReturnType<typeof useI18n>["copy"]): string => {
  if (plan.billing_period === "week") {
    return copy.ui.payBillingWeekly;
  }
  if (plan.billing_period === "year") {
    return copy.ui.payBillingYearly;
  }
  return copy.ui.payBillingMonthly;
};

const resolvePlanHeadline = (plan: PublicPlan, copy: ReturnType<typeof useI18n>["copy"]): string => {
  if (plan.code === "sub_weekly") {
    return copy.ui.payPlanWeeklyTitle;
  }
  if (plan.code === "sub_yearly") {
    return copy.ui.payPlanYearlyTitle;
  }
  if (plan.code === "sub_monthly") {
    return copy.ui.payPlanMonthlyTitle;
  }
  return plan.headline.trim();
};

const resolvePlanPostbackEvent = (planCode: string): MobiSlonEvent | null => {
  if (planCode === "sub_weekly") {
    return MobiSlonEvent.PAY_PLAN_WEEKLY_SELECTED;
  }
  if (planCode === "sub_monthly") {
    return MobiSlonEvent.PAY_PLAN_MONTHLY_SELECTED;
  }
  if (planCode === "sub_yearly") {
    return MobiSlonEvent.PAY_PLAN_YEARLY_SELECTED;
  }
  return null;
};

type PlanCardProps = {
  plan: PublicPlan;
  locale: string;
  selected: boolean;
  badgeText: string;
  billingCopy: string;
  perDayCopy: string;
  onSelect: (code: string) => void;
};

const PlanCard = ({ plan, locale, selected, badgeText, billingCopy, perDayCopy, onSelect }: PlanCardProps) => {
  const headline = plan.headline.trim();
  const badge = plan.badge?.trim() || (plan.is_highlighted ? badgeText : "");
  const badgeClassName = badge.toUpperCase() === "PROMO" ? "pay-plan__badge pay-plan__badge--promo" : "pay-plan__badge";

  return (
    <button
      type="button"
      className={`pay-plan ${selected ? "is-selected" : ""} ${plan.is_highlighted ? "is-highlighted" : ""}`.trim()}
      onClick={() => onSelect(plan.code)}
      aria-pressed={selected}
    >
      {badge ? <span className={badgeClassName}>{badge}</span> : null}
      <span className="pay-plan__main">
        <span className="pay-plan__headline">{headline}</span>
        {plan.per_day_price ? (
          <>
            <span className="pay-plan__price-row pay-plan__price-row--primary">
              {plan.compare_at_per_day_price ? (
                <span className="pay-plan__price-old pay-plan__price-old--primary">
                  {formatMoney(plan.compare_at_per_day_price, locale)}
                </span>
              ) : null}
              <span className="pay-plan__price pay-plan__price--primary">{formatMoney(plan.per_day_price, locale)}</span>
              <span className="pay-plan__period pay-plan__period--primary">{perDayCopy}</span>
            </span>
            <span className="pay-plan__period-row">
              {plan.compare_at_price ? <span className="pay-plan__period-price-old">{formatMoney(plan.compare_at_price, locale)}</span> : null}
              <span className="pay-plan__period-price">{formatMoney(plan.price, locale)}</span>
              <span className="pay-plan__period-copy">{billingCopy}</span>
            </span>
          </>
        ) : (
          <span className="pay-plan__price-row pay-plan__price-row--primary">
            {plan.compare_at_price ? <span className="pay-plan__price-old">{formatMoney(plan.compare_at_price, locale)}</span> : null}
            <span className="pay-plan__price pay-plan__price--primary">{formatMoney(plan.price, locale)}</span>
            <span className="pay-plan__period pay-plan__period--primary">{billingCopy}</span>
          </span>
        )}
      </span>
    </button>
  );
};

export const PayRedirectPage = () => {
  const { copy, locale } = useI18n();
  const location = useLocation();
  const promoInputRef = useRef<HTMLInputElement | null>(null);

  const promoFromQuery = useMemo(() => new URLSearchParams(location.search).get("promo")?.trim() || "", [location.search]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [promoCode, setPromoCode] = useState(promoFromQuery);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [isPromoOpen, setIsPromoOpen] = useState(Boolean(promoFromQuery));
  const [emailEventSent, setEmailEventSent] = useState(false);

  const normalizedPromoCode = promoCode.trim().toUpperCase();
  const promoApplied = Boolean(
    appliedPromoCode &&
      normalizedPromoCode &&
      appliedPromoCode === normalizedPromoCode &&
      !promoError &&
      !plansLoading,
  );

  const clickid = useMemo(() => {
    return getClickId(location.search)?.trim() || "direct";
  }, [location.search]);

  const tgChatId = useMemo(() => {
    const queryValue = new URLSearchParams(location.search).get("tg_chat_id")?.trim() || "";
    if (queryValue) {
      try {
        sessionStorage.setItem("tg_chat_id", queryValue);
      } catch {
        // Ignore sessionStorage issues in private mode.
      }
      return queryValue;
    }
    try {
      return sessionStorage.getItem("tg_chat_id")?.trim() || "";
    } catch {
      return "";
    }
  }, [location.search]);

  useEffect(() => {
    setPromoCode(promoFromQuery);
    if (promoFromQuery) {
      setIsPromoOpen(true);
    }
  }, [promoFromQuery]);

  useEffect(() => {
    reachYandexMetrikaGoal("pay_open");
  }, []);

  useEffect(() => {
    let active = true;

    const loadPlans = async () => {
      setPlansLoading(true);
      setError(null);
      const requestedPromo = normalizedPromoCode || undefined;
      setPromoChecking(Boolean(requestedPromo));

      try {
        const payload = await getPaymentPlans(requestedPromo);
        if (!active) {
          return;
        }
        setPlans(payload);
        setAppliedPromoCode(requestedPromo ?? null);
        setPromoError(null);
      } catch (cause) {
        if (!active) {
          return;
        }

        if (requestedPromo && cause instanceof ApiError && cause.code === "promo_invalid") {
          setPromoError(copy.ui.payPromoInvalid);
          setAppliedPromoCode(null);
          try {
            const fallbackPlans = await getPaymentPlans();
            if (!active) {
              return;
            }
            setPlans(fallbackPlans);
          } catch (fallbackCause) {
            logTracking("payment", "payment_plans_error", { error: String(fallbackCause) }, "error");
            setError(copy.ui.payPlansError);
          }
          return;
        }

        logTracking("payment", "payment_plans_error", { error: String(cause) }, "error");
        setError(copy.ui.payPlansError);
      } finally {
        if (active) {
          setPlansLoading(false);
          setPromoChecking(false);
        }
      }
    };

    void loadPlans();
    return () => {
      active = false;
    };
  }, [copy.ui.payPlansError, copy.ui.payPromoInvalid, normalizedPromoCode]);

  const selectedPlan = useMemo(() => {
    return plans.find((plan) => plan.code === selectedPlanCode) ?? null;
  }, [plans, selectedPlanCode]);

  const selectedPlanHeadline = selectedPlan ? resolvePlanHeadline(selectedPlan, copy) : "";
  const emailValue = email.trim();
  const emailError =
    emailTouched && emailValue.length === 0
      ? copy.ui.payEmailRequired
      : emailTouched && !isValidEmail(email)
        ? copy.ui.payEmailInvalid
        : null;

  const maybeSendPayEmailEvent = (value: string) => {
    if (emailEventSent || !isValidEmail(value)) {
      return;
    }
    sendPostbackOnce(MobiSlonEvent.PAY_EMAIL_ENTERED, location.search, {
      trackingParams: { email: value.trim() },
    });
    setEmailEventSent(true);
  };

  const onSelectPlan = (planCode: string) => {
    setSelectedPlanCode(planCode);
    const event = resolvePlanPostbackEvent(planCode);
    if (event) {
      if (!normalizedPromoCode) {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("promo", "");
        sendPostbackOnce(event, `?${searchParams.toString()}`, { forceSend: true });
        return;
      }
      sendPostbackOnce(event, location.search, { forceSend: true });
    }
  };

  const onPay = async () => {
    if (!selectedPlan) {
      setError(copy.ui.paySelectPlanHint);
      return;
    }
    if (!emailValue) {
      setEmailTouched(true);
      setError(copy.ui.payEmailRequired);
      return;
    }
    if (!isValidEmail(email)) {
      setEmailTouched(true);
      setError(copy.ui.payEmailInvalid);
      return;
    }

    setEmailTouched(true);
    setError(null);
    setLoading(true);
    reachYandexMetrikaGoal("checkout_start");
    sendPostbackOnce(MobiSlonEvent.TRANSITION_TO_PAYMENT, location.search);

    try {
      const payload = await createCheckoutSession({
        mode: "subscription",
        plan: selectedPlan.code,
        email: email.trim(),
        clickid,
        locale,
        telegram_chat_id: tgChatId || undefined,
        promo_code: appliedPromoCode || undefined,
      });
      logTracking("payment", "checkout_session_created", {
        sessionId: payload.session_id,
        mode: "subscription",
        plan: selectedPlan.code,
      });
      window.location.href = payload.checkout_url;
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "promo_invalid") {
        setPromoError(copy.ui.payPromoInvalid);
        setLoading(false);
        return;
      }
      logTracking(
        "payment",
        "checkout_session_error",
        { mode: "subscription", plan: selectedPlan.code, error: String(cause) },
        "error",
      );
      setError(copy.ui.payError);
      setLoading(false);
    }
  };

  return (
    <>
      <Container className="pay-page">
        <LanguageSwitcher />
        <QuizCard className="pay-card">
          <div className="pay-hero">
            <span className="pay-kicker">{copy.ui.payModeSubscription}</span>
            <h1>{copy.ui.payTitle}</h1>
            <p className="pay-copy">{copy.ui.paySubtitle}</p>
          </div>

          <section className="pay-section" aria-labelledby="pay-plan-label">
            <div className="pay-section__head">
              <h2 id="pay-plan-label">{copy.ui.payPlanLabel}</h2>
            </div>
            <p className={`pay-plan-helper ${selectedPlan ? "pay-plan-helper--selected" : ""}`}>
              {selectedPlan
                ? copy.ui.payPlanHelperSelected.replace("{plan}", selectedPlanHeadline)
                : copy.ui.payPlanHelperIdle}
            </p>

            <div className="pay-plans" aria-busy={plansLoading}>
              {plans.map((plan) => (
                <PlanCard
                  key={plan.code}
                  plan={{ ...plan, headline: resolvePlanHeadline(plan, copy) }}
                  locale={locale}
                  selected={plan.code === selectedPlanCode}
                  badgeText={copy.ui.payMostPopular}
                  billingCopy={resolveBillingCopy(plan, copy)}
                  perDayCopy={copy.ui.payPerDay}
                  onSelect={onSelectPlan}
                />
              ))}
            </div>
          </section>

          <section className="pay-section" aria-label="promo code section">
            {!isPromoOpen ? (
              <button
                type="button"
                className="pay-promo-toggle"
                onClick={() => {
                  setIsPromoOpen(true);
                  window.requestAnimationFrame(() => {
                    promoInputRef.current?.focus();
                  });
                }}
              >
                {copy.ui.payPromoToggleLabel}
              </button>
            ) : null}

            {isPromoOpen ? (
              <>
                <label id="pay-promo-label" className="pay-field" htmlFor="pay-promo">
                  {copy.ui.payPromoLabel}
                </label>
                <input
                  id="pay-promo"
                  ref={promoInputRef}
                  className={`pay-input ${promoError ? "is-invalid" : ""}`.trim()}
                  type="text"
                  value={promoCode}
                  onChange={(event) => {
                    const nextPromo = event.target.value.toUpperCase();
                    setPromoCode(nextPromo);
                    setPromoError(null);
                    const nextUrl = new URL(window.location.href);
                    if (nextPromo.trim()) {
                      nextUrl.searchParams.set("promo", nextPromo.trim());
                    } else {
                      nextUrl.searchParams.delete("promo");
                    }
                    window.history.replaceState(window.history.state, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
                    if (error) {
                      setError(null);
                    }
                  }}
                  placeholder={copy.ui.payPromoPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={promoError ? "true" : "false"}
                  aria-describedby={promoError ? "pay-promo-error" : undefined}
                />
                {promoChecking ? (
                  <div className="pay-promo-status" role="status" aria-live="polite">
                    <span className="pay-promo-spinner" aria-hidden="true" />
                    <span>{copy.ui.payPromoChecking}</span>
                  </div>
                ) : null}
                {promoError ? <p id="pay-promo-error" className="pay-error">{promoError}</p> : null}
                {promoApplied ? (
                  <p className="pay-success">
                    {copy.ui.payPromoApplied.replace("{code}", appliedPromoCode ?? normalizedPromoCode)}
                  </p>
                ) : null}
              </>
            ) : null}
          </section>

          <div className="pay-trust" aria-label="purchase trust indicators">
            <span>{copy.ui.payCancelAnytime}</span>
            <span>{copy.ui.payMoneyBack}</span>
            <span>{copy.ui.paySecureCheckout}</span>
            <span>{copy.ui.paySupportAccess}</span>
          </div>

          <section className="pay-section" aria-labelledby="pay-email-label">
            <label id="pay-email-label" className="pay-field" htmlFor="pay-email">
              {copy.ui.payEmailLabel}
            </label>
            <input
              id="pay-email"
              className={`pay-input ${emailError ? "is-invalid" : ""}`.trim()}
              type="email"
              value={email}
              onChange={(event) => {
                const value = event.target.value;
                setEmail(value);
                maybeSendPayEmailEvent(value);
                if (error) {
                  setError(null);
                }
              }}
              onBlur={() => {
                setEmailTouched(true);
                maybeSendPayEmailEvent(email);
              }}
              placeholder={copy.ui.payEmailPlaceholder}
              autoComplete="email"
              aria-invalid={emailError ? "true" : "false"}
              aria-describedby={emailError ? "pay-email-error" : undefined}
            />
          </section>

          <button className="btn pay-cta" type="button" onClick={onPay} disabled={loading || plansLoading}>
            {loading ? (
              copy.ui.payStarting
            ) : selectedPlan ? (
              <>
                <span className="pay-cta__label">{copy.ui.payStartSelected}</span>
                <span className="pay-cta__price-primary">
                  {formatMoney(selectedPlan.per_day_price ?? selectedPlan.price, locale)} {copy.ui.payPerDay}
                </span>
                <span className="pay-cta__period-secondary">
                  {selectedPlanHeadline} &middot; {formatMoney(selectedPlan.price, locale)}
                </span>
              </>
            ) : (
              copy.ui.payStart
            )}
          </button>

          {emailError ? <p id="pay-email-error" className="pay-error">{emailError}</p> : null}
          {!emailError && error ? <p className="pay-error">{error}</p> : null}
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
