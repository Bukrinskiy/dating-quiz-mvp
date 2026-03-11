import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../features/i18n/I18nProvider";
import { getClickId } from "../shared/lib/clickid";
import { MobiSlonEvent } from "../shared/lib/mobiSlonEvents";
import {
  ApiError,
  createPaymentIntent,
  getPaymentPlans,
  type CreatePaymentIntentResponse,
  type MoneyAmount,
  type PublicPlan,
} from "../shared/lib/paymentApi";
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
  disabled: boolean;
  onSelect: (code: string) => void;
};

const PlanCard = ({ plan, locale, selected, badgeText, billingCopy, perDayCopy, disabled, onSelect }: PlanCardProps) => {
  const headline = plan.headline.trim();
  const badge = plan.badge?.trim() || (plan.is_highlighted ? badgeText : "");
  const badgeClassName = badge.toUpperCase() === "PROMO" ? "pay-plan__badge pay-plan__badge--promo" : "pay-plan__badge";

  return (
    <button
      type="button"
      className={`pay-plan ${selected ? "is-selected" : ""} ${plan.is_highlighted ? "is-highlighted" : ""} ${disabled ? "is-disabled" : ""}`.trim()}
      onClick={() => onSelect(plan.code)}
      aria-pressed={selected}
      aria-disabled={disabled}
      disabled={disabled}
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

type EmbeddedPaymentFormProps = {
  returnUrl: string;
  submitLabel: string;
  submittingLabel: string;
  dividerLabel: string;
  onFailure: (message: string) => void;
};

const EmbeddedPaymentForm = ({ returnUrl, submitLabel, submittingLabel, dividerLabel, onFailure }: EmbeddedPaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [expressReady, setExpressReady] = useState(false);

  const confirmCurrentPayment = async (): Promise<{ ok: boolean; message?: string }> => {
    if (!stripe || !elements) {
      return { ok: false, message: "Stripe is not ready" };
    }

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (result.error?.message) {
      return { ok: false, message: result.error.message };
    }

    if (result.paymentIntent && ["succeeded", "processing", "requires_capture"].includes(result.paymentIntent.status)) {
      window.location.href = returnUrl;
      return { ok: true };
    }

    window.location.href = returnUrl;
    return { ok: true };
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) {
      return;
    }

    setSubmitting(true);
    const result = await confirmCurrentPayment();
    if (!result.ok) {
      onFailure(result.message || "Payment confirmation failed");
      setSubmitting(false);
    }
  };

  const onExpressConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements || submitting) {
      event.paymentFailed({ reason: "fail", message: "Stripe is not ready" });
      return;
    }

    setSubmitting(true);
    const result = await confirmCurrentPayment();
    if (!result.ok) {
      event.paymentFailed({ reason: "fail", message: result.message || "Payment confirmation failed" });
      onFailure(result.message || "Payment confirmation failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="pay-element-form">
      <div className={`pay-express-checkout ${expressReady ? "is-ready" : "is-loading"}`}>
        {!expressReady ? (
          <div className="pay-express-skeleton" aria-hidden="true">
            <span />
            <span />
          </div>
        ) : null}
        <ExpressCheckoutElement
          onReady={() => setExpressReady(true)}
          onConfirm={onExpressConfirm}
          options={{
            buttonHeight: 48,
            paymentMethods: { applePay: "auto", googlePay: "auto" },
            layout: { maxColumns: 2, maxRows: 1, overflow: "auto" },
          }}
        />
      </div>
      <div className="pay-element-divider" role="separator" aria-label="payment methods separator">
        <span>{dividerLabel}</span>
      </div>
      <form onSubmit={onSubmit}>
        <PaymentElement />
        <button className="btn pay-element-submit" type="submit" disabled={!stripe || !elements || submitting}>
          {submitting ? submittingLabel : submitLabel}
        </button>
      </form>
    </div>
  );
};

export const PayRedirectPage = () => {
  const { copy, locale } = useI18n();
  const location = useLocation();
  const promoInputRef = useRef<HTMLInputElement | null>(null);
  const paymentSectionRef = useRef<HTMLElement | null>(null);
  const intentRequestKeyRef = useRef<string | null>(null);
  const intentInFlightKeyRef = useRef<string | null>(null);
  const lastFocusedOrderIdRef = useRef<string | null>(null);
  const transitionTrackedRef = useRef(false);

  const promoFromQuery = useMemo(() => new URLSearchParams(location.search).get("promo")?.trim() || "", [location.search]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [promoCode, setPromoCode] = useState(promoFromQuery);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [isPromoOpen, setIsPromoOpen] = useState(Boolean(promoFromQuery));
  const [emailEventSent, setEmailEventSent] = useState(false);
  const [intentPayload, setIntentPayload] = useState<CreatePaymentIntentResponse | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

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
  const hasValidEmail = isValidEmail(emailValue);
  const plansLocked = !hasValidEmail;
  const emailError =
    emailTouched && emailValue.length === 0
      ? copy.ui.payEmailRequired
      : emailTouched && !hasValidEmail
        ? copy.ui.payEmailInvalid
        : null;

  const planHelperText = plansLocked
    ? copy.ui.payPlanHelperNeedsEmail
    : selectedPlan
      ? copy.ui.payPlanHelperSelected.replace("{plan}", selectedPlanHeadline)
      : copy.ui.payPlanHelperIdle;

  const canCreateIntent =
    Boolean(selectedPlan) &&
    emailBlurred &&
    hasValidEmail &&
    !promoChecking &&
    (!normalizedPromoCode || promoApplied);

  const intentKey =
    selectedPlan && canCreateIntent
      ? `${selectedPlan.code}|${emailValue.toLowerCase()}|${(appliedPromoCode || "").toUpperCase()}`
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
    if (plansLocked) {
      return;
    }

    setSelectedPlanCode(planCode);
    setIntentPayload(null);
    setStripePromise(null);
    setError(null);
    intentRequestKeyRef.current = null;
    lastFocusedOrderIdRef.current = null;

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

  const buildReturnUrl = (orderId: string): string => {
    const base = new URL(window.location.origin);
    const successUrl = new URL("/pay/success", base);
    successUrl.searchParams.set("order_id", orderId);
    const botUrl = new URLSearchParams(location.search).get("bot_url")?.trim();
    if (botUrl) {
      successUrl.searchParams.set("bot_url", botUrl);
    }
    return successUrl.toString();
  };

  useEffect(() => {
    if (!selectedPlan || !intentKey || !canCreateIntent) {
      return;
    }
    if (intentRequestKeyRef.current === intentKey && intentPayload) {
      return;
    }
    if (intentInFlightKeyRef.current === intentKey) {
      return;
    }

    let cancelled = false;
    const requestIntent = async () => {
      intentInFlightKeyRef.current = intentKey;
      setIntentLoading(true);
      setError(null);
      try {
        const payload = await createPaymentIntent({
          plan: selectedPlan.code,
          email: emailValue,
          clickid,
          locale,
          telegram_chat_id: tgChatId || undefined,
          promo_code: appliedPromoCode || undefined,
        });

        if (cancelled) {
          return;
        }

        intentRequestKeyRef.current = intentKey;
        setIntentPayload(payload);
        setStripePromise(loadStripe(payload.publishable_key));
        logTracking("payment", "payment_intent_created", {
          orderId: payload.order_id,
          plan: selectedPlan.code,
        });
        reachYandexMetrikaGoal("checkout_start");
        if (!transitionTrackedRef.current) {
          sendPostbackOnce(MobiSlonEvent.TRANSITION_TO_PAYMENT, location.search);
          transitionTrackedRef.current = true;
        }
      } catch (cause) {
        if (cancelled) {
          return;
        }

        if (cause instanceof ApiError && cause.code === "promo_invalid") {
          setPromoError(copy.ui.payPromoInvalid);
          setAppliedPromoCode(null);
          setIntentPayload(null);
          setStripePromise(null);
          intentRequestKeyRef.current = null;
          return;
        }

        logTracking(
          "payment",
          "payment_intent_error",
          { plan: selectedPlan.code, error: String(cause) },
          "error",
        );
        setError(copy.ui.payError);
      } finally {
        if (intentInFlightKeyRef.current === intentKey) {
          intentInFlightKeyRef.current = null;
        }
        if (!cancelled) {
          setIntentLoading(false);
        }
      }
    };

    void requestIntent();

    return () => {
      cancelled = true;
    };
  }, [
    appliedPromoCode,
    canCreateIntent,
    clickid,
    copy.ui.payError,
    copy.ui.payPromoInvalid,
    emailValue,
    intentKey,
    intentPayload,
    locale,
    location.search,
    selectedPlan,
    tgChatId,
  ]);

  useEffect(() => {
    if (!intentPayload) {
      return;
    }
    if (lastFocusedOrderIdRef.current === intentPayload.order_id) {
      return;
    }

    const target = paymentSectionRef.current;
    if (!target) {
      return;
    }

    lastFocusedOrderIdRef.current = intentPayload.order_id;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      target.focus({ preventScroll: true });
    }, 240);
  }, [intentPayload]);

  useEffect(() => {
    document.body.classList.toggle("pay-loading-lock", intentLoading);
    return () => {
      document.body.classList.remove("pay-loading-lock");
    };
  }, [intentLoading]);

  return (
    <>
      <Container className="pay-page">
        <LanguageSwitcher />
        <QuizCard className="pay-card" aria-busy={intentLoading}>
          <div className="pay-hero">
            <h1>{copy.ui.payTitle}</h1>
          </div>

          <section className="pay-section" aria-labelledby="pay-email-label">
            <label id="pay-email-label" className="pay-field" htmlFor="pay-email">
              {copy.ui.payEmailLabel}
            </label>
            <p className="pay-email-explain">{copy.ui.payEmailExplain}</p>
            <input
              id="pay-email"
              className={`pay-input ${emailError ? "is-invalid" : ""}`.trim()}
              type="email"
              value={email}
              onChange={(event) => {
                const value = event.target.value;
                setEmail(value);
                setEmailBlurred(false);
                setIntentPayload(null);
                setStripePromise(null);
                intentRequestKeyRef.current = null;
                lastFocusedOrderIdRef.current = null;
                maybeSendPayEmailEvent(value);
                if (error) {
                  setError(null);
                }
              }}
              onBlur={() => {
                setEmailTouched(true);
                setEmailBlurred(true);
                maybeSendPayEmailEvent(email);
              }}
              placeholder={copy.ui.payEmailPlaceholder}
              autoComplete="email"
              aria-invalid={emailError ? "true" : "false"}
              aria-describedby={emailError ? "pay-email-error" : "pay-email-hint"}
            />
            {!emailError ? <p id="pay-email-hint" className="pay-email-hint">{copy.ui.payEmailHintNoSpam}</p> : null}
          </section>

          <div className="pay-trust pay-trust--inline" aria-label="purchase trust indicators">
            <span>{copy.ui.paySecureCheckout}</span>
            <span>{copy.ui.payCancelAnytime}</span>
            <span>{copy.ui.payMoneyBack}</span>
            <span>{copy.ui.paySupportAccess}</span>
          </div>

          <section className="pay-section" aria-labelledby="pay-plan-label">
            <div className="pay-section__head">
              <h2 id="pay-plan-label">{copy.ui.payPlanLabel}</h2>
            </div>
            <p className={`pay-plan-helper ${selectedPlan && !plansLocked ? "pay-plan-helper--selected" : ""}`}>
              {planHelperText}
            </p>

            <div className={`pay-plans ${plansLocked ? "is-locked" : "is-unlocked"}`} aria-busy={plansLoading}>
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
                  disabled={plansLocked}
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
                    setIntentPayload(null);
                    setStripePromise(null);
                    intentRequestKeyRef.current = null;
                    lastFocusedOrderIdRef.current = null;
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

          {intentPayload && stripePromise ? (
            <section
              ref={paymentSectionRef}
              tabIndex={-1}
              className="pay-section pay-element"
              aria-label="embedded payment element"
            >
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: intentPayload.client_secret,
                  appearance: { theme: "night" },
                }}
              >
                <EmbeddedPaymentForm
                  returnUrl={buildReturnUrl(intentPayload.order_id)}
                  submitLabel={copy.ui.payConfirmButton}
                  submittingLabel={copy.ui.payConfirmingButton}
                  dividerLabel={copy.ui.payOrCard}
                  onFailure={(message) => setError(message || copy.ui.payError)}
                />
              </Elements>
            </section>
          ) : null}

          {emailError ? <p id="pay-email-error" className="pay-error">{emailError}</p> : null}
          {!emailError && error ? <p className="pay-error">{error}</p> : null}
        </QuizCard>
      </Container>
      <div className={`pay-loading-overlay ${intentLoading ? "is-active" : ""}`} aria-hidden={intentLoading ? "false" : "true"}>
        <div className="pay-loading-overlay__content" role="status" aria-live="polite">
          <span className="pay-loading-overlay__spinner" aria-hidden="true" />
          <span>{copy.ui.payPreparingOverlay}</span>
        </div>
      </div>
      <SiteFooter />
    </>
  );
};
