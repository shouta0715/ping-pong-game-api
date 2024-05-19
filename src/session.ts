/* eslint-disable class-methods-use-this */
import { DurableObject } from "cloudflare:workers";
import { WebMultiViewSync } from "@/sync";

type Sync = { SYNC: DurableObjectNamespace<WebMultiViewSync> };

export class WebMultiViewSession extends DurableObject<Sync> {
  async fetch(): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(__: WebSocket, _: ArrayBuffer | string) {
    const sockets = this.ctx.getWebSockets();

    for (const socket of sockets) {
      socket.send(JSON.stringify("hoge"));
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    ws.close(code, "Durable Object is closing WebSocket");
  }
}
