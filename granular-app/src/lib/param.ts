/**
 * Metadata for creating and configuring webaudio parameters
 */
export interface ParamDef {
  key: string;
  value: {
    range: [min: number, max: number];
    default: number;
  };
  display?: {
    name: string;
    format?(val: number): string;
  };
}

/**
 * Webaudio parameter with accompanying metadata and optional modulation support
 */
export interface Param {
  def: ParamDef;
  manual: AudioParam;
  mod?: {
    target: AudioParam;
    output: AudioNode;
  };
}
