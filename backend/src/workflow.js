import { executeTool } from "./tools.js";
import { getShipment } from "./data/shipments.js";
import { runDemoWorkflow } from "./ai/demoProvider.js";
import { runGeminiWorkflow, logGeminiError } from "./ai/geminiProvider.js";
import { validateDiagnosis } from "./ai/schema.js";

export const MAX_TOOL_CALLS = 3;
export const CONFIDENCE_THRESHOLD = 0.8;

export function aiMode() {
  const mode = (process.env.AI_MODE || "demo").toLowerCase();
  if (mode === "gemini") return "gemini";
  return "demo";
}

function shipmentFromTools(toolResults, analysis) {
  const details = toolResults.find((r) => r.tool === "getShipmentDetails");
  if (details?.ok) return details.result;
  return getShipment(analysis.shipmentId);
}

function retrievedPolicy(toolResults) {
  const hit = toolResults.find((r) => r.tool === "searchSupportPolicy" && r.ok);
  return hit?.result?.policy || null;
}

export function shouldEscalate({ analysis, diagnosis, toolResults, ticket }) {
  const reasons = [];
  const shipment = shipmentFromTools(toolResults, analysis);
  const details = toolResults.find((r) => r.tool === "getShipmentDetails");
  const events = toolResults.find((r) => r.tool === "getShipmentEvents");

  if (!validateDiagnosis(diagnosis).ok) {
    reasons.push("Malformed diagnosis");
  }

  if (diagnosis.confidence < CONFIDENCE_THRESHOLD) {
    reasons.push(
      `Confidence ${diagnosis.confidence} is below ${CONFIDENCE_THRESHOLD}`
    );
  }

  if (!analysis.shipmentId) {
    reasons.push("No shipment ID extracted");
  }

  if (analysis.shipmentId && !shipment) {
    reasons.push("Shipment does not exist");
  }

  if (details && !details.ok) {
    reasons.push(`Shipment tool failed: ${details.error}`);
  }

  if (events && !events.ok && events.error !== "SHIPMENT_NOT_FOUND") {
    reasons.push(`Events tool failed: ${events.error}`);
  }

  if (
    toolResults.some(
      (r) => r.error === "MAX_TOOL_CALLS_REACHED" || r.skipped
    )
  ) {
    reasons.push("Tool-call limit reached before facts were complete");
  }

  const disputesDelivered =
    shipment?.status === "DELIVERED" &&
    (analysis.intent === "DELIVERY_NOT_RECEIVED" ||
      /not received|didn't receive|did not receive|missing|lost|never arrived/i.test(
        ticket.message
      ));

  if (disputesDelivered) {
    reasons.push("Customer disputes a DELIVERED shipment");
  }

  if (shipment && /scan gap|unknown/i.test(shipment.lastLocation || "")) {
    reasons.push("Information conflict / missing-shipment scan gap");
  }

  if (diagnosis.canAutoResolve === false && reasons.length === 0) {
    reasons.push("Model marked canAutoResolve=false");
  }

  return {
    escalate:
      reasons.length > 0 ||
      diagnosis.confidence < CONFIDENCE_THRESHOLD ||
      !shipment,
    reasons,
    shipment,
  };
}

export function buildEscalation({
  ticket,
  analysis,
  diagnosis,
  reasons,
}) {
  const severity =
    analysis.urgency === "HIGH" || diagnosis.confidence < 0.5
      ? "HIGH"
      : "MEDIUM";

  return {
    ticketId: ticket.ticketId,
    reason: reasons.join("; ") || "Requires human review",
    severity,
    aiDiagnosis: diagnosis,
    recommendedHumanAction:
      diagnosis.recommendedAction ||
      "Review shipment facts and contact the customer.",
    createdAt: new Date().toISOString(),
  };
}

