export const STATUSES = [
  "CREATED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED_DELIVERY",
  "CANCELLED",
  "RETURNED",
];

/**
 * Demo catalog for a logistics SaaS. Facts here are the only shipment
 * facts the AI is allowed to use — the model must not invent extra events.
 */
export const shipments = {
  SHP10001: {
    shipmentId: "SHP10001",
    customerName: "Rahul Menon",
    origin: "Bengaluru, KA",
    destination: "Kochi, KL",
    status: "IN_TRANSIT",
    expectedDelivery: "2026-08-20",
    lastLocation: "Kochi Hub",
    lastUpdated: "2026-08-19T08:15:00Z",
    carrier: "SwiftHaul Express",
    delayReason: "Hub processing backlog",
    deliveryAttempts: 0,
  },
  SHP10002: {
    shipmentId: "SHP10002",
    customerName: "Priya Sharma",
    origin: "Mumbai, MH",
    destination: "Pune, MH",
    status: "DELIVERED",
    expectedDelivery: "2026-08-17",
    lastLocation: "Pune — Customer address",
    lastUpdated: "2026-08-17T14:40:00Z",
    carrier: "SwiftHaul Express",
    delayReason: null,
    deliveryAttempts: 1,
  },
  SHP10003: {
    shipmentId: "SHP10003",
    customerName: "Amit Patel",
    origin: "Ahmedabad, GJ",
    destination: "Surat, GJ",
    status: "FAILED_DELIVERY",
    expectedDelivery: "2026-08-18",
    lastLocation: "Surat Delivery Center",
    lastUpdated: "2026-08-18T16:05:00Z",
    carrier: "MetroLine Logistics",
    delayReason: "Recipient unavailable",
    deliveryAttempts: 2,
  },
  SHP10004: {
    shipmentId: "SHP10004",
    customerName: "Sneha Iyer",
    origin: "Chennai, TN",
    destination: "Hyderabad, TS",
    status: "CANCELLED",
    expectedDelivery: "2026-08-21",
    lastLocation: "Chennai Origin Facility",
    lastUpdated: "2026-08-16T11:00:00Z",
    carrier: "SwiftHaul Express",
    delayReason: "Cancelled by shipper",
    deliveryAttempts: 0,
  },
  SHP10005: {
    shipmentId: "SHP10005",
    customerName: "Vikram Singh",
    origin: "Delhi, DL",
    destination: "Jaipur, RJ",
    status: "OUT_FOR_DELIVERY",
    expectedDelivery: "2026-08-19",
    lastLocation: "Jaipur Local Hub",
    lastUpdated: "2026-08-19T05:20:00Z",
    carrier: "SwiftHaul Express",
    delayReason: null,
    deliveryAttempts: 0,
  },
  SHP10006: {
    shipmentId: "SHP10006",
    customerName: "Ananya Reddy",
    origin: "Hyderabad, TS",
    destination: "Visakhapatnam, AP",
    status: "CREATED",
    expectedDelivery: "2026-08-22",
    lastLocation: "Hyderabad Origin Facility",
    lastUpdated: "2026-08-19T02:10:00Z",
    carrier: "Coastal Freight",
    delayReason: null,
    deliveryAttempts: 0,
  },
  SHP10007: {
    shipmentId: "SHP10007",
    customerName: "Mohammed Irfan",
    origin: "Kolkata, WB",
    destination: "Bhubaneswar, OD",
    status: "PICKED_UP",
    expectedDelivery: "2026-08-21",
    lastLocation: "Kolkata Pickup Hub",
    lastUpdated: "2026-08-19T06:45:00Z",
    carrier: "MetroLine Logistics",
    delayReason: null,
    deliveryAttempts: 0,
  },
  SHP10008: {
    shipmentId: "SHP10008",
    customerName: "Kavya Nair",
    origin: "Kochi, KL",
    destination: "Bengaluru, KA",
    status: "RETURNED",
    expectedDelivery: "2026-08-15",
    lastLocation: "Kochi Returns Desk",
    lastUpdated: "2026-08-18T09:30:00Z",
    carrier: "SwiftHaul Express",
    delayReason: "Address rejected by consignee",
    deliveryAttempts: 3,
  },
  SHP10009: {
    shipmentId: "SHP10009",
    customerName: "Arjun Das",
    origin: "Guwahati, AS",
    destination: "Patna, BR",
    status: "IN_TRANSIT",
    expectedDelivery: "2026-08-16",
    lastLocation: "Unknown — scan gap",
    lastUpdated: "2026-08-14T21:00:00Z",
    carrier: "NorthLink Cargo",
    delayReason: "No scan for 5 days (possible missing shipment)",
    deliveryAttempts: 0,
  },
  SHP10010: {
    shipmentId: "SHP10010",
    customerName: "Rahul Menon",
    origin: "Noida, UP",
    destination: "Lucknow, UP",
    status: "DELIVERED",
    expectedDelivery: "2026-08-18",
    lastLocation: "Lucknow — Neighbor / gated community desk",
    lastUpdated: "2026-08-18T12:12:00Z",
    carrier: "SwiftHaul Express",
    delayReason: null,
    deliveryAttempts: 1,
  },,
  SHP10011: {
    shipmentId: "SHP10011",
    customerName: "Rohit Kulkarni",
    origin: "Pune, MH",
    destination: "Goa, GA",
    status: "IN_TRANSIT",
    expectedDelivery: "2026-08-20",
    lastLocation: "Panaji Gateway",
    lastUpdated: "2026-08-19T07:00:00Z",
    carrier: "Coastal Freight",
    delayReason: "Weather hold at Konkan corridor",
    deliveryAttempts: 0,
  },
  SHP10012: {
    shipmentId: "SHP10012",
    customerName: "Meera Joshi",
    origin: "Indore, MP",
    destination: "Bhopal, MP",
    status: "FAILED_DELIVERY",
    expectedDelivery: "2026-08-19",
    lastLocation: "Bhopal Delivery Center",
    lastUpdated: "2026-08-19T10:50:00Z",
    carrier: "MetroLine Logistics",
    delayReason: "Incomplete address / access restricted",
    deliveryAttempts: 3,
  },
};

