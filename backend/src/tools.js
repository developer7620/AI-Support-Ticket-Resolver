import { getEvents, getShipment } from "./data/shipments.js";
import { searchSupportPolicy } from "./data/policies.js";

export const TOOL_DECLARATIONS = [
  {
    name: "getShipmentDetails",
    description: "Look up a shipment by ID. Returns status, location, ETA, carrier, delay reason.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        shipmentId: { type: "string", description: "Shipment ID such as SHP10001" },
      },
      required: ["shipmentId"],
    },
  },
  {
    name: "getShipmentEvents",
    description: "Return the scan/event timeline for a shipment.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        shipmentId: { type: "string" },
      },
      required: ["shipmentId"],
    },
  },
  {
    name: "searchSupportPolicy",
    description: "Keyword search over a small support policy knowledge base.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Short search query, e.g. delivery delay" },
      },
      required: ["query"],
    },
  },
  {
    name: "createEscalation",
    description: "Create an escalation record for a human agent. Use when the case cannot be auto-resolved.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string" },
        reason: { type: "string" },
        severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        recommendedHumanAction: { type: "string" },
      },
      required: ["ticketId", "reason"],
    },
  },
];

export const ALLOWED_TOOLS = TOOL_DECLARATIONS.map((t) => t.name);

const FORCE_FAIL_IDS = new Set(["SHP_TOOL_FAIL", "SHP99999"]);

export function validateToolCall(name, args = {}) {
  if (!ALLOWED_TOOLS.includes(name)) {
    return { ok: false, error: `Unknown tool: ${name}` };
  }
  if (name === "getShipmentDetails" || name === "getShipmentEvents") {
    if (!args.shipmentId || typeof args.shipmentId !== "string") {
      return { ok: false, error: "shipmentId is required" };
    }
  }
  if (name === "searchSupportPolicy" && (!args.query || typeof args.query !== "string")) {
    return { ok: false, error: "query is required" };
  }
  if (name === "createEscalation") {
    if (!args.ticketId || !args.reason) {
      return { ok: false, error: "ticketId and reason are required" };
    }
  }
  return { ok: true };
}

export function executeTool(name, args = {}, context = {}) {
  const validation = validateToolCall(name, args);
  if (!validation.ok) {
    return { ok: false, tool: name, args, error: validation.error };
  }

  try {
    if (name === "getShipmentDetails") {
      if (FORCE_FAIL_IDS.has(args.shipmentId)) {
        return { ok: false, tool: name, args, error: "Shipment API timeout" };
      }
      const shipment = getShipment(args.shipmentId);
      if (!shipment) {
        return { ok: false, tool: name, args, error: "SHIPMENT_NOT_FOUND", shipmentId: args.shipmentId };
      }
      return { ok: true, tool: name, args, result: shipment };
    }

    if (name === "getShipmentEvents") {
      if (FORCE_FAIL_IDS.has(args.shipmentId)) {
        return { ok: false, tool: name, args, error: "Events API timeout" };
      }
      const events = getEvents(args.shipmentId);
      if (!events) {
        return { ok: false, tool: name, args, error: "SHIPMENT_NOT_FOUND", shipmentId: args.shipmentId };
      }
      return { ok: true, tool: name, args, result: events };
    }

    if (name === "searchSupportPolicy") {
      return { ok: true, tool: name, args, result: searchSupportPolicy(args.query) };
    }

    if (name === "createEscalation") {
      const escalation = {
        ticketId: args.ticketId || context.ticketId,
        reason: args.reason,
        severity: args.severity || "MEDIUM",
        recommendedHumanAction: args.recommendedHumanAction || "Review AI diagnosis and contact the customer.",
        createdAt: new Date().toISOString(),
      };
      if (context.onEscalation) context.onEscalation(escalation);
      return { ok: true, tool: name, args, result: escalation };
    }

    return { ok: false, tool: name, args, error: "UNIMPLEMENTED_TOOL" };
  } catch (err) {
    return { ok: false, tool: name, args, error: err.message || "TOOL_FAILED" };
  }
}
