import { extractShipmentId, validateAnalysis, validateDiagnosis } from "./schema.js";
import { executeTool } from "../tools.js";
import { getShipment } from "../data/shipments.js";

const MAX_TOOL_CALLS = 3;

function classifyIntent(message) {
  const t = message.toLowerCase();
  if (/\b(cancel|cancelled|cancellation)\b/.test(t)) return "CANCELLATION";
  if (/\b(failed|not home|nobody|reattempt|re-attempt|undelivered)\b/.test(t)) return "FAILED_DELIVERY";
  if (/\b(not received|didn't receive|did not receive|missing|lost|never arrived)\b/.test(t)) {
    return "DELIVERY_NOT_RECEIVED";
  }
  if (/\b(delay|delayed|late|overdue|still waiting|eta)\b/.test(t)) return "DELIVERY_DELAY";
  if (/\b(where|track|status|location)\b/.test(t)) return "TRACK_SHIPMENT";
  if (/\b(hello|help|policy|hours)\b/.test(t)) return "GENERAL_QUERY";
  return "UNKNOWN";
}

function sentimentOf(message) {
  const t = message.toLowerCase();
  if (/\b(furious|unacceptable|worst|angry)\b/.test(t)) return "ANGRY";
  if (/\b(frustrated|still waiting|again|not happy)\b/.test(t)) return "FRUSTRATED";
  if (/\b(please|thanks|thank you)\b/.test(t)) return "CALM";
  return "NEUTRAL";
}

function urgencyOf(intent, message) {
  if (intent === "DELIVERY_NOT_RECEIVED" || intent === "FAILED_DELIVERY") return "HIGH";
  if (intent === "DELIVERY_DELAY") return "HIGH";
  if (/\burgent|asap\b/i.test(message)) return "HIGH";
  if (intent === "GENERAL_QUERY") return "LOW";
  return "MEDIUM";
}

function policyQueryFor(intent) {
  switch (intent) {
    case "DELIVERY_DELAY":
      return "delivery delay";
    case "FAILED_DELIVERY":
      return "failed delivery";
    case "CANCELLATION":
      return "cancellation";
    case "DELIVERY_NOT_RECEIVED":
      return "delivery not received missing";
    default:
      return "escalation";
  }
}

export function planDemoTools(analysis, ticketId) {
  const calls = [];
  if (analysis.shipmentId) {
    calls.push({ name: "getShipmentDetails", args: { shipmentId: analysis.shipmentId } });
    calls.push({ name: "getShipmentEvents", args: { shipmentId: analysis.shipmentId } });
  }
  calls.push({
    name: "searchSupportPolicy",
    args: { query: policyQueryFor(analysis.intent) },
  });
  return calls.slice(0, MAX_TOOL_CALLS).map((c) => ({ ...c, ticketId }));
}

export function diagnoseFromFacts({ ticket, analysis, toolResults }) {
  const details = toolResults.find((r) => r.tool === "getShipmentDetails");
  const shipment = details?.ok ? details.result : null;
  const events = toolResults.find((r) => r.tool === "getShipmentEvents")?.result || [];
  const disputesDelivered =
    shipment?.status === "DELIVERED" &&
    (analysis.intent === "DELIVERY_NOT_RECEIVED" ||
      /not received|didn't receive|missing|lost/i.test(ticket.message));

  if (!analysis.shipmentId) {
    return {
      rootCause: "No shipment ID was provided in the ticket.",
      evidence: ["Ticket text did not contain a valid SHP##### identifier."],
      recommendedAction: "Ask the customer for the shipment ID, then re-run lookup.",
      confidence: 0.55,
      canAutoResolve: false,
    };
  }

  if (!details || details.error === "SHIPMENT_NOT_FOUND") {
    return {
      rootCause: `Shipment ${analysis.shipmentId} was not found in the shipment system.`,
      evidence: [`getShipmentDetails returned SHIPMENT_NOT_FOUND for ${analysis.shipmentId}.`],
      recommendedAction: "Verify the ID with the customer and escalate if it still cannot be found.",
      confidence: 0.7,
      canAutoResolve: false,
    };
  }

  if (details && !details.ok) {
    return {
      rootCause: "Shipment lookup failed due to a backend/tool error.",
      evidence: [details.error || "Tool failure"],
      recommendedAction: "Retry the shipment API, then escalate if it still fails.",
      confidence: 0.4,
      canAutoResolve: false,
    };
  }

  if (shipment.status === "IN_TRANSIT" && /scan gap|unknown/i.test(shipment.lastLocation || "")) {
    return {
      rootCause: "Possible missing shipment: last scan is stale and location is unknown.",
      evidence: [
        `Status ${shipment.status}`,
        `Last location: ${shipment.lastLocation}`,
        `Last update: ${shipment.lastUpdated}`,
      ],
      recommendedAction: "Escalate as a missing-shipment investigation. Do not auto-resolve.",
      confidence: 0.62,
      canAutoResolve: false,
    };
  }

  if (disputesDelivered) {
    return {
      rootCause: "Customer disputes a shipment marked DELIVERED.",
      evidence: [
        `System status is DELIVERED at ${shipment.lastLocation}`,
        `Customer message: ${ticket.message.slice(0, 140)}`,
      ],
      recommendedAction: "Escalate POD dispute. Human should review proof of delivery and contact the customer.",
      confidence: 0.88,
      canAutoResolve: false,
    };
  }

  if (shipment.status === "FAILED_DELIVERY") {
    const highAttempts = shipment.deliveryAttempts >= 3;
    return {
      rootCause: `Delivery failed after ${shipment.deliveryAttempts} attempt(s): ${shipment.delayReason || "see events"}.`,
      evidence: [
        `Status FAILED_DELIVERY`,
        `Attempts: ${shipment.deliveryAttempts}`,
        events.slice(-1)[0]?.note || "Latest event on file",
      ],
      recommendedAction: highAttempts
        ? "Escalate: three attempts exhausted. Human should offer pickup or return."
        : "Share failure reason and next attempt guidance.",
      confidence: 0.9,
      canAutoResolve: !highAttempts,
    };
  }

  if (shipment.status === "CANCELLED") {
    return {
      rootCause: "Shipment was cancelled before completion.",
      evidence: [`Status CANCELLED`, shipment.delayReason || "Cancelled in origin facility"],
      recommendedAction: "Confirm cancellation. Do not claim a refund was issued.",
      confidence: 0.93,
      canAutoResolve: true,
    };
  }

  if (shipment.status === "DELIVERED") {
    return {
      rootCause: "Shipment is marked delivered in the network.",
      evidence: [
        `Delivered at ${shipment.lastLocation}`,
        `Last update ${shipment.lastUpdated}`,
      ],
      recommendedAction: "Share delivery confirmation and location.",
      confidence: 0.92,
      canAutoResolve: true,
    };
  }

  if (["IN_TRANSIT", "OUT_FOR_DELIVERY", "PICKED_UP", "CREATED"].includes(shipment.status)) {
    const delayed = Boolean(shipment.delayReason) || analysis.intent === "DELIVERY_DELAY";
    return {
      rootCause: delayed
        ? `Shipment is ${shipment.status} and delayed: ${shipment.delayReason || "see hub events"}.`
        : `Shipment is ${shipment.status} and moving through the network.`,
      evidence: [
        `Status ${shipment.status}`,
        `Last location ${shipment.lastLocation}`,
        `Expected delivery ${shipment.expectedDelivery}`,
        events.slice(-1)[0]?.note || "Events retrieved",
      ],
      recommendedAction: delayed
        ? "Explain current hub location, delay reason, and existing ETA. Do not invent a new date."
        : "Share live location and ETA.",
      confidence: 0.9,
      canAutoResolve: true,
    };
  }

  if (shipment.status === "RETURNED") {
    return {
      rootCause: "Shipment was returned to origin after failed delivery/refusal.",
      evidence: [`Status RETURNED`, shipment.delayReason || "Returned"],
      recommendedAction: "Explain return status and offer human follow-up for next steps.",
      confidence: 0.87,
      canAutoResolve: true,
    };
  }

  return {
    rootCause: "Shipment was found but the case needs human review.",
    evidence: [`Status ${shipment.status}`],
    recommendedAction: "Escalate for a specialist to review.",
    confidence: 0.5,
    canAutoResolve: false,
  };
}

export function draftDemoResponse({ ticket, analysis, diagnosis, shipment }) {
  const name = ticket.customerName.split(" ")[0];
  if (!shipment) {
    return `Hi ${name},\n\nI could not complete an automatic check for ${analysis.shipmentId || "this shipment"}. A specialist will review this ticket and follow up.\n\nRegards,\nSupport Team`;
  }
  return `Hi ${name},\n\nI checked shipment ${shipment.shipmentId}. Current status: ${shipment.status}. Last location: ${shipment.lastLocation}. Expected delivery: ${shipment.expectedDelivery}.${
    shipment.delayReason ? ` Delay reason on file: ${shipment.delayReason}.` : ""
  }\n\n${diagnosis.recommendedAction}\n\nRegards,\nSupport Team`;
}

export async function runDemoWorkflow({ ticket, execute = executeTool, maxToolCalls = MAX_TOOL_CALLS }) {
  const intent = classifyIntent(ticket.message);
  const analysis = validateAnalysis({
    intent,
    shipmentId: extractShipmentId(ticket.message) || ticket.shipmentId || null,
    urgency: urgencyOf(intent, ticket.message),
    sentiment: sentimentOf(ticket.message),
  }).value;

  const planned = planDemoTools(analysis, ticket.ticketId).slice(0, maxToolCalls);
  const toolTrace = [];
  const toolResults = [];

  for (const call of planned) {
    if (toolTrace.length >= maxToolCalls) {
      toolTrace.push({
        name: call.name,
        args: call.args,
        skipped: true,
        error: "MAX_TOOL_CALLS_REACHED",
      });
      break;
    }
    const started = Date.now();
    const result = execute(call.name, call.args, { ticketId: ticket.ticketId });
    toolTrace.push({
      name: call.name,
      args: call.args,
      ok: result.ok,
      result: result.result ?? null,
      error: result.error || null,
      ms: Date.now() - started,
    });
    toolResults.push(result);
  }

  const diagnosis = diagnoseFromFacts({ ticket, analysis, toolResults });
  const shipment = getShipment(analysis.shipmentId);
  const customerResponse = draftDemoResponse({ ticket, analysis, diagnosis, shipment });

  return { analysis, toolTrace, toolResults, diagnosis, customerResponse, provider: "demo" };
}
