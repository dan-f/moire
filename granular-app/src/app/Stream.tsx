import { useCallback } from "react";
import {
  packStreamParam,
  type StreamParamName,
  type SynthParamKey,
} from "../synth";
import { Bordered } from "../ui-lib/Bordered";
import { Column } from "../ui-lib/Column";
import { Icon } from "../ui-lib/Icon";
import { IconButton } from "../ui-lib/IconButton";
import { classes } from "../ui-lib/css";
import { percent, unit, ValueFormatter } from "../ui-lib/format";
import { Param, useParam } from "./Param";
import style from "./Stream.module.css";
import { useBehaviorSubjectState } from "./hooks/observable";
import { i18n } from "./i18n";

interface StreamProps {
  stream: number;
}

export function Stream(props: StreamProps) {
  const { stream } = props;
  const synthParam = useCallback(
    (key: StreamParamName): SynthParamKey => packStreamParam(stream, key),
    [stream],
  );
  const [[enabled$, setEnabled]] = useParam({
    paramKey: synthParam("enabled"),
    enabled: true,
  });
  const enabled = useBehaviorSubjectState(enabled$);
  const isEnabled = enabled === 1;

  const containerClasses = classes(
    style.container,
    style[`stream${stream}`],
    !enabled ? style.disabled : undefined,
  );

  return (
    <Bordered>
      <div className={containerClasses}>
        <Column>
          <IconButton
            icon={
              <Icon
                name="power"
                alt={i18n(enabled ? "DisableStream" : "EnableStream")}
              />
            }
            onClick={() => setEnabled((enabled) => (enabled === 0 ? 1 : 0))}
          />
          <Param.Discrete
            paramKey={synthParam("subdivision")}
            label={i18n("subdivision")}
            enabled={isEnabled}
          />
          <Param.Knob
            paramKey={synthParam("grainStart")}
            label={i18n("start")}
            formatValue={percent()}
            enabled={isEnabled}
          />
          <Param.Knob
            paramKey={synthParam("grainSizeMs")}
            label={i18n("size")}
            formatValue={unit(i18n("Milliseconds"))}
            enabled={isEnabled}
          />
          <Param.Knob
            paramKey={synthParam("grainProbability")}
            label={i18n("probability")}
            formatValue={percent()}
            enabled={isEnabled}
          />
          <Param.Knob
            paramKey={synthParam("gain")}
            label={i18n("gain")}
            formatValue={percent()}
            enabled={isEnabled}
          />
          <Param.Discrete
            paramKey={synthParam("tune")}
            label={i18n("tune")}
            enabled={isEnabled}
          />
          <Param.Knob
            paramKey={synthParam("pan")}
            label={i18n("pan")}
            formatValue={formatPan}
            enabled={isEnabled}
          />
          <Param.Discrete
            paramKey={synthParam("env")}
            label={i18n("env")}
            enabled={isEnabled}
          />
        </Column>
      </div>
    </Bordered>
  );
}

const formatPan: ValueFormatter = (value) => {
  if (value === 0.5) {
    return i18n("Center");
  }
  if (value < 0.5) {
    return `${percent([0.5, 0])(value)} ${i18n("Left")}`;
  }
  return `${percent([0.5, 1])(value)} ${i18n("Right")}`;
};
