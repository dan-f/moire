import { classes } from "./css";
import style from "./PlainButton.module.css";

export function PlainButton(props: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={classes(style.button, props.className)}
    ></button>
  );
}
