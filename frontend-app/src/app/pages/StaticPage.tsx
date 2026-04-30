import { Link } from "react-router-dom";

import { appCopy } from "../copy";
import { PrototypeIcon } from "../ui/icons";

type StaticPageKind = keyof typeof appCopy.staticPages;

type StaticPageProps = {
  kind: StaticPageKind;
};

export function StaticPage({ kind }: StaticPageProps) {
  const page = appCopy.staticPages[kind];

  return (
    <section className="stack-page">
      <div className="page-heading">
        <h1>{page.title}</h1>
      </div>
      <div className="settings-card">
        {page.cards.map((card) => (
          <div className="settings-row settings-row--static settings-row--tall" key={card.title}>
            <span className="settings-row__icon">
              {card.title === "Добавь контекст" ? (
                <PrototypeIcon.emptyChat color="currentColor" height={22} width={22} />
              ) : card.title === "Нажми «Готово»" ? (
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
          <div className="section-label">Что ты получишь</div>
          <div className="settings-card">
            <div className="settings-row settings-row--static settings-row--tall">
              <span className="settings-row__main">
                <strong>Разбор ситуации</strong>
                <span>Что происходит и где сейчас главный рычаг</span>
              </span>
            </div>
            <div className="settings-row settings-row--static settings-row--tall">
              <span className="settings-row__main">
                <strong>План действий</strong>
                <span>Что сделать в ближайшие 24 часа, если она ответит и если нет</span>
              </span>
            </div>
            <div className="settings-row settings-row--static settings-row--tall">
              <span className="settings-row__main">
                <strong>Текст сообщения</strong>
                <span>Готовый вариант, который можно отправить или чуть адаптировать</span>
              </span>
            </div>
          </div>
          <Link className="button button--secondary button--lg button--full" to="/app/support">
            {appCopy.session.support}
          </Link>
        </>
      ) : null}
    </section>
  );
}
