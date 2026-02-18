import { Link } from "react-router-dom";

type QuizContinueProps = {
  to: string;
  visible: boolean;
  label: string;
  onClick: () => void;
};

export const QuizContinue = ({ to, visible, label, onClick }: QuizContinueProps) => {
  return (
    <Link className={`btn ${visible ? "" : "hidden"}`} to={to} onClick={onClick} data-block-complete>
      {label}
    </Link>
  );
};
