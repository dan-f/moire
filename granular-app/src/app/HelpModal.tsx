import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { TextButton } from "../ui-lib/TextButton";
import style from "./HelpModal.module.css";
import { i18n } from "./i18n";

export interface HelpModalRef {
  open: () => void;
  close: () => void;
}

export const HelpModal = forwardRef<HelpModalRef, object>((_, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => dialogRef.current?.showModal(), []);
  const close = useCallback(() => dialogRef.current?.requestClose(), []);

  useImperativeHandle(ref, () => ({ open, close }), [close, open]);

  return (
    <dialog className={style.dialog} ref={dialogRef}>
      <TextButton className={style["close-btn"]} onClick={close}>
        {i18n("Close")}
      </TextButton>
      <p>{import.meta.env.VITE_PROJECT_NAME} is a granular synthesizer.</p>
      <p>
        Start by <span className={style.em}>choosing an audio sample</span>.
        Play the synthesizer with the computer keyboard: white keys beginning
        with C4 are on the home row, with black keys on the row above.
      </p>
      <p>
        Enable additional playback streams by toggling them on. Each stream
        contributes grains at an adjustable rhythmic{" "}
        <span className={style.em}>division</span> of the main clock, which
        itself can be adjusted via <span className={style.em}>tempo</span>.
      </p>
      <p>
        Stream parameters can be manually adjusted and automated with per-stream
        modulation sources. Set up automation by selecting{" "}
        <span className={style.em}>assign</span> next to a modulation source,
        and then select a compatible parameter&apos;s target.
      </p>
    </dialog>
  );
});

HelpModal.displayName = "HelpModal";
