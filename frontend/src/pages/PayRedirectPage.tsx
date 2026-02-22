import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../features/i18n/I18nProvider";
import { getClickId } from "../shared/lib/clickid";
import { MobiSlonEvent } from "../shared/lib/mobiSlonEvents";
import { createCheckoutSession } from "../shared/lib/paymentApi";
import { sendPostbackOnce } from "../shared/lib/tracking";
import { logTracking } from "../shared/lib/trackingLogger";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const PayRedirectPage = () => {
  const { copy, locale } = useI18n();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clickid = useMemo(() => {
    return getClickId(location.search)?.trim() || "direct";
  }, [location.search]);

  const onPay = async () => {
    if (!email.trim()) {
      setError(copy.ui.payError);
      return;
    }

    setError(null);
    setLoading(true);
    sendPostbackOnce(MobiSlonEvent.TRANSITION_TO_PAYMENT, location.search);

    try {
      const payload = await createCheckoutSession({
        mode: "subscription",
        plan: "sub_monthly",
        email: email.trim(),
        clickid,
        locale,
      });
      logTracking("payment", "checkout_session_created", { sessionId: payload.session_id, mode: "subscription" });
      window.location.href = payload.checkout_url;
    } catch (cause) {
      logTracking("payment", "checkout_session_error", { mode: "subscription", error: String(cause) }, "error");
      setError(copy.ui.payError);
      setLoading(false);
    }
  };

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard>
          <h1>{copy.ui.payWait}</h1>
          <p className="pay-copy">{copy.ui.payUnavailable}</p>

          <label className="pay-field" htmlFor="pay-email">
            {copy.ui.payEmailLabel}
          </label>
          <input
            id="pay-email"
            className="pay-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.ui.payEmailPlaceholder}
            autoComplete="email"
          />

          <button className="btn" type="button" onClick={onPay} disabled={loading}>
            {loading ? copy.ui.payStarting : copy.ui.payStart}
          </button>

          {error ? <p className="pay-error">{error}</p> : null}
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
