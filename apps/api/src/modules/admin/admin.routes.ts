import { Router } from "express";
import type { Request } from "express";
import { requireSection, requireSuperAdmin } from "../../http/middleware/auth";
import { rateLimiter, validateBody } from "../../http/middleware/core";
import { errorFactory } from "../../lib/errors";
import { sendSuccess } from "../../lib/respond";
import {
  adminTransactionQuerySchema,
  adminUserQuerySchema,
  createAdminSchema,
  setWalletStatusSchema,
  updateAdminSchema,
} from "./admin.schema";
import {
  createAdmin,
  getAdminOverview,
  listAdmins,
  listAuditEvents,
  listUsers,
  setWalletStatus,
  updateAdmin,
} from "./admin.service";
import { listAllTransactions } from "../transactions/transactions.service";
import {
  adminIdentityQuerySchema,
  updateIdentityProductSchema,
} from "../identity/identity.schema";
import {
  getIdentityOverview,
  listAllIdentityRequests,
  listIdentityProducts,
  updateIdentityProduct,
} from "../identity/identity.service";

export const adminRouter = Router();

const adminWriteLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 40,
  keyPrefix: "admin",
  message: "Too many administrative requests. Please slow down.",
});

function actor(req: Request) {
  if (!req.auth) throw errorFactory.unauthorized();
  return req.auth.user;
}

adminRouter.get("/overview", ...requireSection("OVERVIEW"), async (_req, res) => {
  const overview = await getAdminOverview();
  sendSuccess(res, { overview }, "Admin overview loaded.");
});

adminRouter.get("/users", ...requireSection("USERS"), async (req, res) => {
  const query = adminUserQuerySchema.parse(req.query);
  const users = await listUsers(query);
  sendSuccess(res, { users }, "Customers loaded.");
});

adminRouter.get("/wallets", ...requireSection("WALLETS"), async (req, res) => {
  const query = adminUserQuerySchema.parse(req.query);
  const users = await listUsers(query);
  sendSuccess(res, { users }, "Wallets loaded.");
});

adminRouter.patch(
  "/users/:id/wallet",
  ...requireSection("WALLETS"),
  validateBody(setWalletStatusSchema),
  async (req, res) => {
    const user = await setWalletStatus(
      actor(req),
      String(req.params.id),
      req.body.status,
      req,
    );
    sendSuccess(res, { user }, `Wallet ${req.body.status === "FROZEN" ? "frozen" : "restored"}.`);
  },
);

adminRouter.get("/transactions", ...requireSection("TRANSACTIONS"), async (req, res) => {
  const query = adminTransactionQuerySchema.parse(req.query);
  const { items, total } = await listAllTransactions(query);
  sendSuccess(res, {
    transactions: items,
    total,
    limit: query.limit,
    offset: query.offset,
  });
});

adminRouter.get("/audit", ...requireSection("AUDIT"), async (_req, res) => {
  const events = await listAuditEvents();
  sendSuccess(res, { events }, "Audit trail loaded.");
});

adminRouter.get("/verifications/overview", ...requireSection("VERIFICATIONS"), async (_req, res) => {
  const overview = await getIdentityOverview();
  sendSuccess(res, { overview }, "Identity overview loaded.");
});

adminRouter.get("/verifications/requests", ...requireSection("VERIFICATIONS"), async (req, res) => {
  const query = adminIdentityQuerySchema.parse(req.query);
  const requests = await listAllIdentityRequests(query);
  sendSuccess(res, { requests }, "Identity requests loaded.");
});

adminRouter.get("/verifications/products", ...requireSection("VERIFICATIONS"), async (_req, res) => {
  const products = await listIdentityProducts({ includeInactive: true });
  sendSuccess(res, { products }, "Identity products loaded.");
});

adminRouter.patch(
  "/verifications/products/:code",
  adminWriteLimiter,
  ...requireSection("VERIFICATIONS"),
  validateBody(updateIdentityProductSchema),
  async (req, res) => {
    const product = await updateIdentityProduct(
      actor(req),
      String(req.params.code),
      req.body,
      req,
    );
    sendSuccess(res, { product }, "Identity service updated.");
  },
);

adminRouter.get("/admins", ...requireSuperAdmin(), async (_req, res) => {
  const administrators = await listAdmins();
  sendSuccess(res, { administrators }, "Administrators loaded.");
});

adminRouter.post(
  "/admins",
  adminWriteLimiter,
  ...requireSuperAdmin(),
  validateBody(createAdminSchema),
  async (req, res) => {
    const administrator = await createAdmin(actor(req), req.body, req);
    sendSuccess(res, { administrator }, "Administrator created with scoped access.", {
      httpStatus: 201,
    });
  },
);

adminRouter.patch(
  "/admins/:id",
  adminWriteLimiter,
  ...requireSuperAdmin(),
  validateBody(updateAdminSchema),
  async (req, res) => {
    const administrator = await updateAdmin(
      actor(req),
      String(req.params.id),
      req.body,
      req,
    );
    sendSuccess(res, { administrator }, "Administrator access updated.");
  },
);
