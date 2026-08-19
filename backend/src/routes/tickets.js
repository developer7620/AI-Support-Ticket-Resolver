import { Router } from "express";
import { getTicket, listTickets, nextTicketId, saveTicket } from "../store.js";
import { processTicket } from "../workflow.js";

export const ticketRouter = Router();

function metrics(tickets) {
  const total = tickets.length;
  const autoResolved = tickets.filter((t) => t.resolution === "AUTO_RESOLVED").length;
  const escalated = tickets.filter((t) => t.resolution === "ESCALATED").length;
  const avgConfidence =
    total === 0 ? 0 : tickets.reduce((sum, t) => sum + (t.confidence || 0), 0) / total;
  return { total, autoResolved, escalated, averageConfidence: Number(avgConfidence.toFixed(3)) };
}

ticketRouter.get("/", (_req, res) => {
  try {
    const tickets = listTickets();
    res.json({ tickets, metrics: metrics(tickets) });
  } catch (err) {
    res.status(500).json({ error: "DATABASE_FAILURE", message: err.message });
  }
});

ticketRouter.get("/:ticketId", (req, res) => {
  try {
    const ticket = getTicket(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: "TICKET_NOT_FOUND" });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: "DATABASE_FAILURE", message: err.message });
  }
});

ticketRouter.post("/", async (req, res) => {
  try {
    const customerName = String(req.body?.customerName || "").trim();
    const message = String(req.body?.message || "").trim();
    if (!customerName || !message) {
      return res.status(400).json({ error: "customerName and message are required" });
    }

    const ticketId = nextTicketId();
    const base = {
      ticketId,
      customerName,
      message,
      shipmentId: req.body.shipmentId || null,
      createdAt: new Date().toISOString(),
      status: "PROCESSING",
    };

    const result = await processTicket(base);
    const ticket = {
      ...base,
      ...result,
      shipmentId: result.analysis?.shipmentId || base.shipmentId,
      status: result.resolution === "AUTO_RESOLVED" ? "RESOLVED" : "ESCALATED",
    };
    saveTicket(ticket);
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: "TICKET_PROCESSING_FAILED", message: err.message });
  }
});
