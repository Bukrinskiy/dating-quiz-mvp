import { Link } from "react-router-dom";

import { useI18n } from "../i18n";
import { PrototypeIcon } from "../ui/icons";

type StaticPageKind = "help" | "premium";

type StaticPageProps = {
  kind: StaticPageKind;
};

export function StaticPage({ kind }: StaticPageProps) {
  const { messages } = useI18n();
  const page = messages.staticPages[kind];

  return (
    <section className="stack-page">
      <div className="page-heading">
        <h1>{page.title}</h1>
      </div>
      <div className="settings-card">
        {page.cards.map((card, index) => (
          <div className="settings-row settings-row--static settings-row--tall" key={card.title}>
            <span className="settings-row__icon">
              {index === 0 ? (
                <PrototypeIcon.emptyChat color="currentColor" height={22} width={22} />
              ) : index === 1 ? (
                <PrototypeIcon.shield color="currentColor" height={22} width={22} />
              ) : (
                <PrototypeIcon.sparkle color="currentColor" height={22} width={22} />
              )}
            </span>
            <span className="settings-row__main">
              <strong>{card.title}</strong>
              <span>{card.body}</span>
            </span>
          </div>
        ))}
      </div>

      {kind === "help" ? (
        <>
          <div className="section-label">{messages.staticPages.help.resultSectionLabel}</div>
          <div className="settings-card">
            {messages.staticPages.help.resultCards.map((card) => (
              <div className="settings-row settings-row--static settings-row--tall" key={card.title}>
                <span className="settings-row__main">
                  <strong>{card.title}</strong>
                  <span>{card.body}</span>
                </span>
              </div>
            ))}
          </div>
          <Link className="button button--secondary button--lg button--full" to="/app/support">
            {messages.session.support}
          </Link>
        </>
      ) : null}
    </section>
  );
}
