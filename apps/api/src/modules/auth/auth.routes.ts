import { Router } from "express";
import { buildUserDTO } from "../../lib/accounts";
import { AppError } from "../../lib/errors";
import { sendSuccess } from "../../lib/respond";
import {
  clearSessionCookie,
  setSessionCookie,
} from "../../lib/security";
import { rateLimiter, validateBody } from "../../http/middleware/core";
import { requireAuth } from "../../http/middleware/auth";
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  setPinSchema,
} from "./auth.schema";
import {
  changePassword,
  loginUser,
  registerUser,
  setTransactionPin,
  updateProfile,
} from "./auth.service";

export const authRouter = Router();

const authLimiter = rateLimiter({
  windowMs: 15 * 60_000,
  limit: 30,
  keyPrefix: "auth",
  message: "Too many sign-in attempts. Please wait a few minutes and try again.",
});

authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  async (req, res) => {
    const result = await registerUser(req.body);
    setSessionCookie(res, result.token);
    sendSuccess(res, result, "Your Paylane account is ready.", { httpStatus: 201 });
  },
);

authRouter.post("/login", authLimiter, validateBody(loginSchema), async (req, res) => {
  const result = await loginUser(req.body);
  setSessionCookie(res, result.token);
  sendSuccess(res, result, "Welcome back.");
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  sendSuccess(res, null, "You have been signed out.");
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const auth = req.auth;
  if (!auth) throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
  const user = await buildUserDTO(auth.user, auth.sections);
  sendSuccess(res, { user }, "Session loaded.");
});

authRouter.patch(
  "/profile",
  requireAuth,
  validateBody(profileSchema),
  async (req, res) => {
    const auth = req.auth;
    if (!auth) throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
    const user = await updateProfile(auth.user, req.body);
    sendSuccess(res, { user }, "Profile updated.");
  },
);

authRouter.post(
  "/pin",
  requireAuth,
  validateBody(setPinSchema),
  async (req, res) => {
    const auth = req.auth;
    if (!auth) throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
    await setTransactionPin(auth.user, req.body);
    sendSuccess(res, { hasPin: true }, "Transaction PIN saved.");
  },
);

authRouter.post(
  "/password",
  requireAuth,
  validateBody(changePasswordSchema),
  async (req, res) => {
    const auth = req.auth;
    if (!auth) throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
    await changePassword(auth.user, req.body);
    sendSuccess(res, null, "Password updated.");
  },
);
