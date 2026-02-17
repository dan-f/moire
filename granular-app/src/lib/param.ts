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
 * Modulatable webaudio parameter subgraph
 */
export interface ParamModule {
  /**
   * User endpoint for manual tweaking
   */
  manualTarget: AudioParam;
  /**
   * Modulation endpoints for automation
   */
  modulation?: {
    /**
     * Specifies the modulation amplitude pre-attenuation
     */
    target: AudioParam;
    /**
     * Attenuates the modulation amplitude
     */
    gain: AudioParam;
  };
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
