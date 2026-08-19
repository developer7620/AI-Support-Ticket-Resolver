import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import request from "supertest";

process.env.AI_MODE = "demo";
process.env.TICKETS_PATH = path.join(mkdtempSync(path.join(os.tmpdir(), "tickets-")), "tickets.json");
writeFileSync(process.env.TICKETS_PATH, "[]");

const { searchSupportPolicy } = await import("../src/data/policies.js");
const { getShipment } = await import("../src/data/shipments.js");
const { executeTool, validateToolCall } = await import("../src/tools.js");
const { processTicket, MAX_TOOL_CALLS, shouldEscalate } = await import("../src/workflow.js");
const { createApp } = await import("../src/app.js");

const app = createApp();

describe("shipment lookup", () => {
  test("returns a known delayed shipment", async () => {
    const res = await request(app).get("/api/shipments/SHP10001");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "IN_TRANSIT");
    assert.equal(getShipment("SHP10001").customerName, "Rahul Menon");
  });

  test("missing shipment returns 404", async () => {
    const res = await request(app).get("/api/shipments/SHP00000");
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "SHIPMENT_NOT_FOUND");
  });

  test("invalid shipment id returns 400", async () => {
    const res = await request(app).get("/api/shipments/not-an-id");
    assert.equal(res.status, 400);
  });
});

describe("policy retrieval", () => {
  test("keyword match finds delivery-delay", () => {
    const hit = searchSupportPolicy("delivery delay at hub");
    assert.equal(hit.matched, true);
    assert.equal(hit.policy.id, "delivery-delay");
  });

  test("unknown query does not invent a policy", () => {
    const hit = searchSupportPolicy("quantum billing");
    assert.equal(hit.matched, false);
  });
});

describe("tool validation", () => {
  test("rejects unknown tools and missing args", () => {
    assert.equal(validateToolCall("dropDatabase", {}).ok, false);
    assert.equal(validateToolCall("getShipmentDetails", {}).ok, false);
    assert.equal(validateToolCall("getShipmentDetails", { shipmentId: "SHP10001" }).ok, true);
  });
});

describe("workflow", () => {
  test("successful auto-resolution for a delayed shipment", async () => {
    const result = await processTicket({
      ticketId: "TCK_TEST_OK",
      customerName: "Rahul Menon",
      message: "Where is SHP10001? It is delayed and I am frustrated.",
      createdAt: new Date().toISOString(),
    });
    assert.equal(result.resolution, "AUTO_RESOLVED");
    assert.ok(result.confidence >= 0.8);
    assert.match(result.customerResponse, /SHP10001/);
    assert.equal(result.analysis.intent, "DELIVERY_DELAY");
    assert.ok(result.toolTrace.some((t) => t.name === "getShipmentDetails" && t.ok));
  });

  test("low-confidence / missing shipment escalates", async () => {
    const result = await processTicket({
      ticketId: "TCK_TEST_MISS",
      customerName: "Guest",
      message: "Track SHP00000 please, it is late.",
      createdAt: new Date().toISOString(),
    });
    assert.equal(result.resolution, "ESCALATED");
    assert.ok(result.escalation);
    assert.match(result.escalation.reason, /not exist|NOT_FOUND|Shipment/i);
  });

  test("tool failure escalates", async () => {
    const result = await processTicket({
      ticketId: "TCK_TEST_FAIL",
      customerName: "Ops",
      message: "Where is SHP99999?",
      createdAt: new Date().toISOString(),
    });
    assert.equal(result.resolution, "ESCALATED");
    assert.ok(result.toolTrace.some((t) => t.error && /timeout/i.test(t.error)));
  });

  test("maximum tool-call protection", async () => {
    let calls = 0;
    const execute = (name, args) => {
      calls += 1;
      return executeTool(name, args);
    };
    const result = await processTicket(
      {
        ticketId: "TCK_TEST_MAX",
        customerName: "Rahul",
        message: "Where is SHP10001? Delayed.",
        createdAt: new Date().toISOString(),
      },
      { execute, maxToolCalls: 1 }
    );
    assert.ok(calls <= 2);
    const attempted = result.toolTrace.filter((t) => !t.skipped);
    assert.ok(attempted.length <= 1);
    assert.equal(MAX_TOOL_CALLS, 3);
  });

  test("delivered dispute escalates even with high confidence", async () => {
    const result = await processTicket({
      ticketId: "TCK_TEST_DISPUTE",
      customerName: "Neha Gupta",
      message: "I did not receive SHP10010. It is missing.",
      createdAt: new Date().toISOString(),
    });
    assert.equal(result.resolution, "ESCALATED");
    assert.match(result.escalation.reason, /disputes/i);
  });

  test("shouldEscalate is true when confidence is low", () => {
    const gate = shouldEscalate({
      analysis: { intent: "UNKNOWN", shipmentId: "SHP10001", urgency: "LOW", sentiment: "NEUTRAL" },
      diagnosis: {
        rootCause: "unclear",
        evidence: [],
        recommendedAction: "ask human",
        confidence: 0.4,
        canAutoResolve: true,
      },
      toolResults: [
        { tool: "getShipmentDetails", ok: true, result: getShipment("SHP10001") },
      ],
      ticket: { message: "hello" },
    });
    assert.equal(gate.escalate, true);
  });
});

describe("tickets API", () => {
  test("POST creates a ticket and GET lists it", async () => {
    const created = await request(app).post("/api/tickets").send({
      customerName: "Vikram Singh",
      message: "Please track SHP10005, where is it?",
    });
    assert.equal(created.status, 201);
    assert.ok(created.body.ticketId);
    const list = await request(app).get("/api/tickets");
    assert.equal(list.status, 200);
    assert.ok(list.body.tickets.length >= 1);
    const one = await request(app).get(`/api/tickets/${created.body.ticketId}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.ticketId, created.body.ticketId);
  });
});
