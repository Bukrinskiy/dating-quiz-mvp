import { Progress } from "@radix-ui/themes";

type FunnelProgressProps = {
  currentBlock: number;
  totalBlocks?: number;
};

export const FunnelProgress = ({ currentBlock, totalBlocks = 7 }: FunnelProgressProps) => {
  const clamped = Math.max(1, Math.min(totalBlocks, currentBlock));
  const value = (clamped / totalBlocks) * 100;

  return (
    <div className="funnel-progress" aria-label={`Block ${clamped} of ${totalBlocks}`}>
      <div className="funnel-progress__meta">
        <span>Progress</span>
        <span>{clamped}/{totalBlocks}</span>
      </div>
      <Progress value={value} size="2" radius="full" color="blue" />
    </div>
  );
};
