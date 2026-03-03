import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Bordered } from "./Bordered";
import { classes } from "./css";
import style from "./Tooltipped.module.css";

interface Props {
  id: string;
  children: React.ReactNode;
  className?: string;
  tooltip: React.ReactNode;
  visible?: boolean;
}

export function Tooltipped(props: Props) {
  const { id, children, className, tooltip, visible } = props;
  const [isFocused, setIsFocused] = useState(false);
  const isVisible = typeof visible === "boolean" ? visible : isFocused;
  const anchorName = `--anchor-${id}`;

  const addFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  const removeFocus = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <div
      className={className}
      // @ts-expect-error 2353
      style={{ anchorName }}
    >
      <div
        onMouseEnter={addFocus}
        onMouseLeave={removeFocus}
        onFocus={addFocus}
        onBlur={removeFocus}
      >
        {children}
      </div>
      {createPortal(
        <Bordered
          className={classes(style.tooltip, isVisible && style.visible)}
          style={{
            // @ts-expect-error 2353
            positionAnchor: anchorName,
            bottom: "anchor(top)",
            justifySelf: "anchor-center",
          }}
        >
          {tooltip}
        </Bordered>,
        document.body,
      )}
    </div>
  );
}
