import styles from "./Column.module.css";
import { classes } from "./css";
import { type Size } from "./sizing";

interface Props {
  children: React.ReactNode;
  pad?: Size;
  gap?: Size;
}

export function Column(props: Props) {
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
