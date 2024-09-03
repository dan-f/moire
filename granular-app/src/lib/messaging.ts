/**
 * Services requests over a {@linkcode MessagePort}, responding via `handle`
 */
export function serve<ReqPayload, RspPayload>(
  port: MessagePort,
  handle: RequestHandler<ReqPayload, RspPayload>,
) {
  port.onmessage = async function messageHandler(
    msg: MessageEvent<MessageRequest<ReqPayload>>,
  ) {
    const req = msg.data;
    const response: MessageResponse<RspPayload> = {
      id: nextId(),
      inReplyTo: req.id,
      payload: await handle(req.payload),
    };
    port.postMessage(response);
  };
}

/**
 * Issues requests to a server created by {@linkcode serve}
 */
export class Client {
  private readonly port: MessagePort;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolvers: Map<number, (rsp: any) => void>;

  constructor(port: MessagePort) {
    this.port = port;
    this.resolvers = new Map();

    this.port.onmessage = (msg: MessageEvent<MessageResponse<unknown>>) => {
      const { inReplyTo, payload } = msg.data;
      this.resolvers.get(inReplyTo)?.(payload);
      this.resolvers.delete(inReplyTo);
    };
  }

  request<Req, Rsp>(payload: Req): Promise<Rsp> {
    const req: MessageRequest<Req> = {
      id: nextId(),
      payload,
    };
    const result = new Promise<Rsp>((resolve) => {
      this.resolvers.set(req.id, resolve);
    });
    this.port.postMessage(req);
    return result;
  }
}

let id = 1;
function nextId(): number {
  return id++;
}

interface MessageRequest<Payload> {
  id: number;
  payload: Payload;
}

interface MessageResponse<Payload> {
  id: number;
  inReplyTo: number;
  payload: Payload;
}

type RequestHandler<Req, Rsp> = (req: Req) => Promise<Rsp>;
