import { useEffect, useState } from "react";
import { api } from "../api.js";
import { TicketTable } from "./Dashboard.jsx";

export default function Tickets() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/tickets")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-slate-400">Loading…</p>;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Tickets</h2>
      <TicketTable tickets={data.tickets} />
    </div>
  );
}
