import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDevice, getAlarms, getIncidents } from "../api/api";
import { 
  Server, Activity, ShieldAlert, Ticket, Layers, 
  Clock, HardDrive, Info, ArrowLeft, RefreshCw,
  Download, Search, Filter, AlertCircle, CheckCircle,
  TrendingUp, Zap, Radio, Globe, MapPin, Database,
  Cpu, ZapOff, Link as LinkIcon, Share2, ClipboardList, Laptop, ChevronRight
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { toast } from "react-toastify";

// Helper components
const Badge = ({ children, color="blue" }) => {
    const colors = {
        green: "bg-emerald-50 text-emerald-600 border-emerald-100",
        red: "bg-red-50 text-red-600 border-red-100",
        yellow: "bg-orange-50 text-orange-600 border-orange-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        slate: "bg-slate-50 text-slate-600 border-slate-100"
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-badge font-bold uppercase border ${colors[color]}`}>
            {children}
        </span>
    );
};

const ActionButton = ({ icon: Icon, label, onClick, color="slate" }) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all group lg:min-w-[120px]"
    >
        <div className={`p-2 rounded-xl mb-2 group-hover:scale-110 transition-transform ${
            color === 'blue' ? 'bg-blue-50 text-blue-600' : 
            color === 'red' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
        }`}>
            <Icon size={18} />
        </div>
        <span className="text-badge font-bold text-slate-500 uppercase text-center">{label}</span>
    </button>
);

const SectionHeader = ({ icon: Icon, title, badge }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-900 rounded-lg text-white">
            <Icon size={16} />
        </div>
        <h2 className="text-section-title text-slate-900">{title}</h2>
        {badge !== undefined && <span className="bg-slate-100 text-slate-500 text-badge font-bold px-2 py-0.5 rounded-full">{badge}</span>}
    </div>
);

export default function InventoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Mock metric data
  const metricData = useMemo(() => Array.from({ length: 24 }).map((_, i) => ({
    time: `${i}:00`,
    cpu: Math.floor(Math.random() * 40) + 20,
    mem: Math.floor(Math.random() * 30) + 40,
    traffic: Math.floor(Math.random() * 800) + 200
  })), []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devRes, alarmRes, incRes] = await Promise.all([
        getDevice(id),
        getAlarms({ device_name: device?.hostname }), // Will retry after device loaded
        getIncidents({ device_name: device?.hostname })
      ]);
      setDevice(devRes.data);
      setAlarms(Array.isArray(alarmRes.data) ? alarmRes.data : []);
      // Adjust structure based on API response
      const incItems = incRes.data.items || incRes.data || [];
      setIncidents(incItems);
    } catch (err) {
      toast.error("Failed to load diagnostic data");
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  // Effect to load related items once device hostname is known
  useEffect(() => {
    if (device?.hostname) {
        getAlarms({ device_name: device.hostname }).then(r => setAlarms(r.data)).catch(()=>{});
        getIncidents({ device_name: device.hostname }).then(r => setIncidents(r.data.items || r.data)).catch(()=>{});
    }
  }, [device]);

  const healthScore = useMemo(() => {
    let score = 100;
    const criticalAlarms = alarms.filter(a => a.severity === "Critical").length;
    const majorAlarms = alarms.filter(a => a.severity === "Major").length;
    score -= (criticalAlarms * 15);
    score -= (majorAlarms * 5);
    return Math.max(0, score);
  }, [alarms]);

  if (loading && !device) return (
    <div className="p-8 flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
            <RefreshCw className="animate-spin text-blue-600" size={48} />
            <span className="text-small font-bold uppercase text-slate-400">Synchronizing Asset Intel...</span>
        </div>
    </div>
  );

  if (!device && !loading) return (
    <div className="p-20 text-center text-red-500 bg-slate-50 h-screen text-title uppercase">
        Asset not found in CNMS Repository
    </div>
  );

  const stats = [
    { label: "Active Alarms", value: alarms.length, icon: ShieldAlert, color: alarms.length > 0 ? "text-orange-500" : "text-slate-400" },
    { label: "Health Score", value: `${healthScore}%`, icon: Zap, color: healthScore > 80 ? "text-emerald-500" : "text-red-500" },
    { label: "Uptime", value: "99.98%", icon: Clock, color: "text-blue-500" },
    { label: "Source", value: device.lnms_node_id, icon: Database, color: "text-slate-600" },
  ];

  return (
    <div className="p-6 main-content min-h-screen font-sans text-slate-900 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation */}
        <div className="flex justify-between items-center mb-10">
            <button onClick={() => navigate(-1)} className="group flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all text-badge font-bold uppercase lg:ml-2">
                <div className="p-2 bg-white border border-slate-200 rounded-xl group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
                    <ArrowLeft size={16} />
                </div>
                Return to Matrix
            </button>
            <div className="flex gap-3">
                <button onClick={loadData} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                    <RefreshCw size={18} />
                </button>
                <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                    <Share2 size={18} />
                </button>
            </div>
        </div>

        {/* Header / Summary Card */}
        <div className="grid grid-cols-12 gap-6 mb-8">
            <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-8 relative z-10">
                    <div className="w-32 h-32 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl relative group">
                        <Server size={64} />
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-white">
                            <CheckCircle size={20} className="text-white" />
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <h1 className="text-page-title font-bold text-slate-900">{device.hostname}</h1>
                            <Badge color={device.status === 'ACTIVE' ? 'green' : 'red'}>{device.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-10">
                            {[
                                { icon: Globe, label: "IP ADDRESS", value: device.ip_address },
                                { icon: Radio, label: "DEVICE TYPE", value: device.device_type },
                                { icon: Database, label: "SOURCE NODE", value: device.lnms_node_id },
                                { icon: MapPin, label: "LOCATION", value: device.location || "Undefined" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="text-slate-300"><item.icon size={18} /></div>
                                    <div>
                                        <p className="text-small font-bold text-slate-400 uppercase">{item.label}</p>
                                        <p className="text-body font-semibold text-slate-700">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full translate-x-32 -translate-y-32"></div>
            </div>

            <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md flex flex-col justify-between">
                        <div className={`p-2 w-fit rounded-xl bg-slate-50 ${s.color}`}>
                            <s.icon size={20} />
                        </div>
                        <div className="mt-2">
                            <p className="text-small font-bold text-slate-400 uppercase mb-1">{s.label}</p>
                            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex flex-wrap gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
            <ActionButton icon={ClipboardList} label="Metadata" color="blue" />
            <ActionButton icon={Activity} label="Performance" color="blue" />
            <ActionButton icon={ShieldAlert} label="Alarms" color="red" />
            <ActionButton icon={Ticket} label="Incidents" />
            <ActionButton icon={RefreshCw} label="Re-Sync" />
            <ActionButton icon={TrendingUp} label="Drift Analysis" />
            <ActionButton icon={Radio} label="Live Ping" />
        </div>

        {/* Tabs / Content Section */}
        <div className="flex gap-8 mb-8 border-b border-slate-200">
            {["overview", "alarms", "incidents", "metrics", "topology", "impact"].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 text-badge font-bold uppercase transition-all relative ${
                        activeTab === tab ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                    }`}
                >
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-[-1px] left-0 w-full h-1 bg-blue-600 rounded-full"></div>}
                </button>
            ))}
        </div>

        <div className="min-h-[400px]">
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
                        <SectionHeader icon={Info} title="System Properties" />
                        <div className="space-y-6">
                            {[
                                { k: "Hostname", v: device.hostname },
                                { k: "Operating System", v: "Cisco IOS-XE 17.6.3a" },
                                { k: "Kernel Version", v: "5.4.0-gen-84" },
                                { k: "Uptime", v: "245 Days, 12:44:02" },
                                { k: "Last Sync", v: new Date().toLocaleString() },
                                { k: "Hardware Model", v: "C9300-48UXM" }
                            ].map((p, i) => (
                                <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-4 last:border-0">
                                    <span className="text-small font-bold text-slate-400 uppercase">{p.k}</span>
                                    <span className="text-body font-semibold text-slate-800">{p.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                        <SectionHeader icon={ShieldAlert} title="Risk Profile" />
                        <div className="space-y-6 relative z-10">
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                                <p className="text-badge font-bold text-blue-400 uppercase mb-2">Exposure Level</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black">Low</span>
                                    <span className="text-blue-400 text-xs mb-1 font-bold">Standard Risk</span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                                <p className="text-badge font-bold text-blue-400 uppercase mb-2">Security Patch</p>
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={20} className="text-emerald-500" />
                                    <span className="font-bold">Compliant (Last Audit 2h ago)</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-[-50px] right-[-50px] opacity-10 rotate-12">
                             <ShieldAlert size={200} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "alarms" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                         <SectionHeader icon={Radio} title="Active Alarms" badge={alarms.length} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    {["Severity", "Type", "Description", "Raised At", "Status"].map(h => (
                                        <th key={h} className="table-cell-padded text-table-header text-slate-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {alarms.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase">No active threats detected</td>
                                    </tr>
                                ) : alarms.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="table-cell-padded">
                                            <Badge color={a.severity === 'Critical' ? 'red' : 'yellow'}>{a.severity}</Badge>
                                        </td>
                                        <td className="table-cell-padded text-body font-semibold text-slate-800">{a.alarm_type}</td>
                                        <td className="table-cell-padded text-body text-slate-500 font-medium">{a.description || 'System anomaly'}</td>
                                        <td className="table-cell-padded text-small text-slate-400 font-mono">{new Date(a.raised_at).toLocaleString()}</td>
                                        <td className="table-cell-padded">
                                             <span className="text-badge font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{a.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "incidents" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                         <SectionHeader icon={Layers} title="Correlated Incidents" badge={incidents.length} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    {["UID", "Incident Title", "Severity", "Impact", "Status"].map(h => (
                                        <th key={h} className="table-cell-padded text-table-header text-slate-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {incidents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase text-badge">No major outages mapped</td>
                                    </tr>
                                ) : incidents.map(inc => (
                                    <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="table-cell-padded text-small font-mono font-bold text-blue-600">{inc.incident_uid}</td>
                                        <td className="table-cell-padded text-body font-bold text-slate-800">{inc.title}</td>
                                        <td className="table-cell-padded">
                                            <Badge color={inc.severity === 'Critical' ? 'red' : 'yellow'}>{inc.severity}</Badge>
                                        </td>
                                        <td className="table-cell-padded text-body text-slate-500 font-medium">{inc.child_alarms_count} Signals</td>
                                        <td className="table-cell-padded">
                                             <span className="text-badge font-bold uppercase text-slate-400">{inc.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "metrics" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
                            <SectionHeader icon={Activity} title="CPU Utilization (%)" />
                            <div className="h-64 mt-4">
                                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                    <AreaChart data={metricData}>
                                        <defs>
                                            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="time" hide />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip labelStyle={{fontWeight:'bold'}} contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                        <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
                            <SectionHeader icon={Database} title="Memory Consumption (%)" />
                            <div className="h-64 mt-4">
                                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                    <AreaChart data={metricData}>
                                        <defs>
                                            <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="time" hide />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip labelStyle={{fontWeight:'bold'}} contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}}/>
                                        <Area type="monotone" dataKey="mem" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMem)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "topology" && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
                    <SectionHeader icon={Layers} title="Network Hierarchy" />
                    
                    <div className="flex flex-col items-center gap-12 relative z-10">
                         {/* Parent */}
                         <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-2xl flex flex-col items-center w-64 border-2 border-slate-800">
                             <TrendingUp size={24} className="mb-2 text-blue-400" />
                             <p className="text-small font-bold uppercase text-blue-400 mb-1">Upstream Gateway</p>
                             <p className="font-bold">Core-Router-MX-01</p>
                         </div>

                         <div className="h-20 w-1 bg-gradient-to-b from-slate-900 to-blue-500 rounded-full"></div>

                         {/* Self */}
                         <div className="p-8 bg-blue-600 text-white rounded-[2.5rem] shadow-2xl flex flex-col items-center w-80 border-4 border-white transform scale-110">
                             <Server size={32} className="mb-3" />
                             <p className="text-badge font-bold uppercase text-blue-100 mb-1">Target Asset</p>
                             <p className="text-title font-bold">{device.hostname}</p>
                             <div className="mt-4 px-3 py-1 bg-white/20 rounded-full text-badge font-bold uppercase">
                                 {device.device_type}
                             </div>
                         </div>

                         <div className="flex gap-40 relative">
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-1 bg-slate-100 -z-10 mt-10"></div>
                             
                             <div className="flex flex-col items-center">
                                 <div className="h-10 w-1 bg-slate-200"></div>
                                 <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center w-40 opacity-60">
                                     <Laptop size={20} className="mb-1 text-slate-400" />
                                     <p className="text-badge font-bold text-slate-400 uppercase">Downstream 01</p>
                                 </div>
                             </div>

                             <div className="flex flex-col items-center">
                                 <div className="h-10 w-1 bg-slate-200"></div>
                                 <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center w-40 opacity-60">
                                     <Laptop size={20} className="mb-1 text-slate-400" />
                                     <p className="text-badge font-bold text-slate-400 uppercase">Downstream 02</p>
                                 </div>
                             </div>
                         </div>
                    </div>

                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-50/50 rounded-full -z-0"></div>
                </div>
            )}

            {activeTab === "impact" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md overflow-hidden relative">
                         <SectionHeader icon={ZapOff} title="Failure Impact Analysis" />
                         <div className="space-y-8 mt-8">
                             <div className="flex items-start gap-5">
                                 <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
                                     <Globe size={24} />
                                 </div>
                                 <div>
                                     <p className="text-sm font-black text-slate-900">Branch Connectivity Loss</p>
                                     <p className="text-xs text-slate-500 font-medium leading-relaxed">If this node fails, the entire Mumbai cluster will lose access to the central database, impacting 45 active operators.</p>
                                 </div>
                             </div>
                             <div className="flex items-start gap-5">
                                 <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                                     <Radio size={24} />
                                 </div>
                                 <div>
                                     <p className="text-sm font-black text-slate-900">VoIP Degradation</p>
                                     <p className="text-xs text-slate-500 font-medium leading-relaxed">Secondary impact on local telephony services with an estimated +150ms jitter increase across the subnet.</p>
                                 </div>
                             </div>
                             <div className="pt-6 border-t border-slate-100">
                                 <div className="flex justify-between items-center mb-2">
                                     <span className="text-badge font-bold text-slate-400 uppercase">Overall Risk Mitigation</span>
                                     <span className="text-badge font-bold text-blue-600 uppercase">75% Handled</span>
                                 </div>
                                 <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                     <div className="h-full bg-blue-500 rounded-full" style={{width:'75%'}}></div>
                                 </div>
                             </div>
                         </div>
                         <div className="absolute top-0 right-0 p-4">
                            <AlertCircle size={40} className="text-red-100" />
                         </div>
                    </div>
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl">
                        <SectionHeader icon={TrendingUp} title="Configuration Drift" />
                        <div className="mt-8 flex flex-col items-center justify-center h-full pb-10">
                             <div className="flex items-center gap-10 mb-10">
                                 <div className="flex flex-col items-center">
                                     <div className="w-20 h-20 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center text-slate-400 mb-2">
                                         <ClipboardList size={32} />
                                     </div>
                                     <p className="text-badge font-bold text-slate-400 uppercase">Baseline</p>
                                 </div>
                                 <ChevronRight className="text-slate-200" size={32} />
                                 <div className="flex flex-col items-center">
                                     <div className="w-20 h-20 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-center text-blue-600 mb-2 shadow-inner">
                                         <Activity size={32} />
                                     </div>
                                     <p className="text-badge font-bold text-blue-600 uppercase">Current</p>
                                 </div>
                             </div>
                             <div className="bg-emerald-50 text-emerald-600 px-6 py-4 rounded-3xl border border-emerald-100 flex items-center gap-3">
                                 <CheckCircle size={20} />
                                 <span className="text-small font-bold uppercase">No Drift Detected</span>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

      </div>
      
      {/* Legend Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 py-4 px-10 flex justify-between items-center z-50">
          <div className="flex gap-8">
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                  <span className="text-badge font-bold text-slate-500 uppercase">Telemetry Green</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                  <span className="text-badge font-bold text-slate-500 uppercase">Network Synchronized</span>
              </div>
          </div>
          <p className="text-badge text-slate-400 font-bold italic">Source: CMDB Repository - Updated Every 60s</p>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
