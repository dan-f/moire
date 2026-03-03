import { classes } from "./css";
import { PlainButton } from "./PlainButton";

interface Props extends React.ComponentProps<"button"> {
  icon: React.ReactNode;
}

export function IconButton(props: Props) {
  const { icon, ...buttonProps } = props;
  return (
    <PlainButton {...buttonProps} className={classes(props.className)}>
      {icon}
    </PlainButton>
  );
}
