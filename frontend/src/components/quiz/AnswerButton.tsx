type AnswerButtonProps = {
  text: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export const AnswerButton = ({ text, selected, disabled, onClick }: AnswerButtonProps) => {
  return (
    <button
      type="button"
      className={selected ? "is-selected" : ""}
      disabled={disabled}
      onClick={onClick}
      data-answer
    >
      {text}
    </button>
  );
};
