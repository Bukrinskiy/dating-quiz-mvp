type OfferCTAProps = {
  title: string;
  button: string;
  onPay: () => void;
};

export const OfferCTA = ({ title, button, onPay }: OfferCTAProps) => {
  return (
    <section className="block7-sale" aria-labelledby="block7-sale-title">
      <h2 className="block7-sale__title" id="block7-sale-title">
        {title}
      </h2>
      <button type="button" className="btn block7-sale__btn" onClick={onPay}>
        {button}
      </button>
    </section>
  );
};
