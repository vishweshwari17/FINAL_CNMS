import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { 
  ShieldAlert, Activity, Layers, Clock, CheckCircle, 
  ArrowRight, Info, Zap, Search, AlertCircle, 
  Terminal, Maximize2, MousePointer2, Settings,
  ZapOff, Filter, Play, Pause, ExternalLink, Brain, RefreshCw, Server,
  AlertTriangle, WifiOff, Loader2, ShieldCheck, History, List
} from "lucide-react";
import { getWarRoomData, getClusterDetails, acknowledgeIncident, resolveIncident } from "../api/api";
import useWarRoomSocket from "../hooks/useWarRoomSocket";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// ── NOC COMPONENTS ─────────────────────────────────────────────────────────

const SeverityBadge = ({ severity }) => {
  const styles = {
    Critical: "bg-red-50 text-red-600 border-red-200",
    Major: "bg-orange-50 text-orange-600 border-orange-200",
    Minor: "bg-yellow-50 text-yellow-600 border-yellow-200"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] uppercase border font-semibold ${styles[severity] || styles.Minor}`}>
      {severity}
    </span>
  );
};

// ── MAIN COMMAND CENTER (NOC ARCHITECT EDITION) ───────────────────────────

export default function WarRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, setData, status } = useWarRoomSocket();
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [clusterDetails, setClusterDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [streamSearch, setStreamSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const scrollRef = useRef(null);
  const isAutoScrollPaused = useRef(false);
  const [activeTab, setActiveTab] = useState("AI"); // "AI" or "LOG"
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoScroll: true,
    showCritical: true,
    showMajor: true,
    showMinor: true,
    soundEnabled: true,
    densityMode: "comfortable", // "compact" | "comfortable"
    showAI: true,
    showStream: true,
    liveMode: true
  });
  
  // NOC Stats Logic
  const stats = useMemo(() => {
    const critical = data.clusters.filter(c => c.severity === "Critical").length;
    return {
      criticalCount: critical,
      oldestMinutes: data.clusters.length > 0 ? 45 : 0, 
      overload: critical > 5
    };
  }, [data.clusters]);

  // Initial Data Fetch
  useEffect(() => {
    getWarRoomData().then(res => setData(res.data)).catch(err => toast.error("Offline Data Sync Failed"));
  }, [setData]);

  // Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-select cluster from URL
  useEffect(() => {
    if (id && data.clusters.length > 0) {
      const cluster = data.clusters.find(c => String(c.id) === String(id));
      if (cluster) {
        handleSelectCluster(cluster);
      }
    }
  }, [id, data.clusters]);

  const handleSelectCluster = async (cluster) => {
    setSelectedCluster(cluster.id);
    setLoadingDetails(true);
    try {
      const res = await getClusterDetails(cluster.id);
      setClusterDetails(res.data);
    } catch (err) {
      toast.error("Cluster Intel Retrieval Failed");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAction = async (type, id, e) => {
    e.stopPropagation();
    try {
      if (type === 'ACK') await acknowledgeIncident(id);
      else if (type === 'RESOLVE') await resolveIncident(id);
      toast.success(`${type} completed successfully`);
      const res = await getWarRoomData();
      setData(res.data);
    } catch (err) {
      toast.error(`Action ${type} failed`);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // If user is near bottom, resume auto-scroll
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    isAutoScrollPaused.current = !isAtBottom;
  };

  useEffect(() => {
    if (isLive && settings.autoScroll && !isAutoScrollPaused.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data.events, isLive, settings.autoScroll]);

  return (
    <div className="h-screen bg-[#f8fafc] flex flex-col font-sans overflow-hidden">
      {status !== 'CONNECTED' && (
        <div className="absolute inset-0 z-[200] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-500">
             <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col items-center text-center max-w-sm premium-shadow">
               <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center mb-8 text-amber-500 border border-amber-100 shadow-inner">
                    <WifiOff size={40} />
               </div>
               <h3 className="text-2xl font-black mb-3 text-slate-800 tracking-tight uppercase">Link Terminated</h3>
                    <p className="text-[14px] text-slate-400 mb-8 leading-relaxed font-bold uppercase tracking-wider">The real-time operational stream has been interrupted. Re-syncing terminal assets...</p>
                  <div className="flex items-center gap-4 text-blue-600 bg-blue-50 px-8 py-3 rounded-2xl border border-blue-100 shadow-sm">
                      <Loader2 size={18} className="animate-spin" />
                       <span className="text-badge font-black uppercase tracking-widest">Synchronizing</span>
                  </div>
             </div>
        </div>
      )}

      {/* ── TOP: GLOBAL COMMAND BAR ─────────────────────────────────────── */}
      <div className="h-16 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-50">
          <div className="flex items-center gap-6">
              <div className="flex flex-col">
                   <span className="text-badge font-black text-blue-600 tracking-widest uppercase">CNMS COMMAND TERMINAL</span>
                  <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{status === 'CONNECTED' ? 'System Online' : 'Link Failure'}</span>
                  </div>
              </div>
              <div className="h-8 w-px bg-slate-100 hidden md:block"></div>
              <div className="relative group hidden lg:block">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={14} />
                  <input 
                      type="text" 
                      placeholder="ENTER OPS COMMAND..." 
                      className="bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-11 pr-4 text-badge font-black w-72 focus:outline-none focus:bg-white focus:border-blue-400 transition-all placeholder:text-slate-300 tracking-widest uppercase"
                      onClick={() => setShowSearch(true)}
                  />
              </div>
          </div>
          
          <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                   <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Operational State</p>
                   <p className={`text-badge font-black tracking-widest tabular-nums mt-0.5 ${stats.overload ? 'text-red-600' : 'text-emerald-600'}`}>
                       {stats.overload ? 'CRITICAL - SATURATION' : 'SYSTEM - NOMINAL'}
                   </p>
              </div>
              <button 
                onClick={() => setShowSettings(true)}
                className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200 text-slate-400 hover:text-blue-600 shadow-sm active:scale-95 group"
              >
                  <Settings size={20} className="group-hover:rotate-45 transition-transform" />
              </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-6 gap-6 relative">
          
          {/* ── LEFT: CORRELATED CLUSTER PANEL ─────────────────────────────── */}
          <div className="w-[380px] flex flex-col shrink-0 gap-4 overflow-hidden">
               <div className="flex items-center justify-between mb-1 px-2">
                  <div className="flex items-center gap-3">
                       <h2 className="text-badge font-black text-slate-400 uppercase tracking-widest">Triage Matrix</h2>
                       <div className="h-1 flex-1 bg-slate-100 min-w-8 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                       <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-blue-500/30 tracking-widest">{data.clusters.length}</span>
                  </div>
               </div>
               
                <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar pb-10">
                   {data.clusters
                    .filter(c => {
                      if (c.severity === "Critical") return settings.showCritical;
                      if (c.severity === "Major") return settings.showMajor;
                      if (c.severity === "Minor") return settings.showMinor;
                      return true;
                    })
                    .map((cluster) => (
                     <div 
                       key={cluster.id}
                       onClick={() => handleSelectCluster(cluster)}
                       className={`group bg-white border transition-all rounded-[2rem] cursor-pointer relative shadow-sm hover:shadow-xl hover:shadow-slate-200/50 ${
                         settings.densityMode === 'compact' ? 'p-3 mb-2' : 'p-5'
                       } ${
                         selectedCluster === cluster.id 
                           ? 'border-blue-500 ring-4 ring-blue-500/5' 
                           : 'border-slate-100 hover:border-slate-200'
                       } ${cluster.severity === 'Critical' ? 'border-l-8 border-l-red-500' : ''}`}
                     >
                         <div className="flex justify-between items-start mb-4">
                             <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                               cluster.severity === 'Critical' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                             }`}>
                               {cluster.severity}
                             </span>
                             <span className="text-[10px] font-black text-slate-300 tracking-widest group-hover:text-blue-600 transition-colors uppercase">UID: {cluster.incident_uid}</span>
                         </div>
                         <h3 className="text-[16px] font-black leading-tight mb-4 text-slate-800 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{cluster.root_cause}</h3>
                        
                         <div className="grid grid-cols-2 gap-4">
                             <div className="flex items-center gap-3 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                                 <Server size={14} className="text-slate-300" />
                                 <span className="truncate">{cluster.device_name}</span>
                             </div>
                             <div className="flex items-center gap-3 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                                 <Activity size={14} className="text-slate-300" />
                                 <span>{cluster.cluster_size} VECTORS</span>
                             </div>
                         </div>

                         <div className="mt-6 pt-5 border-t border-slate-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                              <div className="flex gap-2">
                                 <button onClick={(e) => handleAction('ACK', cluster.id, e)} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-emerald-500 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm active:scale-95" title="Acknowledge">
                                     <CheckCircle size={16} strokeWidth={3} />
                                 </button>
                                 <button onClick={(e) => handleAction('RESOLVE', cluster.id, e)} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm active:scale-95" title="Resolve">
                                     <ShieldAlert size={16} strokeWidth={3} />
                                 </button>
                              </div>
                              <button onClick={(e) => {e.stopPropagation(); navigate(`/tickets/${cluster.id}`)}} className="px-5 py-2.5 bg-white border border-slate-200 text-badge font-black text-blue-600 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 rounded-2xl transition-all uppercase tracking-widest">
                                     Intel Archive
                              </button>
                         </div>

                         {cluster.severity === 'Critical' && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.03] blur-[3rem] rounded-full pointer-events-none group-hover:scale-150 transition-transform"></div>}
                     </div>
                   ))}
                </div>
          </div>
          {/* ── CENTER: DYNAMIC TOPOLOGY ENGINE ────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                       <h2 className="text-badge font-black text-slate-400 uppercase tracking-widest">Impact Core v5.0</h2>
                       <div className="h-1 flex-1 bg-slate-100 min-w-8 rounded-full" />
                  </div>
                  <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <button className="p-2 text-slate-300 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all active:scale-90"><Maximize2 size={14} /></button>
                      <button className="p-2 text-slate-300 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all active:scale-90"><MousePointer2 size={14} /></button>
                  </div>
               </div>

               <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] relative overflow-hidden group/top shadow-xl shadow-slate-200/40 premium-shadow">
                  {!selectedCluster && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none p-12">
                        <div className="mb-10 animate-pulse">
                            <div className="w-24 h-24 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200 shadow-inner">
                                 <Activity size={48} strokeWidth={1} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">System Idle</h3>
                        <p className="text-[14px] text-slate-400 max-w-[320px] leading-relaxed font-bold uppercase tracking-wider">Select a root-cause cluster from the tactical feed to initiate forensic topology mapping.</p>
                    </div>
                  )}

                  {loadingDetails && (
                    <div className="absolute inset-0 z-20 backdrop-blur-xl bg-white/60 flex items-center justify-center animate-in fade-in duration-500">
                        <div className="flex flex-col items-center gap-8">
                            <div className="w-20 h-20 rounded-[2rem] bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 relative">
                                <Loader2 size={36} className="animate-spin" />
                                <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping pointer-events-none" />
                            </div>
                                <span className="text-badge font-black uppercase text-blue-600 tracking-[0.2em] animate-pulse">Synthesizing Topology</span>
                        </div>
                    </div>
                  )}

                  {clusterDetails && (
                    <div className="w-full h-full animate-in zoom-in-95 fade-in duration-1000">
                        <TopologyMap data={clusterDetails.topology} />
                    </div>
                  )}

                  {/* Operational Telemetry Overlay */}
                  {clusterDetails && (
                    <div className="absolute bottom-6 left-6 p-6 bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/40 max-w-[300px] animate-in slide-in-from-left-4 duration-500 premium-shadow">
                        <div className="flex items-center gap-4 border-b border-slate-100/50 pb-4 mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl ${clusterDetails.compliance === 'SECURE' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                                {clusterDetails.compliance === 'SECURE' ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Audit Compliance</span>
                                <span className={`text-[14px] font-black tracking-widest uppercase ${clusterDetails.compliance === 'SECURE' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {clusterDetails.compliance}
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-badge font-black text-slate-600 uppercase tracking-tight">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                    <span>Incident Source</span>
                                </div>
                                <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase tracking-widest">Ground Zero</span>
                             </div>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-badge font-black text-slate-600 uppercase tracking-tight">
                                    <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                                    <span>Impacted Node</span>
                                </div>
                                <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 uppercase tracking-widest">Infected</span>
                             </div>
                        </div>
                    </div>
                  )}
               </div>
          </div>

          {/* ── RIGHT: INTELLIGENT OPS HUB ───────────────────────────────── */}
          <div className="w-[340px] flex flex-col shrink-0 gap-4 overflow-hidden">
               
               {/* SLA Prediction Engine */}
               {settings.showAI && (
               <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden premium-shadow">
                   <div className="flex items-center gap-3 mb-6 relative z-10">
                       <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner">
                           <Clock size={16} />
                       </div>
                       <h2 className="text-badge font-black text-slate-800 uppercase tracking-widest">Breach Prediction</h2>
                   </div>
                   
                   {!clusterDetails ? (
                     <div className="py-12 text-center text-slate-100 animate-pulse relative z-10"><Info size={48} strokeWidth={1} /></div>
                   ) : (
                     <div className="space-y-6 relative z-10">
                        <div className="flex justify-between items-end">
                              <div>
                                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Breach Probability</p>
                                 <p className="text-[12px] font-bold text-slate-300 uppercase tracking-tighter mt-1">SLA Critical Threshold</p>
                              </div>
                              <span className={`text-4xl font-black tabular-nums tracking-tighter ${clusterDetails.sla_risk > 70 ? 'text-red-600' : 'text-blue-600'}`}>{clusterDetails.sla_risk}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 shadow-lg ${clusterDetails.sla_risk > 70 ? 'bg-red-500 shadow-red-500/30' : 'bg-blue-600 shadow-blue-500/30'}`} 
                              style={{ width: `${clusterDetails.sla_risk}%` }}
                            ></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                             <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center shadow-inner">
                                 <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">MTTR Avg</p>
                                 <div className="text-[14px] font-black font-mono text-slate-800">04:12:33</div>
                             </div>
                             <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center shadow-inner">
                                 <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Reliability</p>
                                 <div className="text-[14px] font-black font-mono text-emerald-600">94.2%</div>
                             </div>
                        </div>
                     </div>
                   )}
                   <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/[0.02] blur-[3rem] rounded-full pointer-events-none" />
               </div>
               )}
               
               {/* AI Assistant & Tactical History */}
               {settings.showAI && (
               <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden flex flex-col shadow-xl shadow-slate-200/40 premium-shadow">
                   
                   {/* Tabs */}
                   <div className="flex border-b border-slate-50 bg-slate-50/30 p-2">
                       <button 
                         onClick={() => setActiveTab("AI")}
                         className={`flex-1 py-3 text-badge font-black uppercase flex items-center justify-center gap-2 tracking-widest transition-all ${
                           activeTab === "AI" 
                             ? "text-blue-600 bg-white rounded-2xl border border-slate-200/60 shadow-md" 
                             : "text-slate-400 hover:text-slate-600 active:scale-95"
                         }`}
                       >
                          <Brain size={14} /> AI Assistant
                       </button>
                       <button 
                         onClick={() => setActiveTab("LOG")}
                         className={`flex-1 py-3 text-badge font-black uppercase flex items-center justify-center gap-2 tracking-widest transition-all ${
                           activeTab === "LOG" 
                             ? "text-blue-600 bg-white rounded-2xl border border-slate-200/60 shadow-md" 
                             : "text-slate-400 hover:text-slate-600 active:scale-95"
                         }`}
                       >
                          <History size={14} /> Event Log
                       </button>
                   </div>

                   <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                       {!clusterDetails ? (
                         <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 animate-in fade-in duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-blue-200 shadow-sm mb-6 border border-blue-50">
                                <Brain size={32} strokeWidth={1.5} />
                            </div>
                            <h4 className="text-[14px] font-black uppercase text-slate-800 tracking-widest mb-2">No Active Selection</h4>
                            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider max-w-[200px] leading-relaxed">Select a cluster from the triage matrix to view intelligence insights and event history.</p>
                         </div>
                       ) : (
                         <div className="space-y-8">
                             {activeTab === "AI" ? (
                               <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                   {/* Analysis Section */}
                                   <div>
                                       <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-3">
                                           Forensic Root Cause
                                           <div className="h-px flex-1 bg-slate-100" />
                                       </h4>
                                       <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 hover:border-blue-300 transition-all shadow-sm group">
                                            <p className="text-[15px] font-black text-slate-800 mb-4 leading-tight uppercase tracking-tight">{clusterDetails.root_cause}</p>
                                            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-inner">
                                               <span className="text-badge font-black text-slate-400 uppercase tracking-tighter">Confidence Index</span>
                                               <span className="text-[13px] font-black text-blue-600 tabular-nums">{clusterDetails.confidence}%</span>
                                            </div>
                                       </div>
                                   </div>

                                   {/* Mitigation Section */}
                                   <div className="delay-150">
                                       <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-3">
                                           Tactical Countermeasure
                                           <div className="h-px flex-1 bg-slate-100" />
                                       </h4>
                                       <div className="p-5 bg-white border border-slate-100 rounded-3xl hover:border-blue-400 transition-all group shadow-sm">
                                           <div className="flex items-start gap-4 mb-5">
                                               <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30 group-hover:rotate-12 transition-transform">
                                                   <Play size={12} fill="currentColor" />
                                               </div>
                                                <p className="text-[14px] font-black text-slate-800 leading-tight pt-1.5 uppercase tracking-tight">{clusterDetails.suggested_action}</p>
                                           </div>
                                           <div className="space-y-3 ml-4 border-l-2 border-slate-50 pl-8">
                                               {clusterDetails.mitigation_steps?.map((step, idx) => (
                                                   <div key={idx} className="flex items-center gap-3 text-badge font-bold text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-tight cursor-default">
                                                       <div className="w-1.5 h-1.5 rounded-full bg-blue-300 group-hover:bg-blue-600 transition-colors"></div>
                                                       <span className="truncate">{step}</span>
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   </div>
                               </div>
                             ) : (
                               <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                   {/* History Section */}
                                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-3">
                                       Incident Sequence
                                       <div className="h-px flex-1 bg-slate-100" />
                                   </h4>
                                   <div className="space-y-5">
                                       {clusterDetails.history?.map((h, i) => (
                                           <div key={i} className="flex gap-4 group/h">
                                               <div className="w-px h-full bg-slate-100 relative group-hover/h:bg-blue-200 transition-colors">
                                                   <div className="absolute top-1 -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-200 group-hover/h:border-blue-400 transition-all"></div>
                                               </div>
                                                <div className="pb-4">
                                                   <p className="text-[9px] font-black text-slate-300 mb-1 tracking-widest uppercase">{h.time}</p>
                                                   <p className="text-[12px] font-black text-slate-500 group-hover:text-slate-800 transition-colors leading-tight uppercase tracking-tight">{h.event}</p>
                                               </div>
                                           </div>
                                       ))}
                                       {(!clusterDetails.history || clusterDetails.history.length === 0) && (
                                         <p className="text-[11px] font-bold text-slate-300 uppercase italic">No history data available</p>
                                       )}
                                   </div>
                               </div>
                             )}
                         </div>
                       )}
                   </div>
               </div>
               )}
          </div>

      </div>

      {/* ── BOTTOM: NOC EVENT STREAM ──────────────────────────────────── */}
      {settings.showStream && (
      <div className="h-[400px] bg-white border-t-2 border-slate-200 flex shrink-0 shadow-2xl z-40 relative">
          <div className="w-[300px] border-r border-slate-100 flex flex-col p-5 shrink-0 bg-slate-50/60 backdrop-blur-3xl">
              <div className="flex items-center gap-3 mb-5">
                  <Terminal size={14} className="text-blue-600" />
                  <span className="text-badge font-bold uppercase text-slate-500">Tactical Stream</span>
              </div>
              <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search Stream..." 
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-small focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-medium"
                      value={streamSearch}
                      onChange={e => setStreamSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-2 text-badge font-bold uppercase text-slate-500 focus:outline-none focus:border-blue-400"
                      value={severityFilter}
                      onChange={e => setSeverityFilter(e.target.value)}
                    >
                      <option value="ALL">All Levels</option>
                      <option value="Critical">Critical</option>
                      <option value="Major">Major</option>
                      <option value="Minor">Minor</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setIsLive(!isLive)}
                    className={`w-full py-2.5 rounded-xl text-badge font-bold uppercase transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${
                        isLive ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-white border-2 border-slate-200 text-slate-300'
                    }`}
                   >
                      {isLive ? <Activity size={14} className="animate-pulse" /> : <Play size={14} fill="currentColor"/>}
                      {isLive ? 'Link Active' : 'Link Suspended'}
                  </button>
                  <div className="mt-auto pt-4 border-t border-slate-100 hidden lg:block">
                    <div className="flex items-center justify-between text-badge font-bold text-slate-400 uppercase">
                      <span>Status</span>
                      <span className="text-emerald-500">Nominal</span>
                    </div>
                  </div>
              </div>
          </div>
          
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto relative custom-scrollbar bg-white font-sans tactical-stream-container flex flex-col"
          >
              <div className="sticky top-0 left-0 right-0 z-20 flex justify-center py-2 pointer-events-none">
                {!isLive && (
                    <div className="bg-amber-100 text-amber-700 text-badge font-bold px-8 py-2.5 rounded-full shadow-2xl border border-amber-200 flex items-center gap-3 animate-bounce pointer-events-auto">
                        <AlertTriangle size={12} />
                        EXTERNAL SYNC SUSPENDED
                    </div>
                )}
              </div>
              {(() => {
                let sortedEvents = [...data.events].sort((a,b) => new Date(a.time) - new Date(b.time));
                
                // Filtering
                sortedEvents = sortedEvents.filter(e => {
                     if (e.severity === "Critical") return settings.showCritical;
                     if (e.severity === "Major") return settings.showMajor;
                     if (e.severity === "Minor") return settings.showMinor;
                     return true;
                });
                
                if (severityFilter !== "ALL") {
                  sortedEvents = sortedEvents.filter(e => e.severity === severityFilter);
                }
                if (streamSearch) {
                  const q = streamSearch.toLowerCase();
                  sortedEvents = sortedEvents.filter(e => 
                    e.message.toLowerCase().includes(q) || 
                    e.device_name.toLowerCase().includes(q)
                  );
                }

                if (sortedEvents.length === 0) return (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20 px-10">
                        <ShieldCheck size={48} strokeWidth={1} className="mb-4 opacity-30 text-emerald-500" />
                        <h4 className="text-badge uppercase font-bold text-slate-800 mb-1">✅ No active alerts</h4>
                        <p className="text-small uppercase font-medium text-slate-400">All systems operating normally</p>
                    </div>
                );
                
                return sortedEvents.map((evt, idx) => {
                  const isAck = evt.status === "ACKNOWLEDGED";
                  const isResolved = evt.status === "RESOLVED";
                  
                  return (
                    <div key={idx} 
                      className={`event-card ${evt.severity.toLowerCase()} ${isAck ? 'acknowledged' : ''} ${isResolved ? 'resolved-row' : ''} group ${
                        settings.densityMode === 'compact' ? '!py-1.5' : ''
                      }`}
                    >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-bold text-slate-900 leading-none">{evt.message}</span>
                              {isAck && <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">Acknowledged</span>}
                            </div>
                            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
                               <span className="text-blue-600 font-bold uppercase">{evt.device_name}</span>
                               <span className="text-slate-300">•</span>
                               <span className="truncate max-w-[400px]">{evt.description || "Live network event detected from terminal link."}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right shrink-0">
                               <div className="text-[12px] font-bold text-slate-400 font-mono">{new Date(evt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                               <div className="text-[10px] font-black uppercase text-slate-300 tabular-nums tracking-widest">{evt.incident_id || "#SYNC-STREAM"}</div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                               <button 
                                 onClick={() => navigate(`/incidents?search=${evt.incident_id || evt.device_name}`)}
                                 className="p-1.5 hover:bg-blue-50 text-slate-300 hover:text-blue-600 rounded-lg transition-all" title="View Details"
                               >
                                 <ExternalLink size={14} />
                               </button>
                               {!isAck && !isResolved && (
                                 <button 
                                   onClick={() => handleAction('ACK', evt.id || evt.incident_id, { stopPropagation: () => {} })}
                                   className="p-1.5 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-lg transition-all" title="Acknowledge"
                                 >
                                   <CheckCircle size={14} />
                                 </button>
                               )}
                               <button className="p-1.5 hover:bg-purple-50 text-slate-300 hover:text-purple-600 rounded-lg transition-all" title="Create Ticket">
                                 <List size={14} />
                               </button>
                            </div>
                          </div>
                        </div>
                    </div>
                  );
                });
              })()}
          </div>
      </div>
      )}

      {/* ── SEARCH MODAL (Roadmap: High Polish) ────────────────────────── */}
      {showSearch && (
        <div className="absolute inset-0 z-[300] flex items-start justify-center pt-28 px-4 backdrop-blur-md bg-slate-900/10 transition-all duration-500 animate-in fade-in" onClick={() => setShowSearch(false)}>
            <div className="w-full max-w-3xl glass-card shadow-[0_50px_200px_rgba(0,0,0,0.25)] rounded-[4rem] overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="p-12 border-b border-slate-100 flex items-center gap-10 bg-white/50">
                    <Search className="text-blue-600 rotate-12" size={36} strokeWidth={3} />
                      <input 
                      autoFocus
                      placeholder="ENTER OPS COMMAND OR ASSET..."
                      className="bg-transparent border-none w-full text-page-title font-bold outline-none text-slate-900 placeholder:text-slate-200 uppercase"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    <div className="px-5 py-2.5 bg-slate-100 text-slate-400 text-badge font-bold rounded-[1.2rem] border border-slate-200 hidden sm:block select-none shadow-sm">ESC EXIT</div>
                </div>
                <div className="p-10 max-h-[520px] overflow-y-auto custom-scrollbar font-display bg-white">
                    <div className="flex items-center gap-4 px-6 mb-10">
                        <div className="h-0.5 flex-1 bg-slate-100"></div>
                        <p className="text-badge font-bold text-slate-300 uppercase shrink-0">Strategic Assets</p>
                        <div className="h-0.5 flex-1 bg-slate-100"></div>
                    </div>
                    {[
                        { icon: Server, label: "Asset Intel Matrix", desc: "Global infrastructure and node registry", path: "/devices", color: "text-blue-600 bg-blue-50" },
                        { icon: Activity, label: "Telemetry Stream", desc: "Real-time forensic event analysis", path: "/alarms", color: "text-orange-600 bg-orange-50" },
                        { icon: List, label: "Protocol Archive", desc: "Historical incident and resolution logs", path: "/audit", color: "text-slate-700 bg-slate-100" },
                    ].map((item, i) => (
                        <div 
                          key={i} 
                          onClick={() => navigate(item.path)}
                          className="flex items-center gap-6 p-6 hover:bg-slate-50 hover:shadow-lg hover:shadow-blue-500/5 rounded-2xl transition-all cursor-pointer group mb-3 border border-transparent hover:border-slate-100"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-md ${item.color}`}>
                                <item.icon size={24} strokeWidth={2.5} />
                            </div>
                             <div className="flex-1">
                                <p className="text-section-title font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase mb-1 leading-none">{item.label}</p>
                                <p className="text-small font-bold text-slate-400 uppercase">{item.desc}</p>
                            </div>
                            <ArrowRight className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-3 transition-all" size={24} strokeWidth={3} />
                        </div>
                    ))}
                </div>
                <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center select-none">
                    <div className="flex items-center gap-8 text-badge font-bold text-slate-300 uppercase">
                        <div className="flex items-center gap-3">
                            <span className="w-6 h-6 flex items-center justify-center border border-slate-200 rounded-lg text-small font-bold bg-white shadow-sm">↑</span>
                            <span className="w-6 h-6 flex items-center justify-center border border-slate-200 rounded-lg text-small font-bold bg-white shadow-sm">↓</span>
                        </div>
                        <span>Shift Context</span>
                    </div>
                    <div className="flex items-center gap-4 text-badge font-bold text-slate-400 uppercase py-3 px-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm animate-pulse">
                        <span className="text-blue-600">Enter</span>
                        <span className="text-slate-300">|</span>
                        <span>Execute Select</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ── SETTINGS DRAWER ────────────────────────────────────────── */}
      {showSettings && (
        <div className="absolute inset-0 z-[400] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="w-[320px] bg-white h-full shadow-2xl relative animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-blue-600" />
                <h3 className="text-badge font-black uppercase tracking-widest text-slate-800">Ops Settings</h3>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"
              >
                <ZapOff size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Stream Settings */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Stream Controls</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-badge font-bold uppercase text-slate-600">Auto-Scroll</span>
                    <button 
                      onClick={() => setSettings(s => ({...s, autoScroll: !s.autoScroll}))}
                      className={`w-10 h-5 rounded-full relative transition-all ${settings.autoScroll ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.autoScroll ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-badge font-bold uppercase text-slate-600">Live Mode</span>
                    <button 
                      onClick={() => {
                        setSettings(s => ({...s, liveMode: !s.liveMode}));
                        setIsLive(!settings.liveMode);
                      }}
                      className={`w-10 h-5 rounded-full relative transition-all ${settings.liveMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.liveMode ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Density Mode</span>
                    <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                      <button 
                        onClick={() => setSettings(s => ({...s, densityMode: 'comfortable'}))}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${settings.densityMode === 'comfortable' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Comfort
                      </button>
                      <button 
                        onClick={() => setSettings(s => ({...s, densityMode: 'compact'}))}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${settings.densityMode === 'compact' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Compact
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Severity Filter */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Severity Filters</h4>
                <div className="space-y-3">
                  {[
                    { key: 'showCritical', label: 'Critical', color: 'bg-red-500' },
                    { key: 'showMajor', label: 'Major', color: 'bg-orange-500' },
                    { key: 'showMinor', label: 'Minor', color: 'bg-yellow-500' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-badge font-bold uppercase text-slate-600">{item.label}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(s => ({...s, [item.key]: !s[item.key]}))}
                        className={`w-10 h-5 rounded-full relative transition-all ${settings[item.key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings[item.key] ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert Settings */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Alerts</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-badge font-bold uppercase text-slate-600">Sound Alerts</span>
                    <button 
                      onClick={() => setSettings(s => ({...s, soundEnabled: !s.soundEnabled}))}
                      className={`w-10 h-5 rounded-full relative transition-all ${settings.soundEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.soundEnabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Layout Settings */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Layout</h4>
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                    <span className="text-badge font-bold uppercase text-slate-600">AI Panel</span>
                    <button 
                      onClick={() => setSettings(s => ({...s, showAI: !s.showAI}))}
                      className={`w-10 h-5 rounded-full relative transition-all ${settings.showAI ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showAI ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-badge font-bold uppercase text-slate-600">Tactical Stream</span>
                    <button 
                      onClick={() => setSettings(s => ({...s, showStream: !s.showStream}))}
                      className={`w-10 h-5 rounded-full relative transition-all ${settings.showStream ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showStream ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setSettings({
                  autoScroll: true,
                  showCritical: true,
                  showMajor: true,
                  showMinor: true,
                  soundEnabled: true,
                  densityMode: "comfortable",
                  showAI: true,
                  showStream: true,
                  liveMode: true
                })}
                className="w-full py-3 bg-white border border-slate-200 text-badge font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all rounded-2xl shadow-sm"
              >
                Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 40px; border: 3px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

        .tactical-stream-container {
          height: 100%;
          scroll-behavior: smooth;
        }

        .event-card {
          padding: 10px 16px;
          border-bottom: 1px solid #f1f5f9;
          position: relative;
          padding-left: 20px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .event-card:hover {
          background: #f8fafc;
        }

        .event-card::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 8px;
          bottom: 8px;
          width: 4px;
          border-radius: 4px;
        }

        .critical::before { background: #ef4444; }
        .major::before    { background: #f97316; }
        .minor::before    { background: #eab308; }
        .resolved-row::before { background: #10b981; }

        .acknowledged {
          opacity: 0.6;
        }

        .resolved-row {
          background: #f0fdf4/50;
        }
      `}</style>
    </div>
  );
}

// ── NOC TOPOLOGY ENGINE (DYNAMIC SCALING) ───────────────────────────────

const TopologyMap = ({ data }) => {
    // Audit Refinement: Dynamic radius scaling based on node count
    const nodeCount = data.impacted.length;
    const baseRadius = 240;
    const dynamicRadius = nodeCount > 10 ? baseRadius + (nodeCount * 5) : baseRadius;
    const svgSize = nodeCount > 15 ? 1000 : 800; // Roadmap: Dynamic canvas sizing

    const nodes = [
        { ...data.root, x: svgSize / 2, y: 300 },
        ...data.impacted.map((n, i) => {
            const angle = (i / data.impacted.length) * 2 * Math.PI;
            return {
                ...n,
                x: svgSize / 2 + dynamicRadius * Math.cos(angle),
                y: 300 + dynamicRadius * Math.sin(angle)
            };
        })
    ];

    return (
        <svg viewBox={`0 0 ${svgSize} 600`} className="w-full h-full select-none cursor-move p-16 animate-in zoom-in-95 duration-1000">
            <defs>
                <filter id="glow-noc-premium">
                    <feGaussianBlur stdDeviation="10" result="blur"/>
                    <feFlood floodColor="#ef4444" floodOpacity="0.4" result="flood"/>
                    <feComposite in="flood" in2="blur" operator="in" result="glow"/>
                    <feMerge>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            
            {/* Edges */}
            {data.impacted.map((n, i) => (
                <g key={`edge-${i}`}>
                   <line 
                     x1={svgSize / 2} y1={300} 
                     x2={nodes[i+1].x} y2={nodes[i+1].y} 
                     stroke="#f1f5f9" 
                     strokeWidth="6" 
                     strokeLinecap="round"
                   />
                   <line 
                     x1={svgSize / 2} y1={300} 
                     x2={nodes[i+1].x} y2={nodes[i+1].y} 
                     stroke="#3b82f6" 
                     strokeWidth="2.5" 
                     strokeDasharray="12,24"
                     opacity="0.5"
                   >
                       <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="2s" repeatCount="indefinite" />
                   </line>
                   {/* Propagation Particles */}
                   {[0, 0.5, 1].map((delay, pIdx) => (
                       <circle key={pIdx} r="5" fill="#3b82f6" className="filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                           <animateMotion 
                             dur={`${2}s`} 
                             begin={`${delay}s`}
                             repeatCount="indefinite" 
                             path={`M ${svgSize / 2} 300 L ${nodes[i+1].x} ${nodes[i+1].y}`} 
                           />
                           <animate attributeName="opacity" values="0;1;0" dur="2s" begin={`${delay}s`} repeatCount="indefinite" />
                       </circle>
                   ))}
                </g>
            ))}

            {/* Nodes */}
            {nodes.map((node, i) => (
                <g key={`node-${i}`} className="cursor-pointer group">
                    <circle 
                        cx={node.x} cy={node.y} 
                        r={node.type === 'ROOT' ? 64 : 44} 
                        fill="white" 
                        stroke="#f8fafc" 
                        strokeWidth="10"
                        className="shadow-2xl shadow-slate-200"
                    />
                    <circle 
                        cx={node.x} cy={node.y} 
                        r={node.type === 'ROOT' ? 52 : 32} 
                        fill="white" 
                        stroke={node.type === 'ROOT' ? '#ef4444' : '#f97316'} 
                        strokeWidth="8"
                        filter={node.type === 'ROOT' ? 'url(#glow-noc-premium)' : 'none'}
                        className="transition-all duration-700 transform group-hover:scale-125"
                    />
                    
                    {node.type === 'ROOT' && (
                        <circle cx={node.x} cy={node.y} r="72" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="10,15" opacity="0.3">
                            <animateTransform 
                                attributeName="transform" type="rotate" from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`} 
                                dur="15s" repeatCount="indefinite"
                            />
                        </circle>
                    )}

                    <g transform={`translate(${node.x}, ${node.y + (node.type === 'ROOT' ? 95 : 75)})`}>
                        <rect x="-70" y="-14" width="140" height="28" rx="12" fill="white" className="shadow-2xl shadow-slate-200 border border-slate-50" />
                        <text 
                            textAnchor="middle" 
                            y="4.5"
                            fill="#0f172a" 
                            className="text-badge font-bold uppercase pointer-events-none"
                        >
                            {node.label}
                        </text>
                    </g>

                    {node.type === 'ROOT' ? (
                        <g transform={`translate(${node.x-16}, ${node.y-16})`}>
                            <AlertTriangle size={32} className="text-red-500 animate-pulse" strokeWidth={3} />
                        </g>
                    ) : (
                        <circle cx={node.x} cy={node.y} r="10" fill="#f97316" className="animate-pulse shadow-xl shadow-orange-500/20" />
                    )}
                </g>
            ))}
        </svg>
    );
};
