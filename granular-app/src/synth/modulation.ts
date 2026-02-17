export interface Modulation {
  source: ModSource;
  destination: ModDestination;
}

export interface ModSource {
  displayName: string;
  node: AudioNode;
}

export interface ModDestination {
  displayName: string;
  node: GainNode;
}
