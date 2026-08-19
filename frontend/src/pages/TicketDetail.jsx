import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";

function Block({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#16263d] p-4">
      <h3 className="text-sm uppercase tracking-wide text-sky-400 mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Pre({ value }) {
  return (
    <pre className="text-xs whitespace-pre-wrap text-slate-200 overflow-x-auto">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function TicketDetail() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/tickets/${ticketId}`)
      .then(setTicket)
      .catch((e) => setError(e.message));
  }, [ticketId]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!ticket) return <p className="text-slate-400">Loading…</p>;

  const steps = ticket.timeline || [];

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <p className="text-xs text-slate-400">
          {ticket.ticketId} · provider {ticket.provider} · {ticket.elapsedMs} ms
        </p>
        <h2 className="text-2xl font-semibold">
          {ticket.status}{" "}
          <span className="text-base font-normal text-slate-400">
            confidence {ticket.confidence}
          </span>
        </h2>
      </div>

      <Block title="1. Customer ticket">
        <p className="font-medium">{ticket.customerName}</p>
        <p className="mt-2 text-slate-200">{ticket.message}</p>
      </Block>

      <Block title="2. AI classification">
        <Pre value={ticket.analysis} />
      </Block>

      <Block title="3–4. Tool calls and results">
        {(ticket.toolTrace || []).map((call, i) => (
          <div key={i} className="mb-3 border-b border-slate-700 pb-3 last:border-0">
            <p className="text-sm font-medium">
              {call.name} {call.ok ? "· ok" : call.skipped ? "· skipped" : "· failed"}
            </p>
            <Pre value={call} />
          </div>
        ))}
      </Block>

      <Block title="5. Retrieved policy">
        <Pre value={ticket.retrievedPolicy || "No policy matched"} />
      </Block>

      <Block title="6–7. Diagnosis and confidence">
        <Pre value={ticket.diagnosis} />
      </Block>

      <Block title="8. Customer response">
        <Pre value={ticket.customerResponse} />
      </Block>

      {ticket.escalation && (
        <Block title="9. Escalation (human-in-the-loop)">
          <Pre value={ticket.escalation} />
        </Block>
      )}

      <Block title="Execution timeline">
        <ol className="border-l border-slate-600 ml-2 space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="pl-4">
              <p className="text-sm font-medium">{s.step}</p>
              <p className="text-xs text-slate-500">{s.at}</p>
              {s.detail && s.step !== "customer_response" ? (
                <Pre value={s.detail} />
              ) : (
                <p className="text-xs text-slate-400">{String(s.detail || "")}</p>
              )}
            </li>
          ))}
        </ol>
      </Block>
    </div>
  );
}
