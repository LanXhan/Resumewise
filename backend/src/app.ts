import express from "express";
import cors from "cors";

export interface AppOptions {
  corsOrigin: string;
  trustProxy?: number; // number of reverse proxies in front of the app
}

export function createApp({ corsOrigin, trustProxy }: AppOptions) {
  const app = express();

  if (trustProxy !== undefined) {
    app.set("trust proxy", trustProxy);
  }

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
