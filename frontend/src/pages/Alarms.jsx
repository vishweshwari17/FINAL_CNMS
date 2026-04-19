import { useEffect, useState, useRef, useCallback } from "react";
import { getAlarms, getLnmsNodes, getCorrelatedAlarms } from "../api/api";
import { SevBadge, NodeBadge, fmt } from "../components/Badges";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Calendar, Search } from "lucide-react";

export default function Alarms({ correlated = false }) {
  const [alarms, setAlarms]   = useState([]);
  const [nodes, setNodes]     = useState([]);
  const [statusF, setStatusF] = useState("All");
  const [lnmsF, setLnmsF]     = useState("ALL");
  const [sevF, setSevF]       = useState("All");
  const [deviceF, setDeviceF] = useState("");
  const [startDateF, setStartDateF] = useState("");
  const [endDateF, setEndDateF] = useState("");
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        status: statusF === "All" ? null : statusF,
        lnms_node_id: lnmsF === "ALL" ? null : lnmsF,
        severity: sevF === "All" ? null : sevF,
        device_name: deviceF,
        start_date: startDateF,
        end_date: endDateF,
        is_correlated: correlated ? true : null
      };
      const [a, n] = await Promise.all([
        getAlarms(params),
        getLnmsNodes()
      ]);
      setAlarms(a.data || []); 
      setNodes(n.data || []);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusF, lnmsF, sevF, startDateF, endDateF]);

  const highlightTimeoutRef = useRef(null);
  const handleNewAlarm = useCallback((e) => {
    const newAlarm = e.detail;
    // Refresh the list to include the new alarm
    load();
    
    // Highlight the new alarm row
    setHighlightedId(newAlarm.alarm_uid);
    
    // Reset highlight after 10 seconds, clearing any previous timeout
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedId(null);
      highlightTimeoutRef.current = null;
    }, 10000);
  }, [load]);

  useEffect(() => {
    window.addEventListener("NEW_ALARM_RECEIVED", handleNewAlarm);
    return () => {
      window.removeEventListener("NEW_ALARM_RECEIVED", handleNewAlarm);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, [handleNewAlarm]);

  useEffect(() => {
    const timer = setTimeout(load, 500);
    return () => clearTimeout(timer);
  }, [deviceF]);

  // Frontend-only extra logic, although backend handles correlation now
  const filtered = alarms.filter(a => {
    // keeping frontend fallback check as extra safety if needed
    if (correlated && !a.alarm_uid?.includes("CORR") && !a.correlation_id) return true;
    return true;
  });

  const LNMS_COLOR = { "LNMS-MUM-01":"#2563eb","LNMS-BLR-02":"#7c3aed" };

  return (
    <div className="p-6 main-content min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-slate-800">{correlated ? "Correlated Alarms" : "Incoming Alarms"}</h1>
          <p className="text-small text-gray-500 mt-0.5">Live sync from LNMS nodes · {filtered.length} alarms</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-small text-gray-500 hover:text-blue-600 border border-gray-200 bg-white px-3 py-1.5 rounded-lg shadow-sm">
          <RefreshCw size={14} className={loading?"animate-spin":""} /> Refresh
        </button>
      </div>

      {/* Filters Row 1: Status & Severity */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex gap-1">
          {["All","Active","Resolved"].map(f=>(
            <button key={f} onClick={()=>setStatusF(f)}
              className={`px-3 py-1.5 rounded-lg text-small font-semibold transition-all ${statusF===f?"bg-blue-600 text-white shadow-sm":"text-gray-600 hover:bg-gray-50"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex gap-1">
          {["All","Critical","Major","Minor","Warning"].map(f=>(
            <button key={f} onClick={()=>setSevF(f)}
              className={`px-3 py-1.5 rounded-lg text-small font-semibold transition-all ${sevF===f?"bg-blue-600 text-white shadow-sm":"text-gray-600 hover:bg-gray-50"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {["ALL",...nodes.map(n=>n.node_id)].map(l=>{
            const c = LNMS_COLOR[l]||"#475569";
            const isActive = lnmsF===l;
            return (
              <button key={l} onClick={()=>setLnmsF(l)}
                className={`px-3 py-1.5 rounded-lg text-badge font-mono font-bold border transition-all ${isActive?'text-white shadow-sm':'bg-transparent'}`}
                style={{borderColor:isActive?c:c+'44', background:isActive?c:'transparent', color:isActive?'#fff':c}}>
                {l==="ALL"?"All Nodes":l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Row 2: Search & Dates */}
      <div className="flex flex-wrap items-center gap-3 mb-5 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-1">
          <span className="text-small font-bold text-gray-400 uppercase flex items-center gap-1"><Search size={10}/> Device Name</span>
          <input
            placeholder="Search by hostname..."
            value={deviceF}
            onChange={(e) => setDeviceF(e.target.value)}
            className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-1.5 text-small w-64 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto bg-blue-50 p-2 rounded-lg border border-blue-100">
           <div className="flex flex-col gap-1">
            <span className="text-small font-bold text-blue-400 uppercase flex items-center gap-1"><Calendar size={10}/> Raised From</span>
            <input
              type="date"
              value={startDateF}
              onChange={(e) => setStartDateF(e.target.value)}
              className="border border-blue-200 bg-white rounded px-2 py-1 text-small outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-small font-bold text-blue-400 uppercase flex items-center gap-1"><Calendar size={10}/> To</span>
            <input
              type="date"
              value={endDateF}
              onChange={(e) => setEndDateF(e.target.value)}
              className="border border-blue-200 bg-white rounded px-2 py-1 text-small outline-none focus:border-blue-500"
            />
          </div>
          {(startDateF || endDateF) && (
            <button 
              onClick={() => { setStartDateF(""); setEndDateF(""); }}
              className="mt-4 text-badge text-blue-600 font-bold hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-blue-700">
            <tr>
              {["Alarm ID","LNMS Node","Device","Type","Severity","Status","Raised At","Linked Ticket"].map(h=>(
                <th key={h} className="table-cell-padded text-table-header uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">Loading…</td></tr>}
            {!loading && filtered.length===0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No alarms matching filter</td></tr>}
            {filtered.map(a => (
              <tr key={a.id} className={`hover:bg-blue-50 cursor-pointer transition-all duration-500 group ${highlightedId === a.alarm_uid ? "bg-yellow-100 ring-2 ring-yellow-400 ring-inset" : ""}`}
                onClick={()=>{ if(a.alarm_uid) navigate(`/tickets?search=${a.alarm_uid}`); }}>
                <td className="table-cell-padded text-badge font-mono text-blue-600 group-hover:underline">
                  {highlightedId === a.alarm_uid && <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-1 animate-ping"></span>}
                  {a.alarm_uid}
                </td>
                <td className="table-cell-padded"><NodeBadge nodeId={a.lnms_node_id} /></td>
                <td className="table-cell-padded text-badge font-mono text-gray-600 font-medium">{a.device_name}</td>
                <td className="table-cell-padded text-body text-gray-700">{a.alarm_type}</td>
                <td className="table-cell-padded"><SevBadge severity={a.severity} /></td>
                <td className="table-cell-padded">
                  {(() => {
                    const isActive = ["OPEN", "ACK", "ACTIVE", "Active"].includes(a.status);
                    return (
                      <span className={`text-badge font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                        {isActive ? "● Active" : "✓ Resolved"}
                      </span>
                    );
                  })()}
                </td>
                <td className="table-cell-padded text-small text-gray-400 font-mono whitespace-nowrap">{fmt(a.raised_at)}</td>
                <td className="table-cell-padded">
                  <div className="flex items-center gap-1 text-badge font-bold text-blue-500 uppercase group-hover:text-blue-700">
                    View Ticket →
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}