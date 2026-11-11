import { Router } from "express";
import { requireAuth } from "../../http/middleware/auth";
import { errorFactory } from "../../lib/errors";
import { sendSuccess } from "../../lib/respond";
import { getCatalog } from "./catalog.service";

export const catalogRouter = Router();

catalogRouter.get("/", requireAuth, async (req, res) => {
  if (!req.auth) throw errorFactory.unauthorized();
  const catalog = await getCatalog();
  sendSuccess(res, catalog, "Catalog loaded.");
});
