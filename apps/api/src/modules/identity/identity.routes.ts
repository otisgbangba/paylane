import { Router, type Request, type Response } from "express";
import { IDENTITY_SERVICES } from "@paylane/shared";
import { requireAuth } from "../../http/middleware/auth";
import { rateLimiter, validateBody } from "../../http/middleware/core";
import { errorFactory } from "../../lib/errors";
import { requireIdempotencyKey } from "../../lib/idempotency";
import { sendFailure, sendSuccess } from "../../lib/respond";
import { authenticateApiKey } from "../developer/developer.service";
import {
  apiIdentityRequestSchema,
  identityRequestSchema,
} from "./identity.schema";
import {
  createIdentityRequest,
  getMyIdentityRequest,
  listIdentityProducts,
  listMyIdentityRequests,
  type IdentityOutcome,
} from "./identity.service";
import { identityAdapterMode } from "./identity.provider";

export const identityRouter = Router();
export const verifyRouter = Router();

const identityLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 30,
  keyPrefix: "identity",
  message: "You are sending identity requests too quickly. Please wait a moment.",
});

function respondWithIdentity(res: Response, outcome: IdentityOutcome): void {
  if (outcome.replay) res.setHeader("Idempotent-Replay", "true");

  const data = {
    request: outcome.request,
    transaction: outcome.transaction,
    wallet: outcome.wallet,
    replay: outcome.replay,
  };

  if (outcome.kind === "failed") {
    sendFailure(res, 422, "PROVIDER_REJECTED", outcome.message, undefined, data);
    return;
  }

  sendSuccess(res, data, outcome.message);
}

/* ── Catalog (public) ────────────────────────────────────────────────────── */

identityRouter.get("/products", async (_req, res) => {
  const products = await listIdentityProducts();
  sendSuccess(res, { products, mode: identityAdapterMode() }, "Identity services loaded.");
});

/* ── Session checkout ────────────────────────────────────────────────────── */

identityRouter.post(
  "/requests",
  identityLimiter,
  requireAuth,
  validateBody(identityRequestSchema),
  async (req, res) => {
    if (!req.auth) throw errorFactory.unauthorized();
    const outcome = await createIdentityRequest(req.auth.user, req.body, {
      idempotencyKey: requireIdempotencyKey(req),
      requirePin: true,
    });
    respondWithIdentity(res, outcome);
  },
);

identityRouter.get("/requests", requireAuth, async (req, res) => {
  if (!req.auth) throw errorFactory.unauthorized();
  const requests = await listMyIdentityRequests(req.auth.user.id);
  sendSuccess(res, { requests }, "Identity requests loaded.");
});

identityRouter.get("/requests/:reference", requireAuth, async (req, res) => {
  if (!req.auth) throw errorFactory.unauthorized();
  const request = await getMyIdentityRequest(req.auth.user.id, String(req.params.reference));
  sendSuccess(res, { request }, "Identity request loaded.");
});

/* ── Public API (bearer key) ─────────────────────────────────────────────── */

async function requireApiKey(
  req: Request,
  _res: Response,
  next: (error?: unknown) => void,
): Promise<void> {
  try {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
      throw errorFactory.unauthorized(
        "Send your API key as: Authorization: Bearer plk_live_…",
      );
    }
    const auth = await authenticateApiKey(token);
    if (!auth) {
      throw errorFactory.unauthorized("That API key is invalid, revoked or unavailable.");
    }
    req.apiKeyAuth = auth;
    next();
  } catch (error) {
    next(error);
  }
}

verifyRouter.post(
  "/:service",
  identityLimiter,
  requireApiKey,
  async (req, res) => {
    if (!req.apiKeyAuth) throw errorFactory.unauthorized();

    const requested = String(req.params.service).trim();
    const definition = IDENTITY_SERVICES.find(
      (service) => service.id === requested || service.code === requested,
    );
    if (!definition) throw errorFactory.notFound("Unknown verification service.");

    const body = apiIdentityRequestSchema.parse(req.body);
    const outcome = await createIdentityRequest(
      req.apiKeyAuth.user,
      { ...body, service: definition.id },
      {
        idempotencyKey: requireIdempotencyKey(req),
        apiKeyId: req.apiKeyAuth.apiKey.id,
        requirePin: false,
      },
    );

    if (outcome.replay) res.setHeader("Idempotent-Replay", "true");
    if (outcome.kind === "failed") {
      sendFailure(res, 422, "PROVIDER_REJECTED", outcome.message, undefined, {
        request: outcome.request,
        transaction: outcome.transaction,
        wallet: outcome.wallet,
      });
      return;
    }

    sendSuccess(
      res,
      {
        request: outcome.request,
        transaction: outcome.transaction,
        wallet: outcome.wallet,
        replay: outcome.replay,
      },
      outcome.message,
    );
  },
);

/** Discovery endpoint for API consumers, no key required. */
verifyRouter.get("/", (_req, res) => {
  sendSuccess(
    res,
    {
      services: IDENTITY_SERVICES.map((service) => ({
        id: service.id,
        code: service.code,
        name: service.name,
        priceKobo: service.priceKobo,
        category: service.category,
        fields: service.fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
        })),
      })),
      authentication: "Authorization: Bearer plk_live_…",
      idempotency: "Idempotency-Key header (8–120 characters)",
    },
    "Identity API is running.",
  );
});
