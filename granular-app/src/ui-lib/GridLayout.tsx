import style from "./GridLayout.module.css";

interface Props {
  children: React.ReactNode;
  columns: number;
}

/**
 * Basic 12-column layout with dynamic rows
 */
export function GridLayout(props: Props) {
  const { columns } = props;

  return (
    <div
      className={style.container}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {props.children}
    </div>
  );
}
