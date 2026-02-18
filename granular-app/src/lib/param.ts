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
 * Modulatable webaudio parameter subgraph. The `output` value is produced by
 * summing the incoming manual signal with any incoming modulation signal. The
 * modulation signal should be normalized to a maximum of `[-1, 1]`, as it will
 * be internally scaled to effect the full range of the target parameter.
 */
export interface ParamModule {
  /**
   * Endpoint for manual tweaking
   */
  manualTarget: AudioParam;
  /**
   * Endpoint for modulation amplitude. Full effect is in the `[-1, 1]` range.
   */
  modulationTarget?: AudioParam;
  /**
   * Outgoing parameter value
   */
  output: AudioNode;
}

/**
 * Live parameter representation for app consumption
 */
export interface Param {
  def: ParamDef;
  module: Omit<ParamModule, "output">;
}
