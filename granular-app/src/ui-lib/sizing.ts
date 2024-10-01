import styles from "./sizing.module.css";

export const SizeVal = {
  xxs: styles.xxs,
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

export type Size = keyof typeof SizeVal;
