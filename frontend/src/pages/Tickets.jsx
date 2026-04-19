// src/pages/Tickets.jsx
import { useEffect, useState } from "react";
import { getTickets, getLnmsNodes, handleAcknowledgeTicket, handleResolveTicket, handleCloseTicket, fullSyncFromCnms } from "../api/api";
import { SevBadge, StatusBadge, NodeBadge, SlaBadge, AlarmBadge, fmt } from "../components/Badges";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RefreshCw, ChevronLeft, ChevronRight, Calendar, Filter } from "lucide-react";

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusF, setStatusF] = useState("");
  const [severityF, setSeverityF] = useState("");
  const [nodeF, setNodeF] = useState("");
  const [alarmStatusF, setAlarmStatusF] = useState("");
  const [startDateF, setStartDateF] = useState("");
  const [endDateF, setEndDateF] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      await fullSyncFromCnms();

      const params = {
        search,
        status: statusF,
        severity: severityF,
        node_id: nodeF,
        start_date: startDateF,
        end_date: endDateF
      };

      if (alarmStatusF === "ACTIVE_LNMS") {
        params.alarm_status = "ACTIVE";
        params.alarm_source = "LNMS";
      } else if (alarmStatusF === "ACTIVE_SPIC") {
        params.alarm_status = "ACTIVE";
        params.alarm_source = "SPIC-NMS";
      } else if (alarmStatusF) {
        params.alarm_status = alarmStatusF;
      }

      const [t, n] = await Promise.all([getTickets(params), getLnmsNodes()]);
      setTickets(t.data || []);
      setNodes(n.data || []);
    } catch (e) {
      console.error("Tickets load failed:", e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusF, severityF, nodeF, alarmStatusF, startDateF, endDateF]);
  
  // Search has a small debounce or we can just trigger it on input/enter. 
  // For now let's add an effect for search too but maybe with a timeout.
  useEffect(() => {
    const timer = setTimeout(load, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const counts = {
    Total: tickets.length,
    Open: tickets.filter(t => t.status === "OPEN").length,
    ACK: tickets.filter(t => t.status === "ACK").length,
    Resolved: tickets.filter(t => t.status === "RESOLVED").length,
    Closed: tickets.filter(t => t.status === "CLOSED").length
  };

  // Since we filter on backend, 'filtered' is just 'tickets' now.
  const filtered = tickets;

  const pages = Math.ceil(filtered.length / perPage);
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  const formatTime = (time) => {
    if (!time) return "—";
    return new Date(time).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  return (
    <div className="p-6 min-h-full main-content">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-slate-800">Tickets</h1>
          <p className="text-small">Auto-created by LNMS · resolved by CNMS</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-badge text-gray-500 hover:text-blue-600 border border-gray-200 bg-white px-3 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI */}
      <div className="grid-layout grid-cols-5 mb-5">
        {[
          { l: "Total", v: counts.Total, c: "text-slate-800" },
          { l: "Open", v: counts.Open, c: "text-blue-600" },
          { l: "ACK", v: counts.ACK, c: "text-orange-600" },
          { l: "Resolved", v: counts.Resolved, c: "text-emerald-600" },
          { l: "Closed", v: counts.Closed, c: "text-slate-600" }
        ].map(k => (
          <div key={k.l} className="bg-white border border-gray-200 rounded-xl card-sm shadow-sm">
            <div className="text-badge mb-1 uppercase font-bold text-slate-500">{k.l}</div>
            <div className={`text-2xl font-semibold font-mono ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* QUICK STATUS FILTER */}
      <div className="flex gap-2 mb-4">
        {["", "OPEN", "ACK", "RESOLVED", "CLOSED"].map(s => (
          <button
            key={s || "ALL"}
            onClick={() => { setStatusF(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-badge transition-all ${
              statusF === s ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* SEARCH + FILTER PANEL */}
      <div className="flex flex-wrap items-center gap-3 mb-5 bg-white card-sm rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-1">
          <span className="text-badge font-bold text-gray-400 uppercase">Search</span>
          <input
            placeholder="Ticket / Device / Alarm UID"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-1.5 text-badge w-64 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-badge font-bold text-gray-400 uppercase">Severity</span>
          <select
            value={severityF}
            onChange={(e) => { setSeverityF(e.target.value); setPage(1); }}
            className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-1.5 text-badge focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Severity</option>
            <option>Critical</option>
            <option>Major</option>
            <option>Minor</option>
            <option>Warning</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-badge font-bold text-gray-400 uppercase">Node</span>
          <select
            value={nodeF}
            onChange={(e) => { setNodeF(e.target.value); setPage(1); }}
            className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-1.5 text-badge focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="">All Nodes</option>
            {nodes.map(n => <option key={n.node_id} value={n.node_id}>{n.node_id}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-badge font-bold text-gray-400 uppercase">Alarm Status</span>
          <select
            value={alarmStatusF}
            onChange={(e) => { setAlarmStatusF(e.target.value); setPage(1); }}
            className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-1.5 text-badge focus:ring-2 focus:ring-blue-500 outline-none font-semibold transition-all"
          >
            <option value="">All Alarm States</option>
            <option value="LNMS-LOCAL-01">Resolved by LNMS-LOCAL-01</option>
            <option value="LNMS-COMPANY-01">Resolved by LNMS-COMPANY-01</option>
            <option value="Resolved by CNMS">Resolved by CNMS</option>
            <option value="ACTIVE">Active in Remote</option>
            <option value="Ack by LNMS">Ack by LNMS</option>
            <option value="Ack by SPIC-NMS">Ack by SPIC-NMS</option>
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto bg-blue-50 p-2 rounded-lg border border-blue-100">
          <div className="flex flex-col gap-1">
            <span className="text-badge font-bold text-blue-400 uppercase flex items-center gap-1"><Calendar size={10}/> From</span>
            <input
              type="date"
              value={startDateF}
              onChange={(e) => { setStartDateF(e.target.value); setPage(1); }}
              className="border border-blue-200 bg-white rounded px-2 py-1 text-badge outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-badge font-bold text-blue-400 uppercase flex items-center gap-1"><Calendar size={10}/> To</span>
            <input
              type="date"
              value={endDateF}
              onChange={(e) => { setEndDateF(e.target.value); setPage(1); }}
              className="border border-blue-200 bg-white rounded px-2 py-1 text-badge outline-none focus:border-blue-500 transition-all"
            />
          </div>
          {(startDateF || endDateF) && (
            <button 
              onClick={() => { setStartDateF(""); setEndDateF(""); setPage(1); }}
              className="mt-4 text-badge text-blue-600 font-bold hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-5">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-table-header text-blue-700">
            <tr>
              {["ID", "Title", "LNMS Node", "Device", "Severity", "Tkt Status", "Alarm Status", "SLA", "Created", "Actions"].map(h => (
                <th key={h} className="table-cell-padded font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">Loading…</td>
              </tr>
            )}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">No tickets found</td>
              </tr>
            )}
            {visible.map(t => {
              const isBreached = t.sla_status === "BREACHED" && t.status !== "CLOSED" && t.status !== "RESOLVED";
              return (
              <tr key={t.id} className={`cursor-pointer transition-colors ${isBreached ? 'bg-red-50/50 hover:bg-red-100/50 border-l-4 border-l-red-500' : 'hover:bg-slate-50/50'}`} onClick={() => navigate(`/tickets/${t.id}`)}>
                <td className="table-cell-padded text-body font-mono text-blue-600">{t.ticket_uid || t.short_id || t.id}</td>
                <td className="table-cell-padded text-body font-medium text-gray-800">
                  {isBreached && <span className="text-red-500 mr-2 animate-pulse" title="SLA Breached">⚠</span>}
                  {t.title}
                </td>
                <td className="table-cell-padded"><NodeBadge nodeId={t.lnms_node_id} /></td>
                <td className="table-cell-padded text-body font-mono text-gray-600">{t.device_name}</td>
                <td className="table-cell-padded"><SevBadge severity={t.severity} /></td>
                <td className="table-cell-padded"><StatusBadge status={t.status} /></td>
                <td className="table-cell-padded"><AlarmBadge status={t.alarm_status} source={t.alarm_source} updatedAt={t.last_alarm_update} /></td>
                <td className="table-cell-padded"><SlaBadge sla_status={t.sla_status} used={t.sla_used} total={t.sla_limit_minutes || t.sla_minutes} status={t.status} created_at={t.created_at} /></td>
                <td className="table-cell-padded text-small font-mono whitespace-nowrap">{fmt(t.created_at).split(',')[0]}</td>
                <td className="table-cell-padded flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${t.id}`); }} className="px-3 py-1 bg-gray-800 text-white text-badge rounded hover:bg-gray-700 shadow-sm transition-all">View</button>
                  {t.status === "OPEN" && <button onClick={async (e) => { e.stopPropagation(); await handleAcknowledgeTicket(t.id); load(); }} className="px-3 py-1 bg-orange-500 text-white text-badge rounded hover:bg-orange-600 shadow-sm transition-all">ACK</button>}
                  {t.status === "ACK" && <button onClick={async (e) => { e.stopPropagation(); const note = prompt("Enter resolution note") || "Resolved via UI"; await handleResolveTicket(t.id, "Admin", note); load(); }} className="px-3 py-1 bg-green-600 text-white text-badge rounded hover:bg-green-700 shadow-sm transition-all">Resolve</button>}
                  {t.status === "RESOLVED" && <button onClick={async (e) => { e.stopPropagation(); if(confirm("Close this ticket?")) { await handleCloseTicket(t.id); load(); } }} className="px-3 py-1 bg-blue-600 text-white text-badge rounded hover:bg-blue-700 shadow-sm transition-all">Close</button>}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION & ROW CUSTOMIZATION */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="text-small font-medium">
            Showing <span className="text-gray-800 font-mono">{(page - 1) * perPage + 1}</span> to <span className="text-gray-800 font-mono">{Math.min(page * perPage, filtered.length)}</span> of <span className="text-blue-600 font-mono font-semibold">{filtered.length}</span> tickets
          </div>
          <div className="h-4 w-[1px] bg-gray-200" />
          <div className="flex items-center gap-2">
             <span className="text-badge text-gray-400 uppercase font-bold">Rows Per Page:</span>
             <select 
               value={perPage} 
               onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
               className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-badge font-mono text-gray-700 outline-none focus:border-blue-500 transition-all"
             >
               {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
             </select>
          </div>
        </div>

        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setPage(p => Math.max(p - 1, 1))} 
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: pages }, (_, i) => {
                const p = i + 1;
                // Show first, last, and range around current
                if (p === 1 || p === pages || (p >= page - 1 && p <= page + 1)) {
                  return (
                    <button 
                      key={p} 
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] h-8 text-badge font-mono font-semibold rounded-lg transition-all ${
                        page === p 
                          ? "bg-blue-600 text-white shadow-md shadow-blue-200 translate-y-[-1px]" 
                          : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      {p}
                    </button>
                  );
                }
                if (p === 2 || p === pages - 1) return <span key={p} className="text-gray-300 px-1">···</span>;
                return null;
              })}
            </div>

            <button 
              onClick={() => setPage(p => Math.min(p + 1, pages))} 
              disabled={page === pages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
