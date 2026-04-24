import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { 
  ShieldAlert, Activity, Layers, Clock, CheckCircle, 
  ArrowRight, Info, Zap, Search, AlertCircle, 
  Terminal, Maximize2, MousePointer2, Settings,
  ZapOff, Filter, Play, Pause, ExternalLink, Brain, RefreshCw, Server,
  AlertTriangle, WifiOff, Loader2, ShieldCheck, History, List, 
  ArrowUpRight, UserPlus, Send, CheckCircle2, TrendingUp, Cpu, Network, Database,
  ArrowDownRight, ChevronRight, MessageSquare, Ticket, AlertOctagon, Share2
} from "lucide-react";
import { getWarRoomData, getClusterDetails, acknowledgeIncident, resolveIncident } from "../api/api";
import useWarRoomSocket from "../hooks/useWarRoomSocket";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// ── NOC COMPONENTS ─────────────────────────────────────────────────────────

const TabNavigation = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-100 bg-white px-6 overflow-x-auto no-scrollbar">
    {tabs.map(tab => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`py-4 px-4 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${
          activeTab === tab ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        {tab}
        {activeTab === tab && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in fade-in slide-in-from-bottom-1 duration-300" />
        )}
      </button>
    ))}
  </div>
);

const MetricCard = ({ label, value, color = "text-slate-800" }) => (
  <div className="px-6 py-2 border-r border-slate-100 last:border-none">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 whitespace-nowrap">{label}</p>
    <p className={`text-[16px] font-black tracking-tight ${color}`}>{value}</p>
  </div>
);

// ── MAIN COMMAND CENTER (NOC DEEP ANALYSIS EDITION) ─────────────────────────

export default function WarRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: socketData, setData: setSocketData, status } = useWarRoomSocket();
  
  const [clusters, setClusters] = useState([]);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ROOT CAUSE ANALYSIS");
  const [searchQuery, setSearchQuery] = useState("");

  // Initial Fetch
  useEffect(() => {
    getWarRoomData().then(res => {
      setClusters(res.data.clusters);
      if (res.data.clusters.length > 0 && !id) {
        handleSelectIncident(res.data.clusters[0].id);
      }
    });
  }, []);

  // URL-based Sync
  useEffect(() => {
    if (id) handleSelectIncident(id);
  }, [id]);

  const handleSelectIncident = async (incidentId) => {
    setSelectedClusterId(incidentId);
    setLoading(true);
    try {
      const res = await getClusterDetails(incidentId);
      if (res.data.error) {
        toast.error(res.data.error);
        setDetails(null);
      } else {
        setDetails(res.data);
      }
    } catch (err) {
      toast.error("Deep Forensics Connectivity Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type, incidentId) => {
    try {
      if (type === 'ACK') await acknowledgeIncident(incidentId);
      else if (type === 'RESOLVE') await resolveIncident(incidentId);
      toast.success(`${type} Executed Successfully`);
      handleSelectIncident(incidentId);
    } catch (err) {
      toast.error(`Action ${type} Failed`);
    }
  };

  if (!details && loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-8">
      <div className="relative">
        <Loader2 size={64} className="text-blue-500 animate-spin" />
        <Zap size={32} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
      </div>
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Initializing Root Cause Engine...</p>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* ── HEADER: NOC COMMAND BAR ────────────────────────────────────────── */}
      <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-[100] shadow-sm">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">CNMS PRO</span>
              </div>
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-badge font-black uppercase tracking-widest">Ops Context:</span>
                  <span className="text-badge font-black text-blue-600 uppercase tracking-widest">{details?.incident?.id || "INC-0000"}</span>
              </div>
              <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-red-50 border border-red-100 rounded-lg">
                  <AlertOctagon size={14} className="text-red-500" />
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{details?.incident?.severity || "CRITICAL"}</span>
              </div>
          </div>
          
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
                  <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Detection Window</p>
                      <p className="text-[11px] font-black text-slate-700 tabular-nums font-mono mt-1">{details?.incident?.startedAt || "00:00:00"}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-100" />
                  <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Operational SLA</p>
                      <p className="text-[11px] font-black text-red-600 tabular-nums font-mono mt-1">{details?.sla?.elapsed || "00:25:41"}</p>
                  </div>
              </div>
              
              <div className="flex items-center gap-2">
                  <button onClick={() => handleAction('ACK', selectedClusterId)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-md active:scale-95">
                      <ShieldCheck size={14} /> ACK INCIDENT
                  </button>
                  <button onClick={() => handleAction('RESOLVE', selectedClusterId)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-md active:scale-95">
                      <ZapOff size={14} /> FORCE RESOLVE
                  </button>
              </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          
          {/* ── TOP SECTION: RCA, TIMELINE, SUMMARY ────────────────────────── */}
          <div className="h-[350px] flex gap-4 shrink-0">
              
              {/* Root Cause Analysis (Left) */}
              <div className="w-[380px] bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Brain size={14} className="text-red-500" /> Root Cause Identifer
                      </h3>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-md border border-blue-100">{details?.rootCause?.confidence || 0}% Match</span>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                      <div className="p-4 bg-red-50/30 border border-red-100 rounded-xl mb-4">
                          <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Fault Domain</p>
                          <p className="text-[16px] font-black text-slate-800 uppercase leading-tight mb-2">{details?.rootCause?.deviceId || "N/A"}</p>
                          <p className="text-[12px] font-black text-red-600 uppercase tracking-tight italic">{details?.rootCause?.issue || "N/A"}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">IP Node</p>
                              <p className="text-[11px] font-black text-slate-700 tabular-nums">{details?.rootCause?.ipAddress || "0.0.0.0"}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">First Event</p>
                              <p className="text-[11px] font-black text-slate-700 tabular-nums">{details?.rootCause?.firstSeen?.split(',')[1] || "N/A"}</p>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">
                              {details?.rootCause?.description || "Forensic analysis in progress..."}(Correlation Rank: {details?.rootCause?.rootCauseScore || 0})
                          </p>
                          <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${details?.rootCause?.rootCauseScore || 0}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-red-600 font-mono tracking-widest">{details?.rootCause?.rootCauseScore || 0}%</span>
                          </div>
                      </div>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/10 backdrop-blur-sm">
                      <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-blue-600 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">View Topology Graph</button>
                  </div>
              </div>

              {/* Propagation Timeline (Center) */}
              <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden relative">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Clock size={14} /> Propagation Timeline
                      </h3>
                      <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md">
                              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[8px] font-black uppercase tracking-widest">LIVE STREAM</span>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex-1 flex items-center px-10 overflow-x-auto no-scrollbar relative">
                      <div className="flex items-start gap-0 relative">
                          {details?.propagationTimeline?.map((evt, idx) => (
                              <React.Fragment key={idx}>
                                  <div className="flex flex-col items-center group cursor-pointer animate-in zoom-in-95 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                                      <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center relative shadow-sm transition-all group-hover:scale-105 ${
                                          idx === 0 ? "bg-red-600 text-white shadow-red-500/20" : "bg-slate-50 border border-slate-200 text-slate-400"
                                      }`}>
                                          <Cpu size={24} />
                                          <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase ${
                                              idx === 0 ? "bg-slate-800 text-white" : "bg-red-50 text-red-600 border border-red-100"
                                          }`}>{evt.severity}</div>
                                      </div>
                                      <div className="mt-4 text-center w-24">
                                          <p className="text-[9px] font-black text-slate-800 uppercase truncate leading-tight">{evt.deviceId}</p>
                                          <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase truncate tracking-tighter">{evt.issue}</p>
                                      </div>
                                  </div>
                                  {idx < (details?.propagationTimeline?.length || 0) - 1 && (
                                      <div className="pt-8 px-4 flex flex-col items-center">
                                          <div className="w-10 h-[2px] bg-slate-100 border-dashed border-t-2 border-slate-200" />
                                          <ArrowRight size={12} className="text-slate-300 mt-1" />
                                      </div>
                                  )}
                              </React.Fragment>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Insights & Metrics (Right) */}
              <div className="w-[340px] bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                         <Activity size={14} /> Incident Summary & Insights
                      </h3>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          {[
                              { label: "Category", value: details?.incident?.category || "Network" },
                              { label: "Node Count", value: details?.incident?.affectedDevices || 0 },
                              { label: "Suppressed", value: details?.incident?.affectedAlarms || 0 },
                              { label: "Pattern", value: details?.insights?.patternMatched || "N/A" }
                          ].map((item, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                  <p className="text-[11px] font-black text-slate-700 uppercase">{item.value}</p>
                              </div>
                          ))}
                      </div>
                      
                      <div className="space-y-3 pt-2">
                          <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Failure Domain Confidence</span>
                              <span className="text-[10px] font-black text-blue-600 tabular-nums">{details?.insights?.correlationScore || 0}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${details?.insights?.correlationScore || 0}%` }} />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-4 border border-slate-200 border-dashed rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Operational Note</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed italic">
                             Automated correlation detected {details?.incident?.affectedAlarms || 0} symptom alarms across {details?.incident?.affectedDevices || 0} nodes. RCA engine points to {details?.rootCause?.deviceId}.
                          </p>
                      </div>
                  </div>
              </div>
          </div>

          {/* ── LOWER SECTION: FULL WIDTH CORRELATED ALARMS ─────────────────── */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden relative">
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center z-20">
                  <div className="flex items-center gap-4">
                      <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                          <List size={16} className="text-blue-600" /> Correlated Alarms Control Plane
                      </h3>
                      <div className="h-6 w-px bg-slate-100" />
                      <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md">{details?.correlatedAlarms?.length || 0} ACTIVE</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md uppercase tracking-tighter">Real-time Streamed</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                          <input 
                            placeholder="Filter by Node or Alarm Instance..." 
                            className="bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-[10px] font-black w-72 focus:outline-none focus:bg-white focus:border-blue-400 transition-all uppercase placeholder:text-slate-300 shadow-inner" 
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                      </div>
                      <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-700 shadow-sm"><Filter size={16} /></button>
                      <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-700 shadow-sm"><Settings size={16} /></button>
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar relative">
                  <table className="w-full border-separate border-spacing-0">
                      <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgba(226,232,240,1)] z-10">
                          <tr>
                              <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 bg-white">Time</th>
                              <th className="text-left py-4 px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 bg-white">Severity</th>
                              <th className="text-left py-4 px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 bg-white">Device Node</th>
                              <th className="text-left py-4 px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 bg-white">Alarm Condition</th>
                              <th className="text-left py-4 px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 bg-white">Alarm Type</th>
                              <th className="text-left py-4 px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 bg-white">Relation</th>
                              <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 bg-white">Ops Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {details?.correlatedAlarms?.filter(row => 
                            row.device.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            row.alarm.toLowerCase().includes(searchQuery.toLowerCase())
                          ).map((row, idx) => (
                              <tr key={idx} className={`group cursor-pointer transition-all hover:bg-blue-50/40 hover:shadow-[0_2px_10px_rgba(30,58,138,0.05)] ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} h-[52px]`}>
                                  <td className="px-6 text-[11px] font-black text-slate-500 tabular-nums font-mono whitespace-nowrap">{row.timestamp?.split(',')[1] || row.timestamp}</td>
                                  <td className="px-4">
                                      {row.severity === 'CRITICAL' && <span className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white rounded-full text-[9px] font-black shadow-sm shadow-red-500/20 group-hover:scale-105 transition-transform"><AlertOctagon size={10} strokeWidth={3} /> ⛔ CRITICAL</span>}
                                      {row.severity === 'MAJOR' && <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-full text-[9px] font-black shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform"><AlertTriangle size={10} strokeWidth={3} /> ⚠️ MAJOR</span>}
                                      {row.severity === 'MINOR' && <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-[9px] font-black group-hover:scale-105 transition-transform"><Info size={10} strokeWidth={3} /> ℹ️ MINOR</span>}
                                      {row.severity === 'INFO' && <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[9px] font-black group-hover:scale-105 transition-transform"><Zap size={10} strokeWidth={3} /> INFO</span>}
                                  </td>
                                  <td className="px-4 text-[13px] font-black text-slate-800 uppercase tracking-tight">{row.device}</td>
                                  <td className="px-4 text-[13px] font-black text-slate-600 uppercase tracking-tight">{row.alarm}</td>
                                  <td className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.type}</td>
                                  <td className="px-4">
                                      {row.status === 'ROOT CAUSE' ? 
                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 border border-red-200 rounded-md text-[9px] font-black uppercase animate-pulse">ROOT CAUSE</span> : 
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-md text-[9px] font-black uppercase">SYMPTOM</span>
                                      }
                                  </td>
                                  <td className="px-6">
                                      <div className="flex items-center gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full ${row.status === 'ROOT CAUSE' ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">ACTIVE</span>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes soft-pulse { 0% { background-color: rgba(59, 130, 246, 0.1); } 100% { background-color: transparent; } }
        .new-alarm-pulse { animation: soft-pulse 3s ease-out; }
      `}</style>
    </div>
  );
}


// ── NOC TOPOLOGY ENGINE ──────────────────────────────────────────────────

const TopologyMap = ({ data }) => {
    const nodes = [
        { ...data.root, x: 200, y: 150 },
        ...data.impacted.map((n, i) => {
            const angle = (i / data.impacted.length) * 2 * Math.PI;
            const radius = 120;
            return {
                ...n,
                x: 200 + radius * Math.cos(angle),
                y: 150 + radius * Math.sin(angle)
            };
        })
    ];

    return (
        <svg viewBox="0 0 400 300" className="w-full h-full select-none">
            <defs>
                <filter id="glow-noc-premium"><feGaussianBlur stdDeviation="6" result="blur"/><feFlood floodColor="#ef4444" floodOpacity="0.4" result="flood"/><feComposite in="flood" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            {data.impacted.map((n, i) => (
                <line key={i} x1={200} y1={150} x2={nodes[i+1].x} y2={nodes[i+1].y} stroke="#f1f5f9" strokeWidth="4" />
            ))}
            {nodes.map((node, i) => (
                <g key={i}>
                    <circle cx={node.x} cy={node.y} r={node.type === 'ROOT' ? 24 : 18} fill="white" stroke={node.type === 'ROOT' ? '#ef4444' : '#f97316'} strokeWidth="4" filter={node.type === 'ROOT' ? 'url(#glow-noc-premium)' : 'none'} className="transition-all duration-500" />
                    {node.type === 'ROOT' && <AlertOctagon x={node.x-10} y={node.y-10} size={20} className="text-red-600" />}
                    <text x={node.x} y={node.y + 35} textAnchor="middle" className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{node.label}</text>
                </g>
            ))}
        </svg>
    );
};
