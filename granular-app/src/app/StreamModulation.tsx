import {
  packModulationGainParamKey,
  packStreamLfoFreqParamKey,
  packStreamRandFreqParamKey,
  type Modulation,
} from "../synth";
import { unpackStreamParam } from "../synth/granular";
import { Column } from "../ui-lib/Column";
import { useSynth } from "./AppContext";
import { useObservableState } from "./hooks/observable";
import { i18n } from "./i18n";
import { Param } from "./Param";

interface Props {
  stream: number;
}

export function StreamModulation(props: Props) {
  const { stream } = props;
  const synth = useSynth();
  const defaultSourceKey = `lfo${stream}`;
  const modulations = Object.values(useObservableState(synth.modulations$, {}))
    .filter((m) => m.source.key.endsWith(`${stream}`))
    .sort((a, b) => a.id - b.id);

  return (
    <Column gap="sm">
      <Column>
        <Param.Knob paramKey={packStreamLfoFreqParamKey(stream)} enabled />
        <Param.Knob paramKey={packStreamRandFreqParamKey(stream)} enabled />
      </Column>
      <Column>
        {modulations.map((modulation) => (
          <Modulation
            key={modulation.id}
            stream={stream}
            modulation={modulation}
          />
        ))}
      </Column>
      <Column>
        <button onClick={() => synth.createModulation(defaultSourceKey)}>
          + modulation
        </button>
      </Column>
    </Column>
  );
}

function Modulation(props: { stream: number; modulation: Modulation }) {
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
      <Param.Knob
        paramKey={packModulationGainParamKey(modulation.id)}
        enabled
      />
      <select defaultValue={curModTargetKey} onChange={handleSelectTarget}>
        <option value="" disabled>
          {i18n("SelectTarget")}
        </option>
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
