import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

function Card({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#16263d] p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/tickets")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-slate-400">Loading…</p>;

  const { metrics, tickets } = data;

  return (
    <div>
      <h2 className="text-2xl font-semibold">Operations dashboard</h2>
      <p className="text-slate-400 mt-1">Support tickets processed by the AI resolver.</p>
      <div className="grid grid-cols-4 gap-4 mt-6">
        <Card label="Total tickets" value={metrics.total} />
        <Card label="Auto resolved" value={metrics.autoResolved} />
        <Card label="Escalated" value={metrics.escalated} />
        <Card label="Average confidence" value={metrics.averageConfidence} />
      </div>
      <h3 className="mt-10 mb-3 text-lg font-medium">Recent tickets</h3>
      <TicketTable tickets={tickets.slice(0, 8)} />
    </div>
  );
}

export function TicketTable({ tickets }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-[#122033] text-slate-400 text-left">
          <tr>
            <th className="p-3">Ticket ID</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Issue</th>
            <th className="p-3">Shipment</th>
            <th className="p-3">Status</th>
            <th className="p-3">Confidence</th>
            <th className="p-3">Resolution</th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 && (
            <tr>
              <td className="p-4 text-slate-500" colSpan={7}>
                No tickets yet. Create one to run the workflow.
              </td>
            </tr>
          )}
          {tickets.map((t) => (
            <tr key={t.ticketId} className="border-t border-slate-800 hover:bg-slate-900/40">
              <td className="p-3">
                <Link className="text-sky-400" to={`/tickets/${t.ticketId}`}>
                  {t.ticketId}
                </Link>
              </td>
              <td className="p-3">{t.customerName}</td>
              <td className="p-3 max-w-xs truncate">{t.analysis?.intent || "—"}</td>
              <td className="p-3">{t.shipmentId || "—"}</td>
              <td className="p-3">{t.status}</td>
              <td className="p-3">{t.confidence ?? "—"}</td>
              <td className="p-3">{t.resolution || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
