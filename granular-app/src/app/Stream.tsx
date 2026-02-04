import { Env, SynthParam } from "../synth";
import { StreamParams } from "../synth/granular";
import { Bordered } from "../ui-lib/Bordered";
import { Column } from "../ui-lib/Column";
import { Icon } from "../ui-lib/Icon";
import { IconButton } from "../ui-lib/IconButton";
import { classes } from "../ui-lib/css";
import { Param, useParamVal } from "./Param";
import style from "./Stream.module.css";
import { i18n } from "./i18n";

interface StreamProps {
  stream: number;
}

export function Stream(props: StreamProps) {
  const { stream } = props;
  const [enabled, setEnabled] = useParamVal({
    enabled: true,
    param: synthParam("enabled"),
  });
  const isEnabled = enabled === 1;

  function synthParam(key: StreamParams.Key): SynthParam.T {
    return SynthParam.packStreamParam(stream, key);
  }

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
            param={synthParam("subdivision")}
            label={i18n("subdivision")}
            enabled={isEnabled}
            range={[1, 100]}
          />
          <Param.Knob
            param={synthParam("grainStart")}
            label={i18n("start")}
            enabled={isEnabled}
          />
          <Param.Knob
            param={synthParam("grainSizeMs")}
            label={i18n("size")}
            enabled={isEnabled}
            range={[10, 500]}
          />
          <Param.Knob
            param={synthParam("gain")}
            label={i18n("gain")}
            enabled={isEnabled}
          />
          <Param.Discrete
            param={synthParam("tune")}
            label={i18n("tune")}
            enabled={isEnabled}
            range={[-24, 24]}
          />
          <Param.Knob
            param={synthParam("pan")}
            label={i18n("pan")}
            enabled={isEnabled}
          />
          <Param.Discrete
            param={synthParam("env")}
            label={i18n("env")}
            enabled={isEnabled}
            range={[Env.Min, Env.Max]}
          />
        </Column>
      </div>
    </Bordered>
  );
}
