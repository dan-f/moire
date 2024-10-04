import { classes } from "./css";
import styles from "./Row.module.css";
import { type Size } from "./sizing";

interface Props {
  children: React.ReactNode;
  pad?: Size;
  gap?: Size;
}

export function Row(props: Props) {
  const { children, gap = "sm", pad = "sm" } = props;

  return (
    <div
      className={classes(
        styles.container,
        styles[`gap-${gap}`],
        styles[`pad-${pad}`],
      )}
    >
      {children}
    </div>
  );
}
