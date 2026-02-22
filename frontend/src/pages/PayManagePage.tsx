import { useState } from "react";
import { useI18n } from "../features/i18n/I18nProvider";
import { createCustomerPortal } from "../shared/lib/paymentApi";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const PayManagePage = () => {
  const { copy } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onOpenPortal = async () => {
    if (!email.trim()) {
      setError(copy.ui.payError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = await createCustomerPortal(email.trim());
      window.location.href = payload.portal_url;
    } catch {
      setError(copy.ui.payError);
      setLoading(false);
    }
  };

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard>
          <h1>{copy.ui.payManageTitle}</h1>
          <label className="pay-field" htmlFor="manage-email">
            {copy.ui.payEmailLabel}
          </label>
          <input
            id="manage-email"
            className="pay-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.ui.payEmailPlaceholder}
            autoComplete="email"
          />
          <button className="btn" type="button" onClick={onOpenPortal} disabled={loading}>
            {loading ? copy.ui.payStarting : copy.ui.payManageButton}
          </button>
          {error ? <p className="pay-error">{error}</p> : null}
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
