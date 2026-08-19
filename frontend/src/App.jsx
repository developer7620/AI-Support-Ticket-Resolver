import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Tickets from "./pages/Tickets.jsx";
import CreateTicket from "./pages/CreateTicket.jsx";
import TicketDetail from "./pages/TicketDetail.jsx";

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm ${isActive ? "bg-sky-700 text-white" : "text-slate-300 hover:bg-slate-800"}`;

export default function App() {
  return (
    <div className="min-h-full flex">
      <aside className="w-56 shrink-0 border-r border-slate-800 bg-[#0f1c2e] p-4">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-sky-400">SwiftHaul CX</p>
          <h1 className="text-lg font-semibold">Ticket Resolver</h1>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink to="/" className={linkClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/tickets" className={linkClass}>
            Tickets
          </NavLink>
          <NavLink to="/tickets/new" className={linkClass}>
            Create Ticket
          </NavLink>
        </nav>
        <p className="mt-10 text-xs text-slate-500">AI-assisted logistics support. Human-in-the-loop on low confidence.</p>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/new" element={<CreateTicket />} />
          <Route path="/tickets/:ticketId" element={<TicketDetail />} />
        </Routes>
      </main>
    </div>
  );
}
