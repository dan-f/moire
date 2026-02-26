import style from "./Bordered.module.css";
import { classes } from "./css";

export function Bordered(props: React.ComponentProps<"div">) {
  return (
    <div {...props} className={classes(style.container, props.className)}>
      {props.children}
    </div>
  );
}
