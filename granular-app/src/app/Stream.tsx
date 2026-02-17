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
            enabled={isEnabled}
          />
          <Param.Knob paramKey={synthParam("grainStart")} enabled={isEnabled} />
          <Param.Knob
            paramKey={synthParam("grainSizeMs")}
            enabled={isEnabled}
          />
          <Param.Knob
            paramKey={synthParam("grainProbability")}
            enabled={isEnabled}
          />
          <Param.Knob paramKey={synthParam("gain")} enabled={isEnabled} />
          <Param.Discrete paramKey={synthParam("tune")} enabled={isEnabled} />
          <Param.Knob paramKey={synthParam("pan")} enabled={isEnabled} />
          <Param.Discrete paramKey={synthParam("env")} enabled={isEnabled} />
        </Column>
      </div>
    </Bordered>
  );
}
