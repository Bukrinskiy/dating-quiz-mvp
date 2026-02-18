import { Progress } from "@radix-ui/themes";

type QuestionProgressProps = {
  label: string;
  current: number;
  total: number;
};

export const QuestionProgress = ({ label, current, total }: QuestionProgressProps) => {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.max(1, Math.min(safeTotal, current));
  const value = (safeCurrent / safeTotal) * 100;

  return (
    <div className="question-progress" aria-label={`${label} ${safeCurrent} ${safeTotal}`}>
      <div className="question-progress__meta">
        <span>{label}</span>
        <span>
          {safeCurrent}/{safeTotal}
        </span>
      </div>
      <Progress value={value} size="2" radius="full" color="blue" />
    </div>
  );
};
