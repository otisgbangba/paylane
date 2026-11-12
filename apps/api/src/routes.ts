import { Router } from "express";
import { sendSuccess } from "./lib/respond";
import { authRouter } from "./modules/auth/auth.routes";
import { walletRouter } from "./modules/wallet/wallet.routes";
import { catalogRouter } from "./modules/catalog/catalog.routes";
import { vtuRouter } from "./modules/vtu/vtu.routes";
import { transactionsRouter } from "./modules/transactions/transactions.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { webhookRouter } from "./modules/webhooks/webhook.routes";
import { identityRouter, verifyRouter } from "./modules/identity/identity.routes";
import { developerRouter } from "./modules/developer/developer.routes";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  sendSuccess(
    res,
    { name: "Paylane API", version: "v1", documentation: "/api-docs" },
    "Paylane API is running.",
  );
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/wallet", walletRouter);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/services", vtuRouter);
apiRouter.use("/identity", identityRouter);
apiRouter.use("/verify", verifyRouter);
apiRouter.use("/developer", developerRouter);
apiRouter.use("/transactions", transactionsRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/webhooks", webhookRouter);
