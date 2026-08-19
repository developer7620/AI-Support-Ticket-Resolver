import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");
const ticketsPath = process.env.TICKETS_PATH || path.join(dataDir, "tickets.json");

function ensureFile() {
  const dir = path.dirname(ticketsPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ticketsPath)) fs.writeFileSync(ticketsPath, "[]", "utf8");
}

function readTickets() {
  ensureFile();
  try {
    const raw = fs.readFileSync(ticketsPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("DATABASE_READ_FAILED");
  }
}

function writeTickets(tickets) {
  ensureFile();
  try {
    fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2), "utf8");
  } catch {
    throw new Error("DATABASE_WRITE_FAILED");
  }
}

export function listTickets() {
  return readTickets().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTicket(ticketId) {
  return readTickets().find((t) => t.ticketId === ticketId) || null;
}

export function saveTicket(ticket) {
  const tickets = readTickets();
  const idx = tickets.findIndex((t) => t.ticketId === ticket.ticketId);
  if (idx >= 0) tickets[idx] = ticket;
  else tickets.push(ticket);
  writeTickets(tickets);
  return ticket;
}

export function nextTicketId() {
  const tickets = readTickets();
  const n = tickets.length + 1;
  return `TCK${String(n).padStart(5, "0")}`;
}

export function resetTickets(tickets = []) {
  writeTickets(tickets);
}
