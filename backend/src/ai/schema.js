export const INTENTS = [
  "TRACK_SHIPMENT",
  "DELIVERY_DELAY",
  "FAILED_DELIVERY",
  "DELIVERY_NOT_RECEIVED",
  "CANCELLATION",
  "GENERAL_QUERY",
  "UNKNOWN",
];

export const URGENCIES = ["LOW", "MEDIUM", "HIGH"];
export const SENTIMENTS = ["CALM", "NEUTRAL", "FRUSTRATED", "ANGRY"];

export function extractShipmentId(text) {
  const match = String(text || "").toUpperCase().match(/SHP\d{5}/);
  return match ? match[0] : null;
}

export function validateAnalysis(raw) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Analysis is not an object" };
  }
  const intent = INTENTS.includes(raw.intent) ? raw.intent : "UNKNOWN";
  const urgency = URGENCIES.includes(raw.urgency) ? raw.urgency : "MEDIUM";
  const sentiment = SENTIMENTS.includes(raw.sentiment) ? raw.sentiment : "NEUTRAL";
  let shipmentId = raw.shipmentId;
  if (shipmentId === "" || shipmentId === "null" || shipmentId === "undefined") shipmentId = null;
  if (typeof shipmentId === "string") shipmentId = shipmentId.toUpperCase();
  if (shipmentId && !/^SHP\d{5}$/.test(shipmentId) && !shipmentId.startsWith("SHP")) {
    shipmentId = extractShipmentId(shipmentId) || shipmentId;
  }
  return {
    ok: true,
    value: { intent, shipmentId: shipmentId || null, urgency, sentiment },
  };
}

export function validateDiagnosis(raw) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Diagnosis is not an object" };
  }
  const confidence = Number(raw.confidence);
  if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
    return { ok: false, error: "confidence must be a number between 0 and 1" };
  }
  const evidence = Array.isArray(raw.evidence)
    ? raw.evidence.map(String).slice(0, 6)
    : [];
  return {
    ok: true,
    value: {
      rootCause: String(raw.rootCause || "Unable to determine root cause from available facts."),
      evidence,
      recommendedAction: String(raw.recommendedAction || "Escalate to a human agent."),
      confidence,
      canAutoResolve: Boolean(raw.canAutoResolve),
    },
  };
}

export function parseJsonFromText(text) {
  if (!text || typeof text !== "string") throw new Error("MALFORMED_LLM_OUTPUT");
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("MALFORMED_LLM_OUTPUT");
  }
}
