import { useRef } from "react";
import { i18n } from "../app/i18n";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import style from "./NumberInput.module.css";

interface Props
  extends Omit<React.ComponentProps<"input">, "type" | "className"> {
  id: string;
  label?: string;
}

export function NumberInput(props: Props) {
  const { id, disabled, label } = props;
  const ref = useRef<HTMLInputElement>(null);
  const [decrement, increment] = useDecrIncr(ref);

  return (
    <div className={style.container}>
      <div className={style.controls}>
        <IconButton
          className={style.iconButton}
          icon={<Icon name="arrowLeft" alt={i18n("Decrement")} />}
          disabled={disabled}
          onClick={decrement}
        />
        <input
          ref={ref}
          {...props}
          id={id}
          className={style.input}
          onFocus={() => ref.current?.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              ref.current?.blur();
            }
          }}
        />
        <IconButton
          icon={<Icon name="arrowRight" alt={i18n("Increment")} />}
          disabled={disabled}
          onClick={increment}
        />
      </div>
      {label && (
        <label htmlFor={id} className={style.label} id={id}>
          {label}
        </label>
      )}
    </div>
  );
}

function useDecrIncr(
  ref: React.RefObject<HTMLInputElement>,
): [decrement: () => void, increment: () => void] {
  function updateValue(update: (n: number) => number) {
    const input = ref.current;
    if (!input) {
      return;
    }

    // See https://stackoverflow.com/questions/23892547/what-is-the-best-way-to-trigger-change-or-input-event-in-react-js
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;

    nativeInputValueSetter!.call(
      input,
      update(parseInt(input.value)).toString(),
    );
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function decrement() {
    updateValue((n) => n - 1);
  }

  function increment() {
    updateValue((n) => n + 1);
  }

  return [decrement, increment];
}
