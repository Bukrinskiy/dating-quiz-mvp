import type { AppMessages } from "../../features/i18n/messages";
import { CasesSlider } from "./CasesSlider";
import { OfferCTA } from "./OfferCTA";

type Block7SectionsProps = {
  copy: AppMessages["block7"];
  onPay: () => void;
};

export const Block7Sections = ({ copy, onPay }: Block7SectionsProps) => {
  return (
    <>
      <section className="block7-section block7-section--offer" aria-labelledby="block7-offer-title">
        <h1 className="block7__title block7__title--accent" id="block7-offer-title">
          {copy.offerTitle}
        </h1>
        <div className="block7-copy">
          <p>{copy.offerLead}</p>
        </div>
      </section>

      <section className="block7-section" aria-labelledby="block7-work-title">
        <h2 className="block7__title" id="block7-work-title">
          {copy.workTitle}
        </h2>
        <ol className="block7-steps">
          {copy.workSteps.map((step, index) => (
            <li key={step} className="block7-step">
              <div className="block7-step__badge" aria-hidden="true">
                {index + 1}
              </div>
              <div className="block7-step__content">
                <h3>{step}</h3>
              </div>
            </li>
          ))}
        </ol>
        <p className="block7__hint">{copy.workHint}</p>
      </section>

      <section className="block7-section" aria-labelledby="block7-compare-title">
        <h2 className="block7__title" id="block7-compare-title">
          {copy.compareTitle}
        </h2>
        <div className="block7-compare" aria-label="Chat format comparison">
          <article className="block7-compare__col block7-compare__col--muted">
            <h3 className="block7-compare__title">{copy.compareLeftTitle}</h3>
            <ul className="block7-list">
              {copy.compareLeftItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="block7-compare__col block7-compare__col--accent">
            <h3 className="block7-compare__title">{copy.compareRightTitle}</h3>
            <ul className="block7-list">
              {copy.compareRightItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="block7-section" aria-labelledby="block7-benefits-title">
        <h2 className="block7__title" id="block7-benefits-title">
          {copy.benefitsTitle}
        </h2>
        <ul className="block7-list">
          {copy.benefitsItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="block7__hint">
          {copy.benefitsHintLines[0]}
          <br />
          {copy.benefitsHintLines[1]}
        </p>
      </section>

      <section className="block7-section" aria-labelledby="block7-cases-title">
        <h2 className="block7__title" id="block7-cases-title">
          {copy.casesTitleLines[0]}
          <br />
          {copy.casesTitleLines[1]}
        </h2>
        <CasesSlider cases={copy.cases} />
      </section>

      <OfferCTA
        title={copy.saleTitle}
        price={copy.salePrice}
        button={copy.saleCta}
        note={copy.saleNote}
        onPay={onPay}
      />
    </>
  );
};
