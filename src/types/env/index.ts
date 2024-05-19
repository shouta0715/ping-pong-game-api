import { Context } from "hono";

import { WebMultiViewSession } from "@/session";
import { WebMultiViewSync } from "@/sync";

export type SyncEnv = {
  Bindings: {
    SYNC: DurableObjectNamespace<WebMultiViewSync>;
    SESSION: DurableObjectNamespace<WebMultiViewSession>;
  };
  Variables: {
    session: DurableObjectStub<WebMultiViewSession>;
  };
};

export type SyncContext = Context<SyncEnv>;
