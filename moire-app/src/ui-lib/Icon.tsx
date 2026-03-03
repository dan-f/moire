import { classes } from "./css";
import style from "./Icon.module.css";
import { Icons } from "./Icons";

interface Props {
  name: keyof typeof Icons;
  size?: "sm" | "md";
  alt?: string;
}

export function Icon(props: Props) {
  const { name, size = "md", alt } = props;

  return (
    <img
      className={classes(style.icon, style[size])}
      src={Icons[name]}
      alt={alt}
    />
  );
}
