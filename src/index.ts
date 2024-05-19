import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { SyncEnv } from "@/types/env";

const app = new Hono<SyncEnv>();

const sessionMiddleware = createMiddleware<SyncEnv>(async (c, next) => {
  const upgradeHeader = c.req.header("Upgrade");

  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return next();
  }

  const session = c.env.SESSION.idFromName("session");

  const stub = c.env.SESSION.get(session);

  c.set("session", stub);

  return next();
});

app.get("/", sessionMiddleware, async (c) => {
  return c.var.session.fetch(c.req.raw);
});

export { WebMultiViewSync } from "@/sync";
export { WebMultiViewSession } from "@/session";
export default app;
