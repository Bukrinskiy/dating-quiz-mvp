import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe, StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { type FormEvent, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { getPaymentOrderStatus, type CreatePaymentIntentResponse, type MoneyAmount, type PublicPlan } from "../../shared/api/paymentApi";
import { createQuizSessionIntent, getQuizSessionPlanData } from "../../shared/api/quizSessionApi";
import { getClickId, getTrackingAttribution } from "../../entities/tracking-attribution/model";
import { quizCheckoutContent, quizSummaryTranslations } from "../../features/checkout-content/newCheckoutContent";
import { buildQuizIntentKey, getStripeSingleton, readQuizIntentPrewarm, saveQuizIntentPrewarm } from "../../shared/lib/quizIntentWarmup";
import { sendPostbackOnce } from "../../shared/lib/tracking";
import { buildPayUrl } from "../../shared/config/runtime";
import { DEFAULT_QUIZ_LANG, isQuizLang, payRoutes, type QuizLang } from "../../shared/config/routes";
import { flirtoLogoSrc } from "../../shared/branding/flirtoLogo";
import { BrandHomeLink } from "../../shared/ui/BrandHomeLink";
import { SiteFooter } from "../../shared/ui/SiteFooter";

const QUIZ_STORAGE_KEY = "new_quiz_answers";
const intentRequestCache = new Map<string, Promise<CreatePaymentIntentResponse>>();

const localizeSummaryValue = (
  value: string,
  field: keyof typeof quizSummaryTranslations,
  isRu: boolean,
  fallback: string,
): string => {
  if (!value) return fallback;
  const map = quizSummaryTranslations[field] as Record<string, string>;
  if (isRu) {
    return map[value] && /[А-Яа-яЁё]/.test(map[value]) ? map[value] : value;
  }
  return map[value] && /[A-Za-z]/.test(map[value]) ? map[value] : value;
};

const formatMoneyPopup = (amount: MoneyAmount): string => {
  const value = (amount.amount_minor / 100).toFixed(2);
  if (amount.currency.toLowerCase() === "usd") {
    return `$${value}`;
  }
  return `${amount.currency.toUpperCase()} ${value}`;
};

const formatMoneySource = (amount: MoneyAmount): string => `${amount.currency.toUpperCase()} ${(amount.amount_minor / 100).toFixed(2)}`;

const isYearlyPlan = (plan: PublicPlan): boolean =>
  plan.interval_unit === "year" ||
  plan.billing_period === "year" ||
  /year/i.test(plan.headline) ||
  /год/i.test(plan.headline);

const isThreeMonthsPlan = (plan: PublicPlan): boolean =>
  (plan.interval_unit === "month" && plan.interval_count === 3) ||
  /3\s*(month|месяц)/i.test(plan.headline);

const getLocaleContent = (lang: QuizLang) => quizCheckoutContent[lang];

const resolvePlanHeadline = (content: ReturnType<typeof getLocaleContent>, plan: PublicPlan): string => {
  if (isYearlyPlan(plan) || isThreeMonthsPlan(plan)) return content.checkout.planThreeMonths;
  if (plan.interval_unit === "week") return content.checkout.planDays(plan.interval_count * 7);
  if (plan.interval_unit === "month") return plan.interval_count === 1 ? content.checkout.planMonthly : content.checkout.planMonths(plan.interval_count);
  if (plan.interval_unit === "year") return content.checkout.planYearly;
  if (plan.headline?.trim()) return plan.headline;
  return content.checkout.planDefaultMonthly;
};

const resolveBillingPeriodLabel = (content: ReturnType<typeof getLocaleContent>, plan: PublicPlan): string => {
  const count = Math.max(1, Number(plan.interval_count) || 1);
  if (plan.interval_unit === "week") {
    return count === 1 ? content.checkout.billingEveryWeek : content.checkout.billingEveryWeeks(count);
  }
  if (plan.interval_unit === "month") {
    return count === 1 ? content.checkout.billingEveryMonth : content.checkout.billingEveryMonths(count);
  }
  if (plan.interval_unit === "year") {
    return count === 1 ? content.checkout.billingEveryYear : content.checkout.billingEveryYears(count);
  }
  return content.checkout.billingRecurring;
};

const resolveDailySuffix = (content: ReturnType<typeof getLocaleContent>): string => content.checkout.perDay;

const resolveCheckoutPlanDurationTag = (plan: PublicPlan | undefined): "7d" | "30d" | "90d" => {
  if (!plan) return "30d";
  if (plan.interval_unit === "week") return "7d";
  if (plan.interval_unit === "month" && (plan.interval_count ?? 1) >= 3) return "90d";
  if (plan.interval_unit === "year") return "90d";
  if (/quarter|3\s*month|3\s*месяц|year|год/i.test(plan.code) || /quarter|3\s*month|3\s*месяц|year|год/i.test(plan.headline)) {
    return "90d";
  }
  return "30d";
};

const getQuizSummary = (lang: QuizLang): { mainGoal: string; personality: string; skills: string; learning: string } => {
  const isRu = lang === "ru";
  const defaults = quizCheckoutContent[lang].quizSummaryDefaults;
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as { answers?: Record<string, unknown> };
    const answers = parsed.answers || {};
    const rawMainGoal = String(answers["1"] || defaults.mainGoal);
    const rawPersonality = String(answers["3"] || defaults.personality);
    const rawSkill = Array.isArray(answers["6"]) ? String((answers["6"] as string[])[0] || defaults.skills) : defaults.skills;
    const rawLearning = String(answers["23"] || defaults.learning);
    return {
      mainGoal: localizeSummaryValue(rawMainGoal, "mainGoal", isRu, defaults.mainGoal),
      personality: localizeSummaryValue(rawPersonality, "personality", isRu, defaults.personality),
      skills: localizeSummaryValue(rawSkill, "skills", isRu, defaults.skills),
      learning: localizeSummaryValue(rawLearning, "learning", isRu, defaults.learning),
    };
  } catch {
    return defaults;
  }
};

