import style from "./IconButton.module.css";

interface Props extends React.ComponentProps<"button"> {
  icon: React.ReactNode;
}

export function IconButton(props: Props) {
  const { icon, ...buttonProps } = props;
  return (
    <button className={style.iconButton} {...buttonProps}>
      {icon}
    </button>
  );
}