export async function processTicket(ticket, options = {}) {
  const mode = options.mode || aiMode();
  const execute = options.execute || executeTool;
  const maxToolCalls = options.maxToolCalls || MAX_TOOL_CALLS;
  const timeline = [];
  const started = Date.now();

  timeline.push({
    step: "ticket_received",
    at: new Date().toISOString(),
    detail: "Customer ticket accepted by API",
  });

  let aiResult;

  try {
    if (mode === "gemini") {
      try {
        aiResult = await runGeminiWorkflow({
          ticket,
          execute,
          maxToolCalls,
        });
      } catch (err) {
        /*
         * IMPORTANT:
         * In explicit Gemini mode, never silently fall back to demo mode.
         * If Gemini fails, surface the real error and escalate.
         */
        logGeminiError(err, "processTicket");

        timeline.push({
          step: "gemini_failure",
          at: new Date().toISOString(),
          detail: err.message || "Gemini request failed",
        });

        throw err;
      }
    } else {
      aiResult = await runDemoWorkflow({
        ticket,
        execute,
        maxToolCalls,
      });
    }
  } catch (err) {
    timeline.push({
      step: "workflow_error",
      at: new Date().toISOString(),
      detail: err.message,
    });

    const diagnosis = {
      rootCause: "Workflow failed before a diagnosis could be produced.",
      evidence: [err.message],
      recommendedAction:
        "Human agent should handle this ticket manually.",
      confidence: 0.2,
      canAutoResolve: false,
    };

    const escalation = buildEscalation({
      ticket,
      analysis: {
        intent: "UNKNOWN",
        shipmentId: ticket.shipmentId || null,
        urgency: "HIGH",
        sentiment: "NEUTRAL",
      },
      diagnosis,
      reasons: [err.message],
    });

    return {
      analysis: {
        intent: "UNKNOWN",
        shipmentId: null,
        urgency: "HIGH",
        sentiment: "NEUTRAL",
      },
      toolTrace: [],
      toolResults: [],
      retrievedPolicy: null,
      diagnosis,
      confidence: diagnosis.confidence,
      resolution: "ESCALATED",
      customerResponse: `Hi ${
        ticket.customerName.split(" ")[0]
      },

We could not finish an automatic review of your request. A specialist will follow up shortly.

Regards,
Support Team`,
      escalation,
      timeline,
      provider: mode,
      elapsedMs: Date.now() - started,
      error: err.message,
    };
  }

  timeline.push({
    step: "llm_ticket_analysis",
    at: new Date().toISOString(),
    detail: aiResult.analysis,
  });

  for (const call of aiResult.toolTrace) {
    timeline.push({
      step: "tool_call",
      at: new Date().toISOString(),
      detail: call,
    });
  }

  const policy = retrievedPolicy(aiResult.toolResults);

  timeline.push({
    step: "policy_retrieval",
    at: new Date().toISOString(),
    detail: policy,
  });

  timeline.push({
    step: "ai_diagnosis",
    at: new Date().toISOString(),
    detail: aiResult.diagnosis,
  });

  const gate = shouldEscalate({
    analysis: aiResult.analysis,
    diagnosis: aiResult.diagnosis,
    toolResults: aiResult.toolResults,
    ticket,
  });

  let resolution = "AUTO_RESOLVED";
  let escalation = null;

  if (
    gate.escalate ||
    !aiResult.diagnosis.canAutoResolve ||
    aiResult.diagnosis.confidence < CONFIDENCE_THRESHOLD
  ) {
    resolution = "ESCALATED";

    escalation = buildEscalation({
      ticket,
      analysis: aiResult.analysis,
      diagnosis: aiResult.diagnosis,
      reasons:
        gate.reasons.length
          ? gate.reasons
          : ["Policy requires human review"],
    });

    execute("createEscalation", {
      ticketId: ticket.ticketId,
      reason: escalation.reason,
      severity: escalation.severity,
      recommendedHumanAction:
        escalation.recommendedHumanAction,
    });

    timeline.push({
      step: "escalation",
      at: new Date().toISOString(),
      detail: escalation,
    });
  } else {
    timeline.push({
      step: "auto_resolve",
      at: new Date().toISOString(),
      detail: "Confidence and policy gates passed",
    });
  }

  timeline.push({
    step: "customer_response",
    at: new Date().toISOString(),
    detail: "Customer-facing reply generated",
  });

  return {
    analysis: aiResult.analysis,
    toolTrace: aiResult.toolTrace,
    toolResults: aiResult.toolResults,
    retrievedPolicy: policy,
    diagnosis: aiResult.diagnosis,
    confidence: aiResult.diagnosis.confidence,
    resolution,
    customerResponse: aiResult.customerResponse,
    escalation,
    timeline,
    provider: aiResult.provider,
    geminiError: aiResult.geminiError || null,
    elapsedMs: Date.now() - started,
  };
}