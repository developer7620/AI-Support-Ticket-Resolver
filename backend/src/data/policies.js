export const policies = [
  {
    id: "delivery-delay",
    title: "Delivery delay",
    keywords: [
      "delay",
      "delayed",
      "late",
      "overdue",
      "eta",
      "expected",
      "backlog",
      "weather",
      "in transit",
    ],
    content: `Policy: Delivery delay
- Share last scan location, last update time, and current ETA. Do not invent a new ETA.
- If delayReason is present, explain it in plain language.
- Auto-resolve when the shipment is still moving (IN_TRANSIT / OUT_FOR_DELIVERY / PICKED_UP) and facts are complete.
- Offer to escalate if the shipment is more than 48 hours past expectedDelivery with no movement.`,
  },

  {
    id: "failed-delivery",
    title: "Failed delivery",
    keywords: [
      "failed",
      "attempt",
      "unavailable",
      "not home",
      "re-attempt",
      "redelivery",
      "held",
    ],
    content: `Policy: Failed delivery
- Confirm number of deliveryAttempts and the failure reason from shipment data.
- If attempts < 3, tell the customer the next attempt window and how to update address/phone.
- If attempts >= 3, do not auto-promise a new attempt — escalate for a human to schedule pickup or return.`,
  },

  {
    id: "cancellation",
    title: "Cancellation",
    keywords: [
      "cancel",
      "cancelled",
      "cancellation",
      "stop shipment",
    ],
    content: `Policy: Cancellation
- If status is CANCELLED, confirm it and state whether pickup happened.
- If the shipment is already IN_TRANSIT or later, cancellation may not be possible — escalate.
- Never claim a refund was processed unless a billing tool confirmed it (this prototype has no billing tool).`,
  },

  {
    id: "delivery-not-received",
    title: "Delivery not received",
    keywords: [
      "delivery not received",
      "not received",
      "not get",
      "didn't get",
      "did not get",
      "missing",
      "lost",
      "where is",
      "no scan",
      "scan gap",
      "delivered but not received",
      "delivered but missing",
    ],
    content: `Policy: Delivery not received / missing
- If status is DELIVERED and the customer says they do not have it, escalate (possible POD dispute).
- If last scan is stale or lastLocation indicates a scan gap, escalate as a missing-shipment investigation.
- Do not auto-resolve missing-shipment cases.`,
  },

  {
    id: "escalation",
    title: "Escalation",
    keywords: [
      "escalate",
      "escalation",
      "manager",
      "complaint",
      "dispute",
      "conflict",
      "human",
      "pod",
    ],
    content: `Policy: Escalation
Escalate to a human agent when:
- confidence is below 0.80
- shipment ID is missing or not found
- a required tool/API failed
- customer disputes a DELIVERED shipment
- shipment facts conflict (for example ticket claims lost, but status is OUT_FOR_DELIVERY with a fresh scan)
- missing shipment / scan gap
Human agents should review AI diagnosis, then contact the customer with an investigation ID.`,
  },
];

/**
 * Normalize search text so equivalent queries such as:
 *
 * DELIVERY_NOT_RECEIVED
 * delivery-not-received
 * delivery not received
 *
 * are treated as the same concept.
 */
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchSupportPolicy(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return {
      matched: false,
      policy: null,
      score: 0,
      query,
    };
  }

  let best = null;
  let bestScore = 0;

  for (const policy of policies) {
    const normalizedId = normalizeText(policy.id);
    const normalizedTitle = normalizeText(policy.title);

    let score = 0;

    // Exact policy ID/title match gets a strong score.
    if (normalizedQuery === normalizedId) {
      score += 6;
    }

    if (normalizedQuery === normalizedTitle) {
      score += 5;
    }

    // Phrase / keyword matching.
    for (const keyword of policy.keywords) {
      const normalizedKeyword = normalizeText(keyword);

      if (!normalizedKeyword) continue;

      if (normalizedQuery.includes(normalizedKeyword)) {
        // Multi-word matches are more informative.
        score += normalizedKeyword.split(" ").length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = policy;
    }
  }

  if (!best || bestScore === 0) {
    return {
      matched: false,
      policy: null,
      score: 0,
      query,
    };
  }

  return {
    matched: true,
    query,
    score: bestScore,
    policy: {
      id: best.id,
      title: best.title,
      content: best.content,
    },
  };
}