/* eslint-disable @typescript-eslint/no-namespace */
import { StreamParams } from "./params";

/**
 * Request payloads passed into the `GranularNode.port`
 */
export type Request = UpdateSample.Req | AddStream.Req | DeleteStream.Req;

/**
 * Response payloads returned from the `GranularNode.port`
 */
export type Response = UpdateSample.Rsp | AddStream.Rsp | DeleteStream.Rsp;

export enum ReqType {
  UpdateSample = "UpdateSample",
  AddStream = "AddStream",
  DeleteStream = "DeleteStream",
}

export enum RspType {
  SampleUpdated = "SampleUpdated",
  StreamAdded = "StreamAdded",
  StreamDeleted = "StreamDeleted",
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
    streamId?: number;
  }
}

export namespace DeleteStream {
  export interface Req extends BaseRequest {
    type: ReqType.DeleteStream;
    streamId: number;
  }
  export interface Rsp extends BaseResponse {
    type: RspType.StreamDeleted;
  }
}

interface BaseRequest {
  type: ReqType;
}

interface BaseResponse {
  type: RspType;
}
