import { Router } from "express";
import { requireAuth } from "../../http/middleware/auth";
import { rateLimiter, validateBody } from "../../http/middleware/core";
import { errorFactory } from "../../lib/errors";
import { sendSuccess } from "../../lib/respond";
import { identityAdapterMode } from "../identity/identity.provider";
import { createApiKeySchema } from "../identity/identity.schema";
import { createApiKey, listApiKeys, revokeApiKey } from "./developer.service";

export const developerRouter = Router();

const keyLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 20,
  keyPrefix: "developer",
  message: "Too many developer requests. Please slow down.",
});

developerRouter.get("/status", requireAuth, (_req, res) => {
  const mode = identityAdapterMode();
  sendSuccess(
    res,
    {
      mode,
      live: mode === "HTTP",
      message:
        mode === "HTTP"
          ? "Requests are sent to the configured identity vendor."
          : "Requests run against the Paylane sandbox until vendor credentials are configured.",
    },
    "Identity provider status loaded.",
  );
});

developerRouter.get("/keys", requireAuth, async (req, res) => {
  if (!req.auth) throw errorFactory.unauthorized();
  const keys = await listApiKeys(req.auth.user.id);
  sendSuccess(res, { keys }, "API keys loaded.");
});

developerRouter.post(
  "/keys",
  keyLimiter,
  requireAuth,
  validateBody(createApiKeySchema),
  async (req, res) => {
    if (!req.auth) throw errorFactory.unauthorized();
    const apiKey = await createApiKey(req.auth.user.id, req.body);
    sendSuccess(
      res,
      { apiKey },
      "API key created. Copy it now — it will not be shown again.",
      { httpStatus: 201 },
    );
  },
);

developerRouter.delete("/keys/:id", keyLimiter, requireAuth, async (req, res) => {
  if (!req.auth) throw errorFactory.unauthorized();
  const apiKey = await revokeApiKey(req.auth.user.id, String(req.params.id));
  sendSuccess(res, { apiKey }, "API key revoked.");
});
