import { packModulationGainParamKey, type Modulation } from "../synth";
import { Param } from "./Param";

import { unpackStreamParam } from "../synth/granular";
import { Icon } from "../ui-lib/Icon";
import { IconButton } from "../ui-lib/IconButton";
import { Tooltipped } from "../ui-lib/Tooltipped";
import { useSynth } from "./AppContext";
import { i18n } from "./i18n";
import style from "./Modulation.module.css";

interface Props {
  stream: number;
  modulation: Modulation;
}

/*
  const modulations = Object.values(useObservableState(synth.modulations$, {}))
    .filter((m) => m.source.key.endsWith(`${stream}`))
    .sort((a, b) => a.id - b.id);
*/

export function Modulation(props: Props) {
  const { stream, modulation } = props;
  const synth = useSynth();
  const modSources = [...synth.modSources.values()]
    .filter((ms) => ms.key.endsWith(`${stream}`))
    .sort((a, b) => lexicographicCmp(a.key, b.key));
  const modTargets = [...synth.modulationTargets()]
    .filter((mt) => unpackStreamParam(mt.def.key)?.[0] === stream)
    .sort((a, b) => lexicographicCmp(a.def.key, b.def.key));
  const curModSourceKey = modulation.source?.key ?? "";
  const curModTargetKey = modulation.target?.def.key ?? "";

  const handleSelectSource: React.ChangeEventHandler<HTMLSelectElement> = (
    event,
  ) => {
    synth.setModulationSource(modulation.id, event.target.value);
  };

  const handleSelectTarget: React.ChangeEventHandler<HTMLSelectElement> = (
    event,
  ) => {
    synth.setModulationTarget(modulation.id, event.target.value);
  };

  return (
    <div className={style.container}>
      <Tooltipped className={style.remove} tooltip={i18n("RemoveModulation")}>
        <IconButton
          aria-label={i18n("RemoveModulation")}
          icon={<Icon name="close" size="sm" />}
          onClick={() => synth.removeModulation(modulation.id)}
        />
      </Tooltipped>
      <Param.Knob
        paramKey={packModulationGainParamKey(modulation.id)}
        enabled
      />
      <div className={style.label}>
        <select
          className={style.select}
          name={`stream_${stream}_mod_source_select`}
          defaultValue={curModSourceKey}
          onChange={handleSelectSource}
        >
          <option value="" disabled>
            {i18n("Source")}
          </option>
          {modSources.map((ms) => (
            <option key={ms.key} value={ms.key}>
              {ms.displayName}
            </option>
          ))}
        </select>
        <Icon name="pulse" size="sm" />
        <select
          className={style.select}
          name={`stream_${stream}_mod_target_select`}
          defaultValue={curModTargetKey}
          onChange={handleSelectTarget}
        >
          <option value="" disabled>
            {i18n("Target")}
          </option>
          {modTargets.map((mt) => (
            <option key={mt.def.key} value={mt.def.key}>
              {mt.def.display?.name ?? ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function lexicographicCmp(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase());
}