type EmbeddedPaymentFormProps = {
  returnUrl: string;
  orderId: string;
  onFailure: (message: string) => void;
  content: ReturnType<typeof getLocaleContent>;
  onPaymentStart: () => void;
  loadingIntent: boolean;
};

const STRIPE_CONFIRM_TIMEOUT_MS = 20_000;
const PAYMENT_STATUS_POLL_INTERVAL_MS = 3_000;
const PAYMENT_STATUS_POLL_ATTEMPTS = 5;

const EmbeddedPaymentForm = ({ returnUrl, orderId, onFailure, content, onPaymentStart, loadingIntent }: EmbeddedPaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [expressReady, setExpressReady] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);

  useEffect(() => {
    setExpressReady(false);
    setPaymentReady(false);
  }, [returnUrl]);

  const showPreparingState = loadingIntent || !expressReady || !paymentReady;

  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const finalizePaidOrder = async (): Promise<boolean> => {
    for (let attempt = 0; attempt < PAYMENT_STATUS_POLL_ATTEMPTS; attempt += 1) {
      try {
        const status = await getPaymentOrderStatus(orderId);
        if (status.payment_status === "paid") {
          window.location.href = returnUrl;
          return true;
        }
      } catch {
        // Ignore transient status fetch failures and continue polling.
      }
      await wait(PAYMENT_STATUS_POLL_INTERVAL_MS);
    }
    return false;
  };

  const confirmCurrentPayment = async (): Promise<{ ok: boolean; message?: string }> => {
    if (!stripe || !elements) {
      return { ok: false, message: "Stripe is not ready" };
    }

    try {
      const result = await Promise.race([
        stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
          redirect: "if_required",
        }),
        wait(STRIPE_CONFIRM_TIMEOUT_MS).then(() => "timeout" as const),
      ]);

      if (result === "timeout") {
        const recovered = await finalizePaidOrder();
        if (recovered) {
          return { ok: true };
        }
        return { ok: false, message: content.checkout.modalPaymentError };
      }

      if (result.error?.message) {
        return { ok: false, message: result.error.message };
      }

      window.location.href = returnUrl;
      return { ok: true };
    } catch (error) {
      const recovered = await finalizePaidOrder();
      if (recovered) {
        return { ok: true };
      }
      const message = error instanceof Error ? error.message : null;
      return { ok: false, message: message || content.checkout.modalPaymentError };
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    onPaymentStart();
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
    onPaymentStart();
    const result = await confirmCurrentPayment();
    if (!result.ok) {
      event.paymentFailed({ reason: "fail", message: result.message || "Payment confirmation failed" });
      onFailure(result.message || "Payment confirmation failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="source-checkout__stripe">
      {showPreparingState ? (
        <div className="source-checkout__loading-state" role="status" aria-live="polite">
          <span className="source-checkout__spinner" aria-hidden="true" />
          <span>{content.checkout.modalPreparingPayment}</span>
        </div>
      ) : null}
      {!expressReady || loadingIntent ? <div className="source-checkout__skeleton source-checkout__skeleton--express" /> : null}
      <ExpressCheckoutElement
        onConfirm={onExpressConfirm}
        onReady={() => setExpressReady(true)}
        options={{
          buttonHeight: 48,
          paymentMethods: { applePay: "auto", googlePay: "auto" },
          layout: { maxColumns: 2, maxRows: 1, overflow: "auto" },
        }}
      />
      <div className="source-checkout__divider"><span>{content.checkout.modalDividerCard}</span></div>
      <form onSubmit={onSubmit}>
        {!paymentReady || loadingIntent ? <div className="source-checkout__skeleton source-checkout__skeleton--payment" /> : null}
        <PaymentElement onReady={() => setPaymentReady(true)} />
        <button className="source-checkout__pay-btn" type="submit" disabled={!stripe || !elements || submitting}>
          {submitting ? content.checkout.modalConfirming : content.checkout.modalPay}
        </button>
      </form>
    </div>
  );
};

const PlanCard = ({
  plan,
  selected,
  content,
  onSelect,
}: {
  plan: PublicPlan;
  selected: boolean;
  content: ReturnType<typeof getLocaleContent>;
  onSelect: (code: string) => void;
}) => (
  <button
    type="button"
    className={`source-checkout__plan ${selected ? "is-selected" : ""} ${plan.is_highlighted ? "has-badge" : ""}`.trim()}
    onClick={() => onSelect(plan.code)}
  >
    {plan.is_highlighted ? <div className="source-checkout__plan-badge">{content.checkout.planMostPopular}</div> : null}
    <div className="source-checkout__plan-body">
      <div className="source-checkout__plan-left">
        <img
          src={selected ? "/icons/checkout/affemity-funnel-checkout/checked-mark.svg" : "/icons/checkout/affemity-funnel-checkout/check-mark.svg"}
          alt=""
        />
        <div>
          <strong>{resolvePlanHeadline(content, plan)}</strong>
          <p>
            {plan.compare_at_price ? <span>{formatMoneySource(plan.compare_at_price)}</span> : null}
            {" "}
            {formatMoneySource(plan.price)}
          </p>
        </div>
      </div>
      <div className="source-checkout__plan-right">
        {plan.compare_at_per_day_price ? <em>{formatMoneySource(plan.compare_at_per_day_price)}</em> : null}
        {plan.per_day_price ? <b>{formatMoneySource(plan.per_day_price)}</b> : null}
        <small>{resolveDailySuffix(content)}</small>
      </div>
    </div>
  </button>
);

export const CheckoutPage = () => {
  const { uuid, lang: langParam } = useParams<{ uuid: string; lang?: string }>();
  const location = useLocation();
  const lang: QuizLang = isQuizLang(langParam) ? langParam : DEFAULT_QUIZ_LANG;
  const content = getLocaleContent(lang);
  const faqItems = content.faqItems;
  const matchFeatures = content.matchFeatures;
  const howStepTargets = content.howStepTargets;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(9 * 60 + 59);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentPayload, setIntentPayload] = useState<CreatePaymentIntentResponse | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  const intentKeyRef = useRef<string | null>(null);
  const quizSummary = useMemo(() => getQuizSummary(lang), [lang]);
  const displayPlans = useMemo(() => {
    const hasNativeThreeMonths = plans.some((plan) => isThreeMonthsPlan(plan));
    if (hasNativeThreeMonths) {
      return plans.filter((plan) => !isYearlyPlan(plan));
    }
    return plans.map((plan) => {
      if (!isYearlyPlan(plan)) return plan;
      return {
        ...plan,
        headline: content.checkout.planThreeMonths,
        interval_unit: "month",
        interval_count: 3,
        billing_period: "month",
      };
    });
  }, [content.checkout.planThreeMonths, plans]);

  const clickid = useMemo(() => getClickId(location.search)?.trim() || "direct", [location.search]);
  const trackingAttribution = useMemo(() => getTrackingAttribution(location.search), [location.search]);
  const tgChatId = useMemo(() => new URLSearchParams(location.search).get("tg_chat_id")?.trim() || "", [location.search]);
  const promoCode = useMemo(() => new URLSearchParams(location.search).get("promo")?.trim() || "", [location.search]);

  const trackCheckoutPlanSelection = (planCode: string) => {
    const selectedPlan = displayPlans.find((plan) => plan.code === planCode);
    const status = `checkout_plan_${resolveCheckoutPlanDurationTag(selectedPlan)}_selected`;
    sendPostbackOnce(status, location.search, {
      forceSend: true,
      sessionId: uuid ?? "checkout",
      trackingParams: { plan: planCode },
    });
  };

  const trackTransitionToPayment = () => {
    sendPostbackOnce("transition_to_payment", location.search, {
      forceSend: true,
      sessionId: uuid ?? "checkout",
      trackingParams: selectedPlanCode ? { plan: selectedPlanCode } : undefined,
    });
  };

  const trackPaymentStarted = () => {
    sendPostbackOnce("payment_started", location.search, {
      forceSend: true,
      sessionId: uuid ?? "checkout",
      trackingParams: {
        ...(selectedPlanCode ? { plan: selectedPlanCode } : {}),
        ...(email ? { email: email.trim().toLowerCase() } : {}),
      },
    });
  };

  const closePaymentPopup = useEffectEvent((reason: "close_button" | "backdrop" | "escape") => {
    if (!showPopup) return;
    sendPostbackOnce("checkout_popup_closed", location.search, {
      forceSend: true,
      sessionId: uuid ?? "checkout",
      trackingParams: {
        reason,
        ...(selectedPlanCode ? { plan: selectedPlanCode } : {}),
      },
    });
    setShowPopup(false);
  });

  useEffect(() => {
    if (!uuid) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await getQuizSessionPlanData(uuid, promoCode || undefined);
        if (!active) return;
        if (!payload.email) {
          setError("email_required");
          return;
        }
        setEmail(payload.email);
        setPlans(payload.plans);
        const defaultPlan = payload.plans.find((plan) => plan.is_default) ?? payload.plans[0];
        setSelectedPlanCode(defaultPlan?.code || "");
      } catch {
        if (!active) return;
        setError(content.checkout.modalLoadCheckoutError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [content.checkout.modalLoadCheckoutError, promoCode, uuid]);

  useEffect(() => {
    if (!uuid || !email || !selectedPlanCode) return;
    const key = buildQuizIntentKey({
      uuid,
      plan: selectedPlanCode,
      email,
      promo: promoCode,
      lang,
    });
    if (intentKeyRef.current === key && intentPayload) return;

    let cancelled = false;
    const loadIntent = async () => {
      setIntentLoading(true);
      setError(null);
      try {
        const prewarmed = readQuizIntentPrewarm(key);
        if (prewarmed) {
          intentKeyRef.current = key;
          setIntentPayload(prewarmed);
          setStripePromise(getStripeSingleton(prewarmed.publishable_key));
          return;
        }
        const cachedRequest = intentRequestCache.get(key);
        const request =
          cachedRequest ??
          createQuizSessionIntent({
            uuid,
            plan: selectedPlanCode,
            email,
            clickid,
            locale: lang,
            promo_code: promoCode || undefined,
            telegram_chat_id: tgChatId || undefined,
            landing_id: trackingAttribution.params.get("landing_id")?.trim() || undefined,
            entry_host: trackingAttribution.params.get("entry_host")?.trim() || undefined,
            entry_path: trackingAttribution.params.get("entry_path")?.trim() || undefined,
          });
        if (!cachedRequest) {
          intentRequestCache.set(key, request);
        }
        const payload = await request;
        if (cancelled) return;
        intentKeyRef.current = key;
        setIntentPayload(payload);
        setStripePromise(getStripeSingleton(payload.publishable_key));
        saveQuizIntentPrewarm({
          key,
          ts: Date.now(),
          payload,
        });
      } catch {
        if (cancelled) return;
        setError(content.checkout.modalPreparePaymentError);
      } finally {
        intentRequestCache.delete(key);
        if (!cancelled) {
          setIntentLoading(false);
        }
      }
    };
    void loadIntent();
    return () => {
      cancelled = true;
    };
  }, [clickid, content.checkout.modalPreparePaymentError, email, intentPayload, lang, promoCode, selectedPlanCode, tgChatId, trackingAttribution.params, uuid]);

  useEffect(() => {
    if (!displayPlans.length) return;
    const exists = displayPlans.some((plan) => plan.code === selectedPlanCode);
    if (exists) return;
    const fallback = displayPlans.find((plan) => plan.is_default) ?? displayPlans[0];
    setSelectedPlanCode(fallback.code);
  }, [displayPlans, selectedPlanCode]);

  useEffect(() => {
    document.body.classList.toggle("body-lock", showPopup);
    return () => document.body.classList.remove("body-lock");
  }, [showPopup, closePaymentPopup]);

  useEffect(() => {
    if (!showPopup) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePaymentPopup("escape");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showPopup, closePaymentPopup]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimerSeconds((prev) => (prev <= 0 ? 9 * 60 + 59 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!uuid) {
    return <Navigate to={payRoutes.manage(lang)} replace />;
  }

  if (loading) {
    return (
      <main className="source-checkout">
        <section className="source-checkout__container">
          <p className="source-checkout__loading">{content.checkout.modalOpeningCheckout}</p>
        </section>
      </main>
    );
  }

  if (error === "email_required") {
    return <Navigate to={payRoutes.manage(lang)} replace />;
  }

  const selectedPlan = displayPlans.find((plan) => plan.code === selectedPlanCode) ?? null;
  const timerMinutes = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const timerSecs = String(timerSeconds % 60).padStart(2, "0");
  const summaryBaseAmount = selectedPlan ? (selectedPlan.compare_at_price ?? selectedPlan.price) : null;
  const summaryTotalAmount = selectedPlan?.price ?? null;
  const summaryDiscountAmount = selectedPlan && summaryBaseAmount
    ? {
        currency: summaryBaseAmount.currency,
        amount_minor: Math.max(0, summaryBaseAmount.amount_minor - selectedPlan.price.amount_minor),
      }
    : null;
  const summaryDiscountPercent = summaryBaseAmount && summaryDiscountAmount && summaryBaseAmount.amount_minor > 0
    ? Math.round((summaryDiscountAmount.amount_minor / summaryBaseAmount.amount_minor) * 100)
    : 0;
  const hasSummaryDiscount = Boolean(selectedPlan?.compare_at_price) && Boolean(summaryDiscountAmount && summaryDiscountAmount.amount_minor > 0);
  const regularPrice = summaryBaseAmount ? formatMoneyPopup(summaryBaseAmount) : null;
  const planPrice = summaryTotalAmount ? formatMoneyPopup(summaryTotalAmount) : null;
  const discountPrice = summaryDiscountAmount ? formatMoneyPopup(summaryDiscountAmount) : null;
  const billingLabel = selectedPlan ? resolveBillingPeriodLabel(content, selectedPlan) : "";
  const bothPersonalityValues = new Set([
    quizCheckoutContent.ru.quizSummaryDefaults.personality,
    quizCheckoutContent.en.quizSummaryDefaults.personality,
  ]);
  const summaryPersonality = bothPersonalityValues.has(quizSummary.personality)
    ? content.checkout.summaryPersonalityBoth
    : quizSummary.personality;

  const returnUrl = intentPayload
    ? (() => {
        const success = new URL(buildPayUrl(payRoutes.success(lang)));
        const preservedParams = new URLSearchParams(location.search);
        preservedParams.forEach((value, key) => {
          success.searchParams.set(key, value);
        });
        success.searchParams.set("order_id", intentPayload.order_id);
        success.searchParams.set("session_id", uuid);
        const botUrl = preservedParams.get("bot_url")?.trim();
        if (botUrl) {
          success.searchParams.set("bot_url", botUrl);
        }
        return success.toString();
      })()
    : "";

  return (
    <>
      <main className="source-checkout">
        <section className="source-checkout__container">
          <div className="source-checkout__topbar">
            <BrandHomeLink className="source-checkout__logo-link" ariaLabel={content.checkout.goHomeAria}>
              <img src={flirtoLogoSrc} alt="Flirto Guru" />
            </BrandHomeLink>
          </div>

          <section className="source-checkout__now-after">
            <div className="source-checkout__now-after-head">
              <p>{content.checkout.now}</p>
              <p>{content.checkout.after}</p>
            </div>
            <img src="/images/checkout/affemity-funnel-checkout/now-after-main-img.webp" alt={content.checkout.resultIllustrationAlt} />
            <div className="source-checkout__now-after-foot">
              <div className="source-checkout__now-after-col">
                <div>
                  <p>{content.checkout.successRate}</p>
                  <strong>&gt; 30%</strong>
                </div>
                <span />
                <div>
                  <p>{content.checkout.textingSkills}</p>
                  <div className="source-checkout__skills-line">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
              <div className="source-checkout__now-after-col is-after">
                <div>
                  <p>{content.checkout.successRate}</p>
                  <strong>74 - 94%</strong>
                </div>
                <span />
                <div>
                  <p>{content.checkout.textingSkills}</p>
                  <div className="source-checkout__skills-line is-full">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="source-pay__summary">
            <div className="source-pay__summary-badge">{content.checkout.aiGenerated}</div>
            <div className="source-pay__summary-grid">
              <article>
                <img src="/icons/checkout/affemity-funnel-checkout/main-goal-img.svg" alt="" />
                <div><p>{content.checkout.mainGoal}</p><strong>{quizSummary.mainGoal}</strong></div>
              </article>
              <article>
                <img src="/icons/checkout/affemity-funnel-checkout/daily-learning-img.svg" alt="" />
                <div><p>{content.checkout.learning}</p><strong>{quizSummary.learning}</strong></div>
              </article>
              <article>
                <img src="/icons/checkout/affemity-funnel-checkout/desired-skills.svg" alt="" />
                <div><p>{content.checkout.desiredSkills}</p><strong>{quizSummary.skills}</strong></div>
              </article>
              <article>
                <img src="/icons/checkout/affemity-funnel-checkout/your-personality-img.svg" alt="" />
                <div><p>{content.checkout.yourPersonality}</p><strong>{summaryPersonality}</strong></div>
              </article>
            </div>
          </section>

          <section className="source-checkout__hero">
            <h1>{content.checkout.heroTitle}</h1>
            <p className="source-checkout__season-discount">{content.checkout.seasonDiscount}</p>
            <div className="source-checkout__promo-timer">
              <p>{content.checkout.offerExpiresIn}</p>
              <div className="source-checkout__promo-time">
                <div>
                  <strong>{timerMinutes}</strong>
                  <small>{content.checkout.timerMin}</small>
                </div>
                <b>:</b>
                <div>
                  <strong>{timerSecs}</strong>
                  <small>{content.checkout.timerSec}</small>
                </div>
              </div>
            </div>
            <div className="source-checkout__plans">
              {displayPlans.map((plan) => (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  selected={plan.code === selectedPlanCode}
                  content={content}
                  onSelect={(code) => {
                    trackCheckoutPlanSelection(code);
                    setSelectedPlanCode(code);
                    setIntentPayload(null);
                    setStripePromise(null);
                    intentKeyRef.current = null;
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="source-pay__open-cta source-checkout__offer-cta"
              onClick={() => {
                trackTransitionToPayment();
                setShowPopup(true);
              }}
            >
              {content.checkout.openCta}
            </button>
            <div className="source-checkout__safe source-checkout__safe--main">
              <img src="/icons/checkout/affemity-funnel-checkout/shield-check.svg" alt="" />
              <span>{content.checkout.securePayment}</span>
            </div>
            <img className="source-checkout__card-options source-checkout__card-options--main" src="/images/card-options.png" alt="card options" />
            <p className="source-checkout__disclaimer">
              {selectedPlan ? `${resolvePlanHeadline(content, selectedPlan)}: ` : ""}
              {content.checkout.offerCopy}
            </p>
          </section>

          <section className="source-pay__apps">
            <div className="source-checkout__match-head">
              <img src="/icons/checkout/affemity-funnel-checkout/its-a-match-img.png" alt="" />
              <p>{content.checkout.matchHead}</p>
            </div>
            <div className="source-checkout__benefits">
              {matchFeatures.map((item) => (
                <article key={item}>
                  <img src="/icons/checkout/affemity-funnel-checkout/green-check-mark.svg" alt="" />
                  <p>{item}</p>
                </article>
              ))}
            </div>
            <article className="source-checkout__apps-card">
              <p>{content.checkout.appsCard}</p>
              <img src="/images/checkout/affemity-funnel-checkout/dating-apps.png" alt="" />
            </article>
            <article className="source-checkout__cheat-code">
              <p>{content.checkout.cheatCode}</p>
            </article>
          </section>

          <section className="source-pay__how">
            <h3>{content.checkout.howTitleLine1}<br />{content.checkout.howTitleLine2}</h3>
            <div className="source-pay__how-wrap">
              <img className="source-pay__how-arrow source-pay__how-arrow--right" src="/icons/checkout/affemity-funnel-checkout/arrow-right-down.svg" alt="" />
              <img className="source-pay__how-arrow source-pay__how-arrow--left" src="/icons/checkout/affemity-funnel-checkout/arrow-left-down.svg" alt="" />
              <div className="source-pay__how-card">
                <img src="/images/checkout/affemity-funnel-checkout/how-it-works-img1.webp" alt="" />
                <div className="source-pay__how-title"><span>1</span><p>{content.checkout.howStep1}</p></div>
              </div>
              <div className="source-pay__how-card source-pay__how-card--goal">
                <div className="source-checkout__targets">
                  {howStepTargets.map((item) => (
                    <p key={item}>
                      <span>{item === howStepTargets[0] ? "❤️" : item === howStepTargets[1] ? "💍" : "😈"}</span>
                      {item}
                    </p>
                  ))}
                </div>
                <div className="source-pay__how-title"><span>2</span><p>{content.checkout.howStep2}</p></div>
              </div>
              <div className="source-pay__how-card">
                <img src="/images/checkout/affemity-funnel-checkout/how-it-works-img2.webp" alt="" />
                <div className="source-pay__how-title"><span>3</span><p>{content.checkout.howStep3}</p></div>
              </div>
            </div>
          </section>

          <section className="source-checkout__ben">
            <div className="source-checkout__ben-head">
              <img src="/images/checkout/affemity-funnel-checkout/ben-img.png" alt={content.checkout.benAlt} />
              <div>
                <p>{content.checkout.benName}</p>
                <small>{content.checkout.benCity}</small>
                <img src="/icons/checkout/affemity-funnel-checkout/rating-stars.svg" alt={content.checkout.ratingStarsAlt} />
              </div>
            </div>
            <div className="source-checkout__ben-copy">
              <p>{content.checkout.benCopy1}</p>
              <p>{content.checkout.benCopy2}</p>
            </div>
          </section>

          <section className="source-checkout__arranged">
            <div>
              <p>{content.checkout.arrangedPrefix}</p>
              <strong>{content.checkout.arrangedStrong}</strong>
              <img src="/images/checkout/affemity-funnel-checkout/users-already-arranged-img.webp" alt={content.checkout.resultIllustrationAlt} />
            </div>
          </section>

          <section className="source-pay__faq">
            <h3>{content.checkout.faqTitle}</h3>
            {faqItems.map((item, idx) => (
              <button
                key={item.q}
                type="button"
                className={`source-pay__faq-item ${openFaqIndex === idx ? "is-open" : ""}`.trim()}
                onClick={() => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
              >
                <div className="source-pay__faq-head">
                  <span>{item.q}</span>
                  <img src={openFaqIndex === idx ? "/icons/faq-opened.svg" : "/icons/faq-closed.svg"} alt="" />
                </div>
                {openFaqIndex === idx ? <p>{item.a}</p> : null}
              </button>
            ))}
          </section>

          <section className="source-checkout__hero source-checkout__hero--repeat">
            <h1>{content.checkout.heroTitle}</h1>
            <p className="source-checkout__season-discount">{content.checkout.seasonDiscount}</p>
            <div className="source-checkout__promo-timer">
              <p>{content.checkout.offerExpiresIn}</p>
              <div className="source-checkout__promo-time">
                <div>
                  <strong>{timerMinutes}</strong>
                  <small>{content.checkout.timerMin}</small>
                </div>
                <b>:</b>
                <div>
                  <strong>{timerSecs}</strong>
                  <small>{content.checkout.timerSec}</small>
                </div>
              </div>
            </div>
            <div className="source-checkout__plans">
              {displayPlans.map((plan) => (
                <PlanCard
                  key={`bottom-${plan.code}`}
                  plan={plan}
                  selected={plan.code === selectedPlanCode}
                  content={content}
                  onSelect={(code) => {
                    trackCheckoutPlanSelection(code);
                    setSelectedPlanCode(code);
                    setIntentPayload(null);
                    setStripePromise(null);
                    intentKeyRef.current = null;
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="source-pay__open-cta source-checkout__offer-cta"
              onClick={() => {
                trackTransitionToPayment();
                setShowPopup(true);
              }}
            >
              {content.checkout.openCta}
            </button>
            <div className="source-checkout__safe source-checkout__safe--main">
              <img src="/icons/checkout/affemity-funnel-checkout/shield-check.svg" alt="" />
              <span>{content.checkout.securePayment}</span>
            </div>
            <img className="source-checkout__card-options source-checkout__card-options--main" src="/images/card-options.png" alt="card options" />
            <p className="source-checkout__disclaimer">
              {selectedPlan ? `${resolvePlanHeadline(content, selectedPlan)}: ` : ""}
              {content.checkout.offerCopy}
            </p>
          </section>
          <SiteFooter variant="checkout" />
        </section>
      </main>

      <div className={`source-pay__modal ${showPopup ? "is-open" : ""}`.trim()} aria-hidden={showPopup ? "false" : "true"}>
        <div className="source-pay__modal-backdrop" onClick={() => closePaymentPopup("backdrop")} />
        <section className="source-pay__modal-card source-checkout__modal-card" role="dialog" aria-modal="true" aria-label="Checkout modal">
          <button
            type="button"
            className="source-pay__modal-close"
            onClick={() => closePaymentPopup("close_button")}
            aria-label={content.checkout.modalAriaClose}
          >
            <img src="/icons/checkout-close.svg" alt="" />
          </button>
          <div className="source-pay__modal-stepper" aria-hidden="true">
            <div className="source-pay__modal-stepper-track">
              <span className="is-complete" />
              <span className="is-upcoming" />
            </div>
            <div className="source-pay__modal-stepper-nodes">
              <i className="is-complete" />
              <i className="is-current" />
              <i className="is-upcoming" />
            </div>
            <div className="source-pay__modal-stepper-labels">
              <p>{content.checkout.modalStepPlan}</p>
              <p>{content.checkout.modalStepPayment}</p>
              <p>{content.checkout.modalStepReceipt}</p>
            </div>
          </div>

          {selectedPlan ? (
            <section className="source-checkout__order">
              <h3>{content.checkout.modalOrderSummary}</h3>
              <div className="source-checkout__order-row">
                <p>{content.checkout.productName}<br />{resolvePlanHeadline(content, selectedPlan)}</p>
                <p>{regularPrice}</p>
              </div>
              {hasSummaryDiscount && discountPrice ? (
                <div className="source-checkout__order-row source-checkout__order-row--discount">
                  <p>{`${content.checkout.modalDiscountLabel} (-${summaryDiscountPercent}%)`}</p>
                  <p>- {discountPrice}</p>
                </div>
              ) : null}
              <div className="source-checkout__order-row source-checkout__order-row--total">
                <div>
                  <p>{content.checkout.modalTotal}</p>
                </div>
                <div>
                  <p>{planPrice}</p>
                  <small>{billingLabel}</small>
                </div>
              </div>
            </section>
          ) : null}

          <section className="source-checkout__payment-shell">
            <h3>{content.checkout.modalChoosePayment}</h3>
            <div className="source-checkout__cards-head">
              <p>{content.checkout.modalCreditCard}</p>
              <img src="/images/credit-cards.png" alt="cards" />
            </div>
            {intentLoading || !intentPayload || !stripePromise ? (
              <div className="source-checkout__shell-skeleton" aria-hidden="true">
                <div className="source-checkout__loading-state" role="status" aria-live="polite">
                  <span className="source-checkout__spinner" aria-hidden="true" />
                  <span>{content.checkout.modalPreparingPayment}</span>
                </div>
                <div className="source-checkout__skeleton source-checkout__skeleton--express" />
                <div className="source-checkout__divider"><span>{content.checkout.modalDividerCard}</span></div>
                <div className="source-checkout__skeleton source-checkout__skeleton--payment" />
              </div>
            ) : null}
            {error && error !== "email_required" ? <p className="pay-error">{error}</p> : null}
            {intentPayload && stripePromise && selectedPlan ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: intentPayload.client_secret,
                  locale: lang,
                  appearance: { theme: "stripe" },
                }}
              >
                <EmbeddedPaymentForm
                  returnUrl={returnUrl}
                  orderId={intentPayload.order_id}
                  content={content}
                  loadingIntent={intentLoading}
                  onPaymentStart={trackPaymentStarted}
                  onFailure={(message) => setError(message || content.checkout.modalPaymentError)}
                />
              </Elements>
            ) : null}
            <div className="source-checkout__safe">
              <img src="/icons/checkout/affemity-funnel-checkout/shield-check.svg" alt="" />
              <span>{content.checkout.securePayment}</span>
            </div>
            <img className="source-checkout__card-options" src="/images/card-options.png" alt="card options" />
            <p className="source-checkout__email">{email}</p>
          </section>
        </section>
      </div>
    </>
  );
};
