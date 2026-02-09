type ProgressBarProps = {
  stepLabel: string;
  current?: number;
  total?: number;
};

export default function ProgressBar({ stepLabel, current, total }: ProgressBarProps) {
  const progressPercent = current && total ? Math.round((current / total) * 100) : 0;

  return (
    <section className="mb-8 space-y-3">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">{stepLabel}</p>
      {current && total ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      ) : null}
    </section>
  );
}
