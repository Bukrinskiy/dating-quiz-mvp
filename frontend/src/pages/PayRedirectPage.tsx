import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../features/i18n/I18nProvider";
import { getClickId } from "../shared/lib/clickid";
import { MobiSlonEvent } from "../shared/lib/mobiSlonEvents";
import { createCheckoutSession, getPaymentPlans, type MoneyAmount, type PublicPlan } from "../shared/lib/paymentApi";
import { sendPostbackOnce } from "../shared/lib/tracking";
import { logTracking } from "../shared/lib/trackingLogger";
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
  if (plan.billing_period === "quarter") {
    return copy.ui.payBillingQuarterly;
  }
  return copy.ui.payBillingMonthly;
};

const resolvePlanHeadline = (plan: PublicPlan, copy: ReturnType<typeof useI18n>["copy"]): string => {
  if (plan.code === "sub_weekly") {
    return copy.ui.payPlanWeeklyTitle;
  }
  if (plan.code === "sub_quarterly") {
    return copy.ui.payPlanQuarterlyTitle;
  }
  if (plan.code === "sub_monthly") {
    return copy.ui.payPlanMonthlyTitle;
  }
  return plan.headline.trim();
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
        <span className="pay-plan__price-row">
          {plan.compare_at_price ? (
            <span className="pay-plan__price-old">{formatMoney(plan.compare_at_price, locale)}</span>
          ) : null}
          <span className="pay-plan__price">{formatMoney(plan.price, locale)}</span>
          <span className="pay-plan__period">{billingCopy}</span>
        </span>
      </span>
      {plan.per_day_price ? (
        <span className="pay-plan__aside">
          {plan.compare_at_per_day_price ? (
            <span className="pay-plan__aside-price-old">{formatMoney(plan.compare_at_per_day_price, locale)}</span>
          ) : null}
          <span className="pay-plan__aside-price">{formatMoney(plan.per_day_price, locale)}</span>
          <span className="pay-plan__aside-copy">{perDayCopy}</span>
        </span>
      ) : null}
    </button>
  );
};

export const PayRedirectPage = () => {
  const { copy, locale } = useI18n();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("");
  const [emailTouched, setEmailTouched] = useState(false);

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
    let active = true;
    setPlansLoading(true);
    setError(null);

    void getPaymentPlans()
      .then((payload) => {
        if (!active) {
          return;
        }
        setPlans(payload);
        const defaultPlan = payload.find((plan) => plan.is_default) ?? payload[0];
        setSelectedPlanCode(defaultPlan?.code ?? "");
      })
      .catch((cause) => {
        if (!active) {
          return;
        }
        logTracking("payment", "payment_plans_error", { error: String(cause) }, "error");
        setError(copy.ui.payPlansError);
      })
      .finally(() => {
        if (active) {
          setPlansLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [copy.ui.payPlansError]);

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
    sendPostbackOnce(MobiSlonEvent.TRANSITION_TO_PAYMENT, location.search);

    try {
      const payload = await createCheckoutSession({
        mode: "subscription",
        plan: selectedPlan.code,
        email: email.trim(),
        clickid,
        locale,
        telegram_chat_id: tgChatId || undefined,
      });
      logTracking("payment", "checkout_session_created", {
        sessionId: payload.session_id,
        mode: "subscription",
        plan: selectedPlan.code,
      });
      window.location.href = payload.checkout_url;
    } catch (cause) {
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

  const resolvedCtaLabel = selectedPlan ? `${copy.ui.payStartSelected} ${selectedPlanHeadline}` : copy.ui.payStart;

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
              {selectedPlan ? (
                <span className="pay-section__current">
                  {selectedPlanHeadline} · {formatMoney(selectedPlan.price, locale)}
                </span>
              ) : null}
            </div>

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
                  onSelect={setSelectedPlanCode}
                />
              ))}
            </div>
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
                setEmail(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              onBlur={() => setEmailTouched(true)}
              placeholder={copy.ui.payEmailPlaceholder}
              autoComplete="email"
              aria-invalid={emailError ? "true" : "false"}
              aria-describedby={emailError ? "pay-email-error" : undefined}
            />
          </section>

          <button className="btn pay-cta" type="button" onClick={onPay} disabled={loading || plansLoading || !selectedPlan}>
            {loading ? copy.ui.payStarting : resolvedCtaLabel}
          </button>

          {emailError ? <p id="pay-email-error" className="pay-error">{emailError}</p> : null}
          {!emailError && error ? <p className="pay-error">{error}</p> : null}
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
