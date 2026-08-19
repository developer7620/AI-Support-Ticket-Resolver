import { Router } from "express";
import { getEvents, getShipment, shipments } from "../data/shipments.js";

export const shipmentRouter = Router();

shipmentRouter.get("/", (_req, res) => {
  res.json({ shipments: Object.values(shipments) });
});

shipmentRouter.get("/:shipmentId", (req, res) => {
  const id = String(req.params.shipmentId || "").toUpperCase();
  if (!/^SHP[A-Z0-9_]+$/.test(id)) {
    return res.status(400).json({ error: "INVALID_SHIPMENT_ID", shipmentId: id });
  }
  const shipment = getShipment(id);
  if (!shipment) {
    return res.status(404).json({ error: "SHIPMENT_NOT_FOUND", shipmentId: id });
  }
  return res.json(shipment);
});

shipmentRouter.get("/:shipmentId/events", (req, res) => {
  const id = String(req.params.shipmentId || "").toUpperCase();
  if (!/^SHP[A-Z0-9_]+$/.test(id)) {
    return res.status(400).json({ error: "INVALID_SHIPMENT_ID", shipmentId: id });
  }
  const events = getEvents(id);
  if (!events) {
    return res.status(404).json({ error: "SHIPMENT_NOT_FOUND", shipmentId: id });
  }
  return res.json({ shipmentId: id, events });
});