export const shipmentEvents = {
  SHP10001: [
    { at: "2026-08-16T09:00:00Z", location: "Bengaluru Origin", code: "PICKED_UP", note: "Parcel collected from shipper." },
    { at: "2026-08-17T18:20:00Z", location: "Bengaluru Sortation", code: "IN_TRANSIT", note: "Departed origin hub." },
    { at: "2026-08-19T08:15:00Z", location: "Kochi Hub", code: "IN_TRANSIT", note: "Arrived Kochi Hub. Processing backlog delaying outbound." },
  ],
  SHP10002: [
    { at: "2026-08-16T08:00:00Z", location: "Mumbai Origin", code: "PICKED_UP", note: "Collected." },
    { at: "2026-08-17T07:30:00Z", location: "Pune Local Hub", code: "OUT_FOR_DELIVERY", note: "Loaded on van 14." },
    { at: "2026-08-17T14:40:00Z", location: "Pune — Customer address", code: "DELIVERED", note: "Signed by Priya Sharma." },
  ],
  SHP10003: [
    { at: "2026-08-16T10:00:00Z", location: "Ahmedabad Origin", code: "PICKED_UP", note: "Collected." },
    { at: "2026-08-17T19:00:00Z", location: "Surat Delivery Center", code: "OUT_FOR_DELIVERY", note: "Attempt 1 — door locked." },
    { at: "2026-08-18T16:05:00Z", location: "Surat Delivery Center", code: "FAILED_DELIVERY", note: "Attempt 2 — recipient unavailable. Held for pickup." },
  ],
  SHP10004: [
    { at: "2026-08-16T09:30:00Z", location: "Chennai Origin Facility", code: "CREATED", note: "Label created." },
    { at: "2026-08-16T11:00:00Z", location: "Chennai Origin Facility", code: "CANCELLED", note: "Shipper cancelled before pickup." },
  ],
  SHP10005: [
    { at: "2026-08-18T06:00:00Z", location: "Delhi Origin", code: "PICKED_UP", note: "Collected." },
    { at: "2026-08-18T22:10:00Z", location: "Jaipur Local Hub", code: "IN_TRANSIT", note: "Arrived destination city." },
    { at: "2026-08-19T05:20:00Z", location: "Jaipur Local Hub", code: "OUT_FOR_DELIVERY", note: "On courier route J-09." },
  ],
  SHP10006: [
    { at: "2026-08-19T02:10:00Z", location: "Hyderabad Origin Facility", code: "CREATED", note: "Awaiting first-mile pickup." },
  ],
  SHP10007: [
    { at: "2026-08-19T06:45:00Z", location: "Kolkata Pickup Hub", code: "PICKED_UP", note: "First-mile complete. Pending linehaul." },
  ],
  SHP10008: [
    { at: "2026-08-12T09:00:00Z", location: "Kochi Origin", code: "PICKED_UP", note: "Collected." },
    { at: "2026-08-14T11:00:00Z", location: "Bengaluru Delivery Center", code: "FAILED_DELIVERY", note: "Consignee refused shipment." },
    { at: "2026-08-18T09:30:00Z", location: "Kochi Returns Desk", code: "RETURNED", note: "Returned to origin." },
  ],
  SHP10009: [
    { at: "2026-08-12T08:00:00Z", location: "Guwahati Origin", code: "PICKED_UP", note: "Collected." },
    { at: "2026-08-14T21:00:00Z", location: "Siliguri Transit", code: "IN_TRANSIT", note: "Last successful scan. No subsequent hub arrival." },
  ],
  SHP10010: [
    { at: "2026-08-17T09:00:00Z", location: "Noida Origin", code: "PICKED_UP", note: "Collected." },
    { at: "2026-08-18T08:00:00Z", location: "Lucknow Local Hub", code: "OUT_FOR_DELIVERY", note: "On route." },
    { at: "2026-08-18T12:12:00Z", location: "Lucknow — Neighbor / gated community desk", code: "DELIVERED", note: "Left with community desk. Photo POD on file." },
  ],
  SHP10011: [
    { at: "2026-08-17T10:00:00Z", location: "Pune Origin", code: "PICKED_UP", note: "Collected." },
    { at: "2026-08-19T07:00:00Z", location: "Panaji Gateway", code: "IN_TRANSIT", note: "Weather hold. Linehaul paused." },
  ],
  SHP10012: [
    { at: "2026-08-17T07:00:00Z", location: "Indore Origin", code: "PICKED_UP", note: "Collected." },
    { at: "2026-08-18T15:00:00Z", location: "Bhopal Delivery Center", code: "FAILED_DELIVERY", note: "Attempt 1 — incomplete address." },
    { at: "2026-08-19T09:10:00Z", location: "Bhopal Delivery Center", code: "FAILED_DELIVERY", note: "Attempt 2 — access restricted." },
    { at: "2026-08-19T10:50:00Z", location: "Bhopal Delivery Center", code: "FAILED_DELIVERY", note: "Attempt 3 — held. Customer action required." },
  ],
};

export function getShipment(shipmentId) {
  if (!shipmentId) return null;
  return shipments[String(shipmentId).toUpperCase()] || null;
}

export function getEvents(shipmentId) {
  if (!shipmentId) return null;
  const id = String(shipmentId).toUpperCase();
  if (!shipments[id]) return null;
  return shipmentEvents[id] || [];
}
