import { type ParamDef } from "../../lib/param";
import { ModulationSource } from "../../synth";
import { Icon } from "../../ui-lib/Icon";
import { IconButton } from "../../ui-lib/IconButton";
import { Knob } from "../../ui-lib/Knob";
import { Tooltipped } from "../../ui-lib/Tooltipped";
import { i18n } from "../i18n";
import { type ParamProps } from "./ParamProps";
import { useParam } from "./hooks";

interface Props extends ParamProps {
  modulation?: {
    source: ModulationSource["key"];
    onAssign: (paramKey: ParamDef["key"]) => void;
  };
}

export function KnobParam(props: Props) {
  const { enabled, paramKey, modulation: mod } = props;
  const [[val$, set], paramDef] = useParam(props);

  return (
    <div style={{ position: "relative" }}>
      {!!mod?.source && (
        <Tooltipped
          id={`add-mod-${mod.source}`}
          tooltip={i18n("AssignModulation")}
        >
          <IconButton
            style={{
              position: "absolute",
              padding: "unset",
              right: "-0.125rem",
              top: "-0.125rem",
            }}
            icon={<Icon name="add" size="sm" />}
            aria-label={i18n("AssignModulation")}
            onClick={() => mod.onAssign(paramDef.key)}
          />
        </Tooltipped>
      )}
      <Knob
        val$={val$}
        setVal={set}
        range={paramDef.value.range}
        defaultVal={paramDef.value.default}
        id={paramKey}
        size="2rem"
        label={paramDef.display?.name}
        formatValue={paramDef.display?.format}
        disabled={!enabled}
      />
    </div>
  );
}
