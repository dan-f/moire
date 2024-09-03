/* eslint-disable @typescript-eslint/no-namespace */
import { StreamId } from "./engine/Exports";
import { StreamParams } from "./StreamParams";

/**
 * Request payloads passed into the `GranularNode.port`
 */
export type Request = UpdateSample.Req | AddStream.Req;

/**
 * Response payloads returned from the `GranularNode.port`
 */
export type Response = UpdateSample.Rsp | AddStream.Rsp;

export enum ReqType {
  UpdateSample = "UpdateSample",
  AddStream = "AddStream",
}

export enum RspType {
  SampleUpdated = "SampleUpdated",
  StreamAdded = "StreamAdded",
}

export namespace UpdateSample {
  export interface Req extends BaseRequest {
    type: ReqType.UpdateSample;
    sample: Float32Array[];
  }
  export interface Rsp extends BaseResponse {
    type: RspType.SampleUpdated;
  }
}

export namespace AddStream {
  export interface Req extends BaseRequest {
    type: ReqType.AddStream;
    params: StreamParams;
  }
  export interface Rsp extends BaseResponse {
    type: RspType.StreamAdded;
    streamId: StreamId;
  }
}

interface BaseRequest {
  type: ReqType;
}

interface BaseResponse {
  type: RspType;
}
