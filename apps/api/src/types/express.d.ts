import type { AdminSection } from "@paylane/shared";
import type { ApiKeyRow, UserRow } from "../db/schema";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: UserRow;
        sections: AdminSection[];
      };
      apiKeyAuth?: {
        user: UserRow;
        apiKey: ApiKeyRow;
      };
      rawBody?: Buffer;
    }
  }
}

export {};
