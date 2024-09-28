import style from "./Bordered.module.css";

interface Props {
  children: React.ReactNode;
}

export function Bordered(props: Props) {
  return <div className={style.container}>{props.children}</div>;
}
