import { useCallback, useState } from "react";
import { type ParamDef } from "../lib/param";
import {
  type ModulationSource,
  packStreamLfoFreqParamKey,
  packStreamParamKey,
  packStreamRandFreqParamKey,
  type StreamParamName,
  type SynthParamKey,
} from "../synth";
import { Bordered } from "../ui-lib/Bordered";
import { Column } from "../ui-lib/Column";
import { Icon } from "../ui-lib/Icon";
import { IconButton } from "../ui-lib/IconButton";
import { Row } from "../ui-lib/Row";
import { TextButton } from "../ui-lib/TextButton";
import { classes } from "../ui-lib/css";
import { useSynth } from "./AppContext";
import { Modulation } from "./Modulation";
import { Param, useParam } from "./Param";
import style from "./Stream.module.css";
import {
  useBehaviorSubjectState,
  useObservableState,
} from "./hooks/observable";
import { i18n } from "./i18n";

interface StreamProps {
  stream: number;
}

export function Stream(props: StreamProps) {
  const { stream } = props;

  const synth = useSynth();
  const synthParam = useCallback(
    (key: StreamParamName): SynthParamKey => packStreamParamKey(stream, key),
    [stream],
  );
  const [[enabled$, setEnabled]] = useParam({
    paramKey: synthParam("enabled"),
    enabled: true,
  });
  const enabled = useBehaviorSubjectState(enabled$);
  const modulations = Object.values(useObservableState(synth.modulations$, {}))
    .filter((m) => m.source.key.endsWith(`${stream}`))
    .sort((a, b) => a.id - b.id);
  const [modSource, setModSource] = useState<ModulationSource["key"]>();
  const isEnabled = enabled === 1;

  const toggleEnabled = () => {
    setEnabled((enabled) => {
      if (enabled) {
        setModSource(undefined);
        return 0;
      }
      return 1;
    });
  };

  const handleAssignMod = (paramKey: ParamDef["key"]) => {
    if (!modSource) {
      return;
    }
    synth.createModulation(modSource, paramKey);
    setModSource(undefined);
  };

  const containerClasses = classes(
    style.container,
    style[`stream${stream}`],
    !enabled ? style.disabled : undefined,
  );

  return (
    <div>
      <Bordered>
        <div className={containerClasses}>
          <Column padV="sm" gap="xs">
            <IconButton
              icon={<Icon name="power" />}
              aria-label={i18n(enabled ? "DisableStream" : "EnableStream")}
              onClick={() => toggleEnabled()}
            />
            <Param.Discrete
              paramKey={synthParam("subdivision")}
              enabled={isEnabled && !modSource}
            />
            <Row>
              <Param.Discrete
                paramKey={synthParam("env")}
                enabled={isEnabled && !modSource}
              />
              <Param.Discrete
                paramKey={synthParam("tune")}
                enabled={isEnabled && !modSource}
              />
            </Row>
            <Param.Knob
              paramKey={synthParam("pan")}
              enabled={isEnabled}
              {...(modSource && {
                modulation: { source: modSource, onAssign: handleAssignMod },
              })}
            />
            <Row>
              <Param.Knob
                paramKey={synthParam("grainStart")}
                enabled={isEnabled}
                {...(modSource && {
                  modulation: { source: modSource, onAssign: handleAssignMod },
                })}
              />
              <Param.Knob
                paramKey={synthParam("grainSizeMs")}
                enabled={isEnabled}
                {...(modSource && {
                  modulation: { source: modSource, onAssign: handleAssignMod },
                })}
              />
            </Row>
            <Row>
              <Param.Knob
                paramKey={synthParam("grainProbability")}
                enabled={isEnabled}
                {...(modSource && {
                  modulation: { source: modSource, onAssign: handleAssignMod },
                })}
              />
              <Param.Knob
                paramKey={synthParam("gain")}
                enabled={isEnabled}
                {...(modSource && {
                  modulation: { source: modSource, onAssign: handleAssignMod },
                })}
              />
            </Row>
          </Column>
        </div>
      </Bordered>
      <Row className={style["modulation-sources"]} padV="sm">
        <ModulationSource
          stream={stream}
          source="lfo"
          modSource={modSource}
          onChangeModSource={setModSource}
        />
        <ModulationSource
          stream={stream}
          source="rand"
          modSource={modSource}
          onChangeModSource={setModSource}
        />
      </Row>
      <Column className={style["modulations"]} padV="sm" gap="xs">
        {modulations.map((m) => (
          <div key={m.id} className={style.modulation}>
            <Modulation stream={stream} modulation={m} />
          </div>
        ))}
      </Column>
    </div>
  );
}

function ModulationSource(props: {
  stream: number;
  source: "lfo" | "rand";
  modSource: ModulationSource["key"] | undefined;
  onChangeModSource: (sourceKey: string | undefined) => void;
}) {
  const { stream, source, modSource, onChangeModSource } = props;
  const sourceKey = `${source}${stream}`;
  const paramKey = (
    source === "lfo" ? packStreamLfoFreqParamKey : packStreamRandFreqParamKey
  )(stream);

  const handleClickAssignOrCancel = () => {
    if (modSource === sourceKey) {
      onChangeModSource(undefined);
    } else {
      onChangeModSource(sourceKey);
    }
  };

  return (
    <div className={style["modulation-source"]}>
      <Param.Knob paramKey={paramKey} enabled />
      <TextButton onClick={handleClickAssignOrCancel}>
        {modSource === sourceKey ? "cancel" : "assign"}
      </TextButton>
    </div>
  );
}
