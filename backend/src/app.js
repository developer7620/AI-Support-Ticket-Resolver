import express from "express";
import cors from "cors";
import { shipmentRouter } from "./routes/shipments.js";
import { ticketRouter } from "./routes/tickets.js";
import { aiMode } from "./workflow.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, aiMode: aiMode() });
  });

  app.use("/api/shipments", shipmentRouter);
  app.use("/api/tickets", ticketRouter);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "UNHANDLED", message: err.message });
  });

  return app;
}
