import style from "./Bordered.module.css";
import { classes } from "./css";

export function Bordered(props: React.ComponentProps<"div">) {
  return (
    <div className={classes(props.className, style.container)}>
      {props.children}
    </div>
  );
}
