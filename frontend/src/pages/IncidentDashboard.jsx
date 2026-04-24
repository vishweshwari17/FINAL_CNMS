import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  AlertCircle, Clock, Activity, BarChart3, 
  Layers, RefreshCw, Filter, Download, ChevronRight
} from 'lucide-react';
import { getIncidentStats } from '../api/api';
import { format } from 'date-fns';

const IncidentDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [recentIncidents, setRecentIncidents] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await getIncidentStats();
      const data = res.data;
      setStats(data);
      // Mock or fetch recent incidents if available in stats
      setRecentIncidents(data.recent_incidents || []);
    } catch (err) {
      console.error("Failed to fetch incident stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    let timer;
    if (autoRefresh) {
      timer = setInterval(fetchStats, 30000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-small font-bold uppercase text-slate-500">Synchronizing Intelligence...</p>
        </div>
      </div>
    );
  }

  const severityData = stats?.incidents_by_severity 
    ? Object.entries(stats.incidents_by_severity).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="p-8 main-content min-h-screen font-sans text-slate-900 leading-relaxed pb-20">
      <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/30">
                <BarChart3 size={36} />
              </div>
              Incident Intelligence
            </h1>
            <p className="text-[14px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Strategic Correlation Matrix & Predictive Health Monitoring</p>
          </div>
          
          <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200/60">
            <FilterBtn active={true} label="Last 24h" />
            <FilterBtn label="7 Days" />
            <FilterBtn label="30 Days" />
            <div className="w-px h-6 bg-slate-200/60 self-center mx-2" />
            <button className="flex items-center gap-2 px-5 py-2.5 text-badge font-black text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* --- Top Stats --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <DashboardStat title="Total Incidents" value={stats.total_incidents} diff="+12%" icon={<AlertCircle size={24}/>} color="blue" />
          <DashboardStat title="SLA Breaches" value={stats.sla_breaches} diff="-5%" icon={<Clock size={24}/>} color="red" />
          <DashboardStat title="Avg Resolution" value="42m" icon={<Activity size={24}/>} color="emerald" />
          <DashboardStat title="Anomalies Found" value={stats.correlation_rules_triggered || 0} icon={<Layers size={24}/>} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="col-span-1 lg:col-span-2 bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 p-8 premium-shadow">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Incident Distribution</h3>
                <p className="text-[13px] text-slate-400 font-bold uppercase mt-1 tracking-wide">Severity-Based Anomaly Vectoring</p>
              </div>
              <div className="flex items-center gap-8">
                 {['Critical', 'Major', 'Minor'].map(s => (
                   <div key={s} className="flex items-center gap-3">
                     <div className={`w-3 h-3 rounded-full ${s==='Critical'?'bg-red-500 shadow-lg shadow-red-500/40':s==='Major'?'bg-amber-500 shadow-lg shadow-amber-500/40':'bg-blue-500 shadow-lg shadow-blue-500/40'}`} />
                     <span className="text-badge font-black uppercase text-slate-400 tracking-widest">{s}</span>
                   </div>
                 ))}
              </div>
            </div>
            
            <div className="h-[400px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={400} minHeight={300}>
                <BarChart 
                  data={severityData.length > 0 ? severityData : [
                    {name: 'Critical', value: stats.incidents_by_severity?.Critical || 0},
                    {name: 'Major', value: stats.incidents_by_severity?.Major || 0},
                    {name: 'Minor', value: stats.incidents_by_severity?.Minor || 0}
                  ]} 
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 900}}
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 900}} 
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc', radius: 10}}
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', background: '#fff', padding: '20px'}}
                    itemStyle={{fontWeight: 900, textTransform: 'uppercase', fontSize: '11px'}}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                    {(severityData.length > 0 ? severityData : [
                      {name: 'Critical', value: stats.incidents_by_severity?.Critical || 0},
                      {name: 'Major', value: stats.incidents_by_severity?.Major || 0},
                      {name: 'Minor', value: stats.incidents_by_severity?.Minor || 0}
                    ]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Critical' ? '#ef4444' : entry.name === 'Major' ? '#f59e0b' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Module: Alerts */}
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden premium-shadow">
            <div className="p-8 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Health Alerts</h3>
              <p className="text-[13px] text-slate-400 font-bold uppercase mt-1 tracking-wide">Real-time Forensic Feed</p>
            </div>
            <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
              {recentIncidents.map(inc => (
                <div 
                   key={inc.id} 
                   onClick={() => navigate(`/tickets/${inc.ticket_id || inc.id}`)}
                   className="group p-5 rounded-[1.5rem] border border-slate-50 hover:border-blue-200 hover:bg-blue-50/40 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border tracking-widest ${
                      inc.severity === 'Critical' ? 'bg-red-50 text-red-600 border-red-100 shadow-sm shadow-red-100' : 
                      inc.severity === 'Major' ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm shadow-amber-100' : 
                      'bg-blue-50 text-blue-600 border-blue-100 shadow-sm shadow-blue-100'
                    }`}>
                      {inc.severity}
                    </span>
                    <span className="text-badge text-slate-400 font-black flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Clock size={12} /> {format(new Date(inc.created_at || Date.now()), 'HH:mm')}
                    </span>
                  </div>
                  <h4 className="text-[15px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors leading-tight mb-2 uppercase tracking-tight">{inc.title}</h4>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-badge font-black text-slate-400 uppercase tracking-tighter opacity-50 group-hover:opacity-100">{inc.device_name}</span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                        <ChevronRight size={14} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              ))}
              {recentIncidents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                  <Activity size={48} strokeWidth={1} className="mb-4 opacity-20" />
                  <p className="text-badge font-black uppercase tracking-widest text-slate-400">Tactical Feed Empty</p>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50/30 border-t border-slate-50 text-center">
              <button 
                onClick={() => navigate('/incident-list')}
                className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-badge font-black text-blue-600 uppercase tracking-widest hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all active:scale-95"
              >
                Launch Unified Matrix
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FilterBtn = ({ label, active }) => (
  <button className={`px-5 py-2 text-badge font-bold uppercase rounded-xl transition-all ${
    active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-slate-600'
  }`}>
    {label}
  </button>
);

const DashboardStat = ({ title, value, diff, icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-200/40',
    red: 'bg-red-50 text-red-600 border-red-100 shadow-red-200/40',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-200/40',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-200/40'
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color]} shadow-sm bg-white flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300 cursor-default`}>
      <div className={`p-3 bg-white rounded-xl shadow-sm border border-inherit`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-badge font-bold uppercase opacity-70 whitespace-nowrap">{title}</p>
          {diff && <span className={`text-badge font-bold ${diff.startsWith('+')?'text-red-500':'text-emerald-500'}`}>{diff}</span>}
        </div>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
    </div>
  );
};

export default IncidentDashboard;
