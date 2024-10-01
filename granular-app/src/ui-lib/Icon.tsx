import style from "./Icon.module.css";
import { Icons } from "./Icons";

interface Props {
  name: keyof typeof Icons;
  alt?: string;
}

export function Icon(props: Props) {
  const { name, alt } = props;

  return <img className={style.icon} src={Icons[name]} alt={alt} />;
}
