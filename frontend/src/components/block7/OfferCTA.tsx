type OfferCTAProps = {
  title: string;
  price: string;
  button: string;
  note: string;
  onPay: () => void;
};

export const OfferCTA = ({ title, price, button, note, onPay }: OfferCTAProps) => {
  return (
    <section className="block7-sale" aria-labelledby="block7-sale-title">
      <h2 className="block7-sale__title" id="block7-sale-title">
        {title}
      </h2>
      <p className="block7-sale__price">{price}</p>
      <button type="button" className="btn block7-sale__btn" onClick={onPay}>
        {button}
      </button>
      <p className="block7-sale__note">
        <small>{note}</small>
      </p>
    </section>
  );
};
