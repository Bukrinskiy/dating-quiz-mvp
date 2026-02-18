import { type PropsWithChildren } from "react";

type QuizCardProps = PropsWithChildren<{ className?: string }>;

export const QuizCard = ({ className, children }: QuizCardProps) => {
  const classes = className ? `quiz-box ${className}` : "quiz-box";
  return <section className={classes}>{children}</section>;
};
