import type { AdminSection } from "@paylane/shared";
import type { UserRow } from "../db/schema";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: UserRow;
        sections: AdminSection[];
      };
      rawBody?: Buffer;
    }
  }
}

export {};
