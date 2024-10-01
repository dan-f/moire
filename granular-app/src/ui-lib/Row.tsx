import styles from "./Row.module.css";
import { type Size } from "./sizing";

interface Props {
  children: React.ReactNode;
  pad?: Size;
  gap?: Size;
}

export function Row(props: Props) {
  const { children, gap = "sm", pad = "sm" } = props;

  const classes = [
    styles.container,
    styles[`gap-${gap}`],
    styles[`pad-${pad}`],
  ].join(" ");

  return <div className={classes}>{children}</div>;
}
