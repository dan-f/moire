import { classes } from "./css";
import { PlainButton } from "./PlainButton";

import style from "./TextButton.module.css";

export function TextButton(props: React.ComponentProps<"button">) {
  return (
    <PlainButton
      {...props}
      className={classes(props.className, style["text-button"])}
    ></PlainButton>
  );
}
