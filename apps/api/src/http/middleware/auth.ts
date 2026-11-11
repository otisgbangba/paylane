import { eq } from "drizzle-orm";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AdminSection } from "@paylane/shared";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { sectionsFor } from "../../lib/accounts";
import { errorFactory } from "../../lib/errors";
import { AppError } from "../../lib/errors";
import { readSessionToken, verifySession } from "../../lib/security";

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readSessionToken(req);
  if (!token) throw errorFactory.unauthorized();

  const claims = verifySession(token);
  if (!claims) throw errorFactory.unauthorized("Your session has expired. Please sign in again.");

  const [user] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
  if (!user) throw errorFactory.unauthorized("This account no longer exists.");
  if (!user.isActive) {
    throw new AppError(403, "AUTH_FORBIDDEN", "This account has been deactivated.");
  }

  req.auth = { user, sections: await sectionsFor(user) };
  next();
}

export function requireSection(section: AdminSection): RequestHandler[] {
  return [
    requireAuth,
    (req: Request, _res: Response, next: NextFunction) => {
      const auth = req.auth;
      if (!auth) throw errorFactory.unauthorized();
      if (auth.user.role === "SUPER_ADMIN") return next();
      if (section === "TEAM" || auth.user.role !== "ADMIN" || !auth.sections.includes(section)) {
        throw errorFactory.forbidden(
          "Your administrator account is not scoped to this section.",
        );
      }
      next();
    },
  ];
}

export function requireSuperAdmin(): RequestHandler[] {
  return [
    requireAuth,
    (req: Request, _res: Response, next: NextFunction) => {
      if (req.auth?.user.role !== "SUPER_ADMIN") {
        throw errorFactory.forbidden("Only the super administrator can manage team access.");
      }
      next();
    },
  ];
}
