/* eslint-disable @typescript-eslint/no-namespace */

/**
 * Request payloads passed into the `GranularNode.port`
 */
export type Request = UpdateSample.Req;

/**
 * Response payloads returned from the `GranularNode.port`
 */
export type Response = UpdateSample.Rsp;

export enum ReqType {
  UpdateSample = "UpdateSample",
}

export enum RspType {
  SampleUpdated = "SampleUpdated",
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

interface BaseRequest {
  type: ReqType;
}

interface BaseResponse {
  type: RspType;
}
