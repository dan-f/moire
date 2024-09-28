import style from "./GridLayout.module.css";

interface Props {
  children: React.ReactNode;
}

/**
 * Basic 12-column layout with dynamic rows
 */
export function GridLayout(props: Props) {
  return <div className={style.container}>{props.children}</div>;
}
