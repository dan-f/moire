import style from "./Bordered.module.css";

export function Bordered(props: React.ComponentProps<"div">) {
  const className = props.className
    ? `${props.className} ${style.container}`
    : style.container;
  return <div className={className}>{props.children}</div>;
}
