import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAlarms, getIncidents, getTickets } from "../api/api";
import { formatDistanceToNow } from "date-fns";

export default function NotificationDropdown({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [alarmsRes, incidentsRes, ticketsRes] = await Promise.all([
          getAlarms({ limit: 10, status: "ACTIVE" }),
          getIncidents({ limit: 10, status: "OPEN" }),
          getTickets({ limit: 10, status: "OPEN" })
        ]);

        const consolidated = [
          ...alarmsRes.data.map(a => ({
            id: a.alarm_uid,
            type: "ALARM",
            title: a.alarm_type || "Network Alarm",
            severity: a.severity,
            time: new Date(a.raised_at),
            link: "/alarms"
          })),
          ...(incidentsRes.data.items || []).map(i => ({
            id: i.id,
            type: "INCIDENT",
            title: i.title,
            severity: i.severity,
            time: new Date(i.created_at),
            link: "/incident-list"
          })),
          ...ticketsRes.data.map(t => ({
            id: t.ticket_uid,
            type: "TICKET",
            title: t.title,
            severity: t.severity,
            time: new Date(t.created_at),
            link: `/tickets/${t.ticket_uid}`
          }))
        ];

        // Sort by time descending
        consolidated.sort((a, b) => b.time - a.time);
        setItems(consolidated.slice(0, 15));
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getSeverityColor = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s === "critical") return "bg-red-500";
    if (s === "major" || s === "high") return "bg-orange-500";
    if (s === "minor" || s === "medium") return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getTypeIcon = (type) => {
    if (type === "ALARM") return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    if (type === "INCIDENT") return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
    return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
  };

  return (
    <div className="absolute right-0 mt-3 w-96 max-h-[32rem] overflow-hidden bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Notifications</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">{items.length} NEW</span>
      </div>

      <div className="overflow-y-auto max-h-[28rem] custom-scrollbar">
        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Syncing Tactical Feed...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-400 font-medium italic">No active tactical alerts found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  navigate(item.link);
                  onClose();
                }}
                className="p-4 hover:bg-blue-50/50 cursor-pointer transition-all group flex items-start gap-4"
              >
                <div className={`mt-1 p-2 rounded-lg ${getSeverityColor(item.severity)} text-white shadow-lg shadow-current/20`}>
                  {getTypeIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
                      {item.type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {formatDistanceToNow(item.time, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div 
        className="p-3 border-t border-slate-100 bg-slate-50/50 text-center group cursor-pointer"
        onClick={() => { navigate("/alarms"); onClose(); }}
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">
          View Operations Center →
        </span>
      </div>
    </div>
  );
}
