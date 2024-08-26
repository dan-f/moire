/**
 * Messages passed to the `GranularNode.port`
 */
export interface Message {
  type: MessageType.UpdateSample;
  sample: Float32Array[];
}

export enum MessageType {
  UpdateSample = "UpdateSample",
}
