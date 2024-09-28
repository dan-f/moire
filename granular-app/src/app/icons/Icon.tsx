import style from "./Icon.module.css";

interface Props {
  url: string;
  alt?: string;
}

export function Icon(props: Props) {
  const { url, alt } = props;

  return <img className={style.icon} src={url} alt={alt} />;
}
