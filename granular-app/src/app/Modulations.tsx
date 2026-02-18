import { modulationGainParamKey } from "../synth";
import { type Modulation } from "../synth/modulation";
import { useSynth } from "./AppContext";
import { useObservableState } from "./hooks/observable";
import { i18n } from "./i18n";
import { Param } from "./Param";

export function Modulations() {
  const synth = useSynth();
  const modulations = Object.values(
    useObservableState(synth.modulations$, {}),
  ).sort((a, b) => a.id - b.id);

  return (
    <div>
      {modulations.map((modulation) => (
        <Modulation key={modulation.id} modulation={modulation} />
      ))}
      <div>
        <button onClick={() => synth.createModulation()}>
          + new modulation
        </button>
      </div>
    </div>
  );
}

function Modulation(props: { modulation: Modulation }) {
  const { modulation } = props;
  const synth = useSynth();
  const modSources = [...synth.modSources.values()].sort((a, b) =>
    lexicographicCmp(a.key, b.key),
  );
  const modTargets = [...synth.modulationTargets()].sort((a, b) =>
    lexicographicCmp(a.def.key, b.def.key),
  );
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
    <div>
      <select defaultValue={curModSourceKey} onChange={handleSelectSource}>
        <option value="" disabled>
          {i18n("SelectSource")}
        </option>
        {modSources.map((ms) => (
          <option key={ms.key} value={ms.key}>
            {ms.displayName}
          </option>
        ))}
      </select>
      <Param.Knob paramKey={modulationGainParamKey(modulation.id)} enabled />
      <select defaultValue={curModTargetKey} onChange={handleSelectTarget}>
        <option value="" disabled>
          {i18n("SelectTarget")}
        </option>
        {/* PROBLEM! we need a stream-specific display name here; otherwise we'll see "start" for multiple stream params */}
        {modTargets.map((mt) => (
          <option key={mt.def.key} value={mt.def.key}>
            {mt.def.display?.name ?? ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function lexicographicCmp(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase());
}
