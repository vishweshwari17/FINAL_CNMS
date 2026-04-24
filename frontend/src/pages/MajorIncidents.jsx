import { useState, useEffect } from "react";
import { getMajorIncidents } from "../api/api";
import { useNavigate } from "react-router-dom";
import { 
  ShieldAlert, AlertCircle, Clock, ChevronRight, 
  ExternalLink, Zap, Activity, Info
} from "lucide-react";

function MajorIncidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await getMajorIncidents();
      setIncidents(res.data);
    } catch (err) {
      console.error("Error loading major incidents", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 main-content min-h-screen font-sans">
      <div className="max-w-7xl mx-auto mt-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Page Title */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-800 flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-red-600 rounded-2xl text-white shadow-xl shadow-red-500/30">
                <ShieldAlert size={32} />
              </div>
              Major Incident War Room
            </h1>
            <p className="text-[14px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Strategic Response Terminal for Critical Outages</p>
          </div>
          <div className="flex items-center gap-3 bg-red-50 text-red-600 px-6 py-2.5 rounded-full font-black text-badge uppercase border border-red-100 shadow-sm animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            Live Sync: Active
          </div>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard label="Active Major Incidents" value={incidents.length} color="rose" icon={<Activity size={24}/>} />
          <StatCard label="Critical Blast Radius" value={incidents.length} color="amber" icon={<Zap size={24}/>} />
          <StatCard label="Operational Risk" value="At Risk" color="red" icon={<AlertCircle size={24}/>} />
        </div>

        {/* Incident List */}
        <div className="bg-white shadow-2xl shadow-slate-200/50 rounded-[2rem] border border-slate-100 overflow-hidden premium-shadow">
          <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Critical Service Interruptions
              </h2>
              <p className="text-[11px] text-slate-400 font-bold mt-2 uppercase opacity-60">Real-time Correlation Feed</p>
            </div>
            <span className="text-badge font-black text-slate-400 uppercase bg-white px-4 py-2 rounded-xl border border-slate-200/60 shadow-inner">
              Updated: {new Date().toLocaleTimeString()}
            </span>
          </div>

          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-32 flex flex-col items-center justify-center gap-6">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-red-600 animate-spin" />
                  <p className="text-badge font-black text-slate-400 uppercase tracking-widest">Synchronizing War Room Assets...</p>
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-32 flex flex-col items-center justify-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 shadow-inner">
                      <Info size={40} />
                  </div>
                  <p className="text-badge font-black text-slate-400 uppercase tracking-widest">No Strategic Incidents Detected</p>
              </div>
            ) : (
              incidents.map((incident) => (
                <div
                  key={incident.ticket_id}
                  className="group p-8 hover:bg-slate-50/50 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-8"
                >
                  <div className="flex items-center gap-8">
                    <div className="w-1.5 h-16 bg-red-600 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] group-hover:scale-y-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-4 mb-2.5">
                        <p className="font-black text-blue-600 text-[11px] tracking-widest uppercase">
                          Reference: #{incident.ticket_id}
                        </p>
                        <span className="text-[10px] font-black bg-red-100 text-red-600 px-3 py-1 rounded-full uppercase tracking-widest border border-red-200 shadow-sm">
                          {incident.severity}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{incident.host}</h3>
                      <div className="flex items-center gap-4 mt-3">
                          <p className="text-badge font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 opacity-50" />
                            Asset: <span className="text-slate-600">{incident.device}</span>
                          </p>
                          <p className="text-badge font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-300 opacity-50" />
                             Status: <span className="text-red-600">{incident.status}</span>
                          </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-12">
                    <div className="text-right">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SLA Remaining</p>
                      <p className={`text-4xl font-black tabular-nums tracking-tighter transition-colors ${incident.sla_remaining < 10 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                        {incident.sla_remaining}<span className="text-xl font-bold ml-1">m</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                          onClick={() => navigate(`/tickets/${incident.ticket_id}`)}
                          className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-badge font-black text-slate-600 uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 hover:shadow-xl hover:shadow-blue-500/5 transition-all group/btn"
                        >
                          <ExternalLink size={14} className="group-hover/btn:rotate-12 transition-transform" />
                          Investigate
                        </button>
                        <button 
                          onClick={() => navigate(`/tickets/${incident.ticket_id}`)}
                          className="flex items-center gap-3 px-8 py-4 bg-blue-600 rounded-2xl text-badge font-black text-white uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:scale-[1.05] transition-all"
                        >
                          Launch Response
                          <ChevronRight size={14} strokeWidth={3} />
                        </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    rose: "from-rose-500 to-red-600",
    amber: "from-amber-400 to-orange-500",
    red: "from-red-600 to-red-900"
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-50 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${colors[color]} opacity-[0.03] translate-x-12 translate-y--12 group-hover:scale-110 transition-transform`} />
      <p className="text-badge font-bold text-slate-400 uppercase mb-2">{label}</p>
      <div className="flex items-end gap-1">
        <h2 className="text-2xl font-bold text-slate-900 leading-none">{value}</h2>
      </div>
    </div>
  );
}

export default MajorIncidents;
