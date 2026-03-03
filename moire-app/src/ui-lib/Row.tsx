import { classes } from "./css";
import styles from "./Row.module.css";
import { type Size } from "./sizing";

interface Props {
  children: React.ReactNode;
  className?: string;
  padH?: Size;
  padV?: Size;
  gap?: Size;
}

export function Row(props: Props) {
  const { children, className, gap, padH, padV } = props;

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
