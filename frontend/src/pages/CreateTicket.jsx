import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

const SAMPLES = [
  {
    label: "Delayed (auto-resolve)",
    customerName: "Rahul Menon",
    message: "Where is SHP10001? It is delayed and I am frustrated. Please share an update.",
  },
  {
    label: "Failed delivery",
    customerName: "Amit Patel",
    message: "Failed delivery for SHP10003. Nobody was available. What happens next?",
  },
  {
    label: "Delivered dispute (escalate)",
    customerName: "Neha Gupta",
    message: "I did not receive SHP10010. Your system says delivered but it is missing.",
  },
  {
    label: "Missing shipment (escalate)",
    customerName: "Arjun Das",
    message: "SHP10009 has no movement. I think the shipment is lost.",
  },
  {
    label: "Unknown ID (escalate)",
    customerName: "Guest User",
    message: "Track SHP00000 please, it is late.",
  },
];

export default function CreateTicket() {
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("Rahul Menon");
  const [message, setMessage] = useState(SAMPLES[0].message);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const ticket = await api("/api/tickets", {
        method: "POST",
        body: JSON.stringify({ customerName, message }),
      });
      navigate(`/tickets/${ticket.ticketId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold">Create ticket</h2>
      <p className="text-slate-400 mt-1 mb-6">
        Submitting runs the full workflow: classify → tools → policy → diagnosis → resolve or escalate.
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            type="button"
            className="text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => {
              setCustomerName(s.customerName);
              setMessage(s.message);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-slate-400">Customer name</span>
          <input
            className="mt-1 w-full rounded-lg bg-[#16263d] border border-slate-700 px-3 py-2"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Issue</span>
          <textarea
            className="mt-1 w-full rounded-lg bg-[#16263d] border border-slate-700 px-3 py-2 min-h-36"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          disabled={busy}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 rounded-lg font-medium"
        >
          {busy ? "Running workflow…" : "Submit ticket"}
        </button>
      </form>
    </div>
  );
}
