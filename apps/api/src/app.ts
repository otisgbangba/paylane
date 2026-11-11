import cookieParser from "cookie-parser";
import cors from "cors";
import { sql } from "drizzle-orm";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { db } from "./db/client";
import { errorHandler, notFoundHandler, requestContext } from "./http/middleware/core";
import { apiRouter } from "./routes";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: env.webOrigin,
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buffer) => {
      (req as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(cookieParser());
app.use(requestContext);

app.get("/health", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({
      status: "ok",
      service: "paylane-api",
      database: "up",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "degraded",
      service: "paylane-api",
      database: "down",
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
