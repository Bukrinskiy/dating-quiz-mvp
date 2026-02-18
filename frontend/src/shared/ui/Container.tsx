import { type PropsWithChildren } from "react";

type ContainerProps = PropsWithChildren<{ className?: string }>;

export const Container = ({ className, children }: ContainerProps) => {
  const classes = className ? `container ${className}` : "container";
  return <main className={classes}>{children}</main>;
};
