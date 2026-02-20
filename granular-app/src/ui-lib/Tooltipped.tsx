import { useCallback, useState } from "react";
import { classes } from "./css";
import style from "./Tooltipped.module.css";

interface Props {
  children: React.ReactNode;
  className?: string;
  tooltip: React.ReactNode;
  visible?: boolean;
}

export function Tooltipped(props: Props) {
  const { children, className, tooltip, visible } = props;
  const [isFocused, setIsFocused] = useState(false);
  const isVisible = typeof visible === "boolean" ? visible : isFocused;

  const addFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  const removeFocus = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <div className={classes(style.container, className)}>
      <div
        onMouseEnter={addFocus}
        onMouseLeave={removeFocus}
        onFocus={addFocus}
        onBlur={removeFocus}
      >
        {children}
      </div>
      <div
        className={classes(
          style.tooltip,
          isVisible ? style.visible : style.hidden,
        )}
      >
        {tooltip}
      </div>
    </div>
  );
}
