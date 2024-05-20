/* eslint-disable class-methods-use-this */

import { DurableObject } from "cloudflare:workers";
import { WebMultiViewSync } from "@/sync";

type Sync = {
  SYNC: DurableObjectNamespace<WebMultiViewSync>;
  SESSION: DurableObjectNamespace<WebMultiViewSession>;
};

type User = {
  client: WebSocket;
  id: string;
  direction: "left" | "right";
  active: boolean;
};

type MoveAction = {
  action: "over";
  message: {
    x: number;
    y: number;
    dx: number;
    dy: number;
  };
};

type Data = { senderId: string } & (
  | {
      action: "start" | "stop";
    }
  | {
      action: "score";
      winner: "left" | "right";
    }
  | MoveAction
);

export class WebMultiViewSession extends DurableObject<Sync> {
  users = new Map<string, User>();

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    const id = url.searchParams.get("id");

    if (!id) {
      return new Response("Invalid id", {
        status: 400,
        statusText: "Bad Request",
      });
    }
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    const isOverTwoUsers = this.users.size > 2;

    if (isOverTwoUsers) {
      return new Response("Too many users", {
        status: 400,
        statusText: "Bad Request",
      });
    }

    const isFirstUser = this.users.size === 0;

    this.users.set(id, {
      client,
      id,
      direction: isFirstUser ? "left" : "right",
      active: isFirstUser,
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const data = JSON.parse(message.toString()) as Data;

    const sender = this.users.get(data.senderId);

    if (!sender) {
      ws.send("Invalid sender");

      return;
    }

    switch (data.action) {
      case "start":
        this.actionStart(ws);
        break;
      case "stop":
        this.actionStop(ws);
        break;
      case "score":
        this.actionScore(ws, data.winner);
        break;
      case "over":
        this.actionOver(ws, sender, data.message);
        break;
      default:
        ws.send("Invalid action");
        break;
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    ws.close(code, "Durable Object is closing WebSocket");
  }

  private actionStart(ws: WebSocket) {
    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      if (socket === ws) continue;
      socket.send(JSON.stringify({ action: "start" }));
    }
  }

  private actionStop(ws: WebSocket) {
    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      if (socket === ws) continue;
      socket.send(JSON.stringify({ action: "stop" }));
    }
  }

  private actionScore(ws: WebSocket, winner: "left" | "right") {
    const sockets = this.ctx.getWebSockets();

    for (const socket of sockets) {
      if (socket === ws) continue;
      socket.send(JSON.stringify({ action: "score", winner }));
    }
  }

  private actionOver(
    ws: WebSocket,
    sender: User,
    message: MoveAction["message"]
  ) {
    const sockets = this.ctx.getWebSockets();

    this.users.set(sender.id, {
      ...sender,
      active: false,
    });

    for (const socket of sockets) {
      if (socket === ws) continue;
      socket.send(JSON.stringify({ action: "over", message }));
    }
  }
}
