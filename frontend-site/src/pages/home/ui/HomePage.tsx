import { HeroCta } from "../../../widgets/hero-cta/ui/HeroCta";
import { SiteFooter } from "../../../widgets/site-footer/ui/SiteFooter";
import { SiteHeader } from "../../../widgets/site-header/ui/SiteHeader";
import { runtimeConfig } from "../../../shared/config/runtime";
import { type SiteLocale } from "../../../shared/config/routes";
import { siteContent } from "../../../shared/i18n/siteContent";

type HomePageProps = {
  locale: SiteLocale;
};

export const HomePage = ({ locale }: HomePageProps) => {
  const copy = siteContent[locale];
  const benefitImages = [
    "the-ultimate-dating-card-1.webp",
    "the-ultimate-dating-card-2.webp",
    "the-ultimate-dating-card-3.webp",
  ];
  const howItWorksImages = [
    "how-it-works-card-1.webp",
    "how-it-works-card-2.webp",
    "how-it-works-card-3.webp",
  ];
  const howItWorksTitle = locale === "ru" ? "Как это выглядит" : "How it looks";
  const transformationTitle = locale === "ru" ? "До и после" : "Before and after";
  const transformationBody =
    locale === "ru"
      ? "Тот же dating flow, но без лишней тревоги, затянутых ответов и странных сообщений."
      : "The same dating flow, but with less anxiety, fewer awkward pauses, and better replies.";
  const easiestTitle = locale === "ru" ? "Быстрее понять, что писать" : "Know what to send faster";
  const easiestBody =
    locale === "ru"
      ? "Используй короткие подсказки, чтобы не зависать над каждым сообщением."
      : "Use short guidance so you do not freeze on every reply.";
  const darkSectionTitle =
    locale === "ru"
      ? "Твой чит-код для дейтинга"
      : "The dating cheat code you wish you had earlier";
  const howItWorksSteps =
    locale === "ru"
      ? [
          {
            index: "1",
            title: "Покажи переписку",
            body: "Выбери чат, где хочешь продвинуть общение быстрее и спокойнее.",
            bullets: ["Быстро загрузить", "Понятный интерфейс", "Подсказки сразу по делу"],
          },
          {
            index: "2",
            title: "Выбери цель",
            body: "Флирт, легкость, уверенность или быстрый переход к встрече.",
            bullets: ["Подстройка под контекст", "Подсказки под твой тон", "Без лишней сложности"],
          },
          {
            index: "3",
            title: "Получи сильный ответ",
            body: "Короткие и точные варианты ответа, чтобы не ломать голову над следующим сообщением.",
            bullets: ["Естественные формулировки", "Лучше темп общения", "Больше шансов дойти до свидания"],
          },
        ]
      : [
          {
            index: "1",
            title: "Drop in the chat",
            body: "Pick the conversation where you want better momentum and less awkwardness.",
            bullets: ["Quick upload", "Simple flow", "Advice right away"],
          },
          {
            index: "2",
            title: "Choose the vibe",
            body: "Playful, calm, confident, or more direct when you want to move things forward.",
            bullets: ["Fits the context", "Matches the tone", "No overcomplication"],
          },
          {
            index: "3",
            title: "Send a better reply",
            body: "Get short, natural responses that keep the conversation moving.",
            bullets: ["Natural wording", "Better pacing", "More real-date momentum"],
          },
        ];
  const statsTitle =
    locale === "ru"
      ? "Flirto Guru делает общение заметно проще"
      : "Flirto Guru makes dating chats feel easier";
  const statsLead =
    locale === "ru"
      ? "Чистая структура, сильные визуалы и понятные следующие шаги вместо перегруженных советов."
      : "Clear structure, strong visuals, and obvious next steps instead of overloaded advice.";
  const stats =
    locale === "ru"
      ? [
          { value: "98%", label: "быстрее находят первый сильный ответ" },
          { value: "90%", label: "чувствуют больше уверенности в переписке" },
          { value: "83%", label: "чаще доводят чат до реальной встречи" },
        ]
      : [
          { value: "98%", label: "find the first strong reply faster" },
          { value: "90%", label: "feel more confident in chats" },
          { value: "83%", label: "move conversations closer to real dates" },
        ];

  return (
    <div className="site-shell">
      <main className="site-main">
        <section className="site-hero-shell">
          <SiteHeader locale={locale} />
          <div className="site-container">
            <HeroCta locale={locale} />
          </div>
        </section>

        <div className="site-container">
          <section id={`about-${locale}`} className="intro-copy">
            <h2 className="intro-copy__title">
              {locale === "ru" ? "Без кринжа. Больше контроля в чате." : "Less cringe. Better control in the chat."}
            </h2>
            <p className="intro-copy__body">
              {locale === "ru"
                ? "Flirto Guru помогает быстрее понять, что писать, и не терять темп общения."
                : "Flirto Guru helps you know what to say next and keep the conversation moving."}
            </p>
          </section>

          <section className="ultimate-section">
            <h2 className="ultimate-section__title">{darkSectionTitle}</h2>
            <div className="page-section">
              {copy.benefits.items.map((item, index) => (
                <article
                  key={item.title}
                  className="page-card page-card--dark"
                  style={{ backgroundImage: `url(/flirtist-approved/images/${benefitImages[index]})` }}
                >
                  <div className="page-card__overlay">
                    <span className="page-card__kicker">{item.kicker}</span>
                    <h2 className="page-card__title">{item.title}</h2>
                    <p className="page-card__body">{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="how-it-works">
            <div className="how-it-works__heading">
              <h2 className="reviews-block__title">{locale === "ru" ? "Как это работает" : "How it works"}</h2>
            </div>
            <div className="how-it-works__steps-row">
              {howItWorksSteps.map((step, index) => (
                <article key={step.index} className="how-it-works__step-card">
                  <div className="how-it-works__step-card-image-wrap">
                    <img
                      className="how-it-works__step-card-image"
                      src={`/flirtist-approved/images/${howItWorksImages[index]}`}
                      alt={`${howItWorksTitle} ${index + 1}`}
                    />
                  </div>
                  <div className="how-it-works__step">
                    <span className="how-it-works__step-badge">{step.index}</span>
                    <h3 className="how-it-works__step-title">{step.title}</h3>
                  </div>
                  <p className="how-it-works__step-body">{step.body}</p>
                </article>
              ))}
            </div>
            <div className="how-it-works__cta-wrap">
              <a className="hero-cta__button" href={runtimeConfig.primaryLandingUrl}>
                {copy.hero.primaryCta}
              </a>
            </div>
          </section>

          <section id={`reviews-${locale}`} className="reviews-block">
            <div className="reviews-block__header">
              <h2 className="reviews-block__title">{statsTitle}</h2>
              <p className="reviews-block__lead">{statsLead}</p>
            </div>
            <div className="stats-grid">
              {stats.map((item, index) => (
                <article key={item.value} className={`stat-card stat-card--${index + 1}`}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
            <div className="reviews-block__grid">
              {copy.reviews.items.map((item) => (
                <article key={item} className="review-card">
                  <img
                    className="review-card__stars-image"
                    src="/flirtist-approved/images/review-stars.svg"
                    alt=""
                    aria-hidden="true"
                  />
                  <p className="review-card__text">{item}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="final-cta-block">
            <h2 className="final-cta-block__title">
              {locale === "ru" ? "Готов писать увереннее?" : "Ready to text with confidence?"}
            </h2>
            <p className="final-cta-block__body">
              {locale === "ru"
                ? "Попробуй Flirto Guru и получи подсказки для следующего сообщения."
                : "Try Flirto Guru and get guidance for your next message."}
            </p>
            <a className="hero-cta__button" href={runtimeConfig.primaryLandingUrl}>
              {copy.hero.primaryCta}
            </a>
          </section>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
};
