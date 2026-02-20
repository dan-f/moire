import styles from "./Column.module.css";
import { classes } from "./css";
import { type Size } from "./sizing";

interface Props {
  className?: string;
  children: React.ReactNode;
  padH?: Size;
  padV?: Size;
  gap?: Size;
}

export function Column(props: Props) {
  const { className, children, gap, padH, padV } = props;

  return (
    <div
      className={classes(
        styles.container,
        gap && styles[`gap-${gap}`],
        padH && styles[`padH-${padH}`],
        padV && styles[`padV-${padV}`],
        className,
      )}
    >
      {children}
    </div>
  );
}
