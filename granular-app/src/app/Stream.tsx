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
  const [[enabled, setEnabled]] = useParam({
    paramKey: synthParam("enabled"),
    enabled: true,
  });
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
            enabled={isEnabled}
          />
          <Param.Knob
            paramKey={synthParam("grainSizeMs")}
            label={i18n("size")}
            enabled={isEnabled}
          />
          <Param.Knob
            paramKey={synthParam("grainProbability")}
            label={i18n("probability")}
            enabled={isEnabled}
          />
          <Param.Knob
            paramKey={synthParam("gain")}
            label={i18n("gain")}
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
