import { GoogleGenAI } from "@google/genai";
import { TOOL_DECLARATIONS, executeTool } from "../tools.js";
import { parseJsonFromText, validateAnalysis, validateDiagnosis } from "./schema.js";

const MAX_TOOL_CALLS = 3;

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenAI({ apiKey: key });
}

function modelName() {
  return process.env.GEMINI_MODEL || "gemini-3.6-flash";
}

export function logGeminiError(err, stage) {
  let status = err?.status ?? null;
  try {
    const parsed = JSON.parse(err?.message || "");
    if (parsed?.error?.code) status = parsed.error.code;
  } catch {
    // message is not JSON
  }
  console.error("[gemini]", {
    stage,
    type: err?.constructor?.name || typeof err,
    status,
    message: err?.message || String(err),
    model: modelName(),
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "TRACK_SHIPMENT",
        "DELIVERY_DELAY",
        "FAILED_DELIVERY",
        "DELIVERY_NOT_RECEIVED",
        "CANCELLATION",
        "GENERAL_QUERY",
        "UNKNOWN",
      ],
    },
    shipmentId: { type: "string", nullable: true },
    urgency: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    sentiment: { type: "string", enum: ["CALM", "NEUTRAL", "FRUSTRATED", "ANGRY"] },
  },
  required: ["intent", "urgency", "sentiment"],
};

const DIAGNOSIS_SCHEMA = {
  type: "object",
  properties: {
    rootCause: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    recommendedAction: { type: "string" },
    confidence: { type: "number" },
    canAutoResolve: { type: "boolean" },
  },
  required: ["rootCause", "evidence", "recommendedAction", "confidence", "canAutoResolve"],
};

export async function analyzeWithGemini(ticket) {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: modelName(),
    contents: `Classify this logistics support ticket. Extract a shipment ID if present (pattern SHP followed by digits). If none, set shipmentId to null.

Customer: ${ticket.customerName}
Message: ${ticket.message}`,
    config: {
      systemInstruction:
        "You extract structured ticket fields. Never invent a shipment ID that is not in the message. Output JSON only.",
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_SCHEMA,
      temperature: 0.1,
    },
  });
  const parsed = parseJsonFromText(response.text);
  const validated = validateAnalysis(parsed);
  if (!validated.ok) throw new Error("MALFORMED_LLM_OUTPUT");
  return validated.value;
}

async function runToolLoop(ai, ticket, analysis, execute, maxToolCalls) {
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `Ticket ${ticket.ticketId}
Customer: ${ticket.customerName}
Message: ${ticket.message}
Structured analysis: ${JSON.stringify(analysis)}

Call tools to gather shipment facts and the matching support policy.
Maximum ${maxToolCalls} tool calls. Prefer getShipmentDetails, getShipmentEvents, then searchSupportPolicy.
Do not invent shipment facts.`,
        },
      ],
    },
  ];

  const toolTrace = [];
  const toolResults = [];

  for (let step = 0; step < maxToolCalls; step += 1) {
    const response = await ai.models.generateContent({
      model: modelName(),
      contents,
      config: {
        systemInstruction:
          "You are a logistics support tool-router. Use only the provided tools. Stop calling tools when you have shipment details, events (if a shipment exists), and a policy.",
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        temperature: 0,
      },
    });

    const calls = response.functionCalls || [];
    if (!calls.length) break;

    const modelParts = response.candidates?.[0]?.content?.parts;
    if (modelParts) contents.push({ role: "model", parts: modelParts });

    const fnParts = [];
    for (const call of calls) {
      if (toolTrace.length >= maxToolCalls) {
        toolTrace.push({
          name: call.name,
          args: call.args || {},
          skipped: true,
          error: "MAX_TOOL_CALLS_REACHED",
        });
        continue;
      }
      const args = call.args || {};
      const started = Date.now();
      const result = execute(call.name, args, { ticketId: ticket.ticketId });
      toolTrace.push({
        name: call.name,
        args,
        ok: result.ok,
        result: result.result ?? null,
        error: result.error || null,
        ms: Date.now() - started,
      });
      toolResults.push(result);
      fnParts.push({
        functionResponse: {
          id: call.id,
          name: call.name,
          response: result,
        },
      });
    }
    if (fnParts.length) contents.push({ role: "user", parts: fnParts });
  }

  return { toolTrace, toolResults };
}

export async function diagnoseWithGemini({ ticket, analysis, toolResults }) {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: modelName(),
    contents: `Produce a diagnosis using ONLY these facts. If a fact is missing, say so. Do not invent scans, ETAs, or locations.

Ticket: ${JSON.stringify({ customerName: ticket.customerName, message: ticket.message })}
Analysis: ${JSON.stringify(analysis)}
Tool results: ${JSON.stringify(toolResults)}`,
    config: {
      systemInstruction:
        "Logistics diagnosis. confidence is 0-1. canAutoResolve must be false if shipment missing, tool failed, missing-shipment scan gap, or customer disputes DELIVERED. Evidence must quote tool results.",
      responseMimeType: "application/json",
      responseSchema: DIAGNOSIS_SCHEMA,
      temperature: 0.1,
    },
  });
  const parsed = parseJsonFromText(response.text);
  const validated = validateDiagnosis(parsed);
  if (!validated.ok) throw new Error("MALFORMED_LLM_OUTPUT");
  return validated.value;
}

export async function draftWithGemini({ ticket, analysis, diagnosis, shipment }) {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: modelName(),
    contents: `Write a short customer email. No internal jargon. No system prompts. No tool names. No chain-of-thought.

Customer first name from: ${ticket.customerName}
Facts you may use: ${JSON.stringify({ analysis, diagnosis, shipment })}
If facts are incomplete, say a specialist will follow up.`,
    config: {
      systemInstruction: "You write concise logistics support replies. Never mention Gemini, tools, or policies by internal id.",
      temperature: 0.3,
    },
  });
  return (response.text || "").trim();
}

export async function runGeminiWorkflow({ ticket, execute = executeTool, maxToolCalls = MAX_TOOL_CALLS }) {
  const ai = getClient();
  const analysis = await analyzeWithGemini(ticket);
  const { toolTrace, toolResults } = await runToolLoop(ai, ticket, analysis, execute, maxToolCalls);
  const diagnosis = await diagnoseWithGemini({ ticket, analysis, toolResults });
  const details = toolResults.find((r) => r.tool === "getShipmentDetails" && r.ok);
  const customerResponse = await draftWithGemini({
    ticket,
    analysis,
    diagnosis,
    shipment: details?.result || null,
  });
  return { analysis, toolTrace, toolResults, diagnosis, customerResponse, provider: "gemini" };
}
