import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Clock, CheckCircle2, AlertTriangle, 
  ChevronRight, BarChart2, Download
} from 'lucide-react';
import { getSlaRisk } from '../api/api';

import { useNavigate } from 'react-router-dom';

const SLARisk = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRisk = async () => {
    try {
      const res = await getSlaRisk();
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch SLA risk data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisk();
    const interval = setInterval(fetchRisk, 15000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    highRisk: data.filter(d => d.risk_level === 'High' || d.risk_level === 'Breached').length,
    breached: data.filter(d => d.sla_breached).length,
    total: data.length
  };

  return (
    <div className="p-8 main-content min-h-screen font-sans">
      <div className="max-w-7xl mx-auto mt-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-500/30">
                <ShieldAlert size={32} />
              </div>
              SLA Risk Intelligence
            </h2>
            <p className="text-[14px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Strategic Predictive Compliance & Breach Mitigation</p>
          </div>
          <button className="flex items-center gap-2 bg-white/50 backdrop-blur-md text-slate-600 border border-slate-200 px-6 py-3 rounded-2xl text-badge font-black uppercase hover:bg-slate-50 transition-all shadow-sm tracking-widest">
            <Download size={14} /> Intelligence Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <RiskStat title="Active Monitoring" value={stats.total} icon={<Clock size={20} />} color="blue" />
          <RiskStat title="High Risk Vectors" value={stats.highRisk} icon={<AlertTriangle size={20} />} color="amber" />
          <RiskStat title="Breaches Detected" value={stats.breached} icon={<ShieldAlert size={20} />} color="red" />
          <RiskStat title="SLA Compliance" value={data.length ? "94.2%" : "100%"} icon={<CheckCircle2 size={20} />} color="emerald" />
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-10 premium-shadow">
          <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Live Predictive Queue</h3>
              <p className="text-[11px] text-slate-400 font-bold mt-2 uppercase opacity-60">Real-time Risk Vectoring</p>
            </div>
            <span className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-xl text-badge font-black text-indigo-600 border border-indigo-100 shadow-inner uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Forensic Link Active
            </span>
          </div>

          <div className="divide-y divide-slate-50">
            {loading ? (
               <div className="p-32 flex flex-col items-center justify-center gap-6">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                  <p className="text-badge font-black text-slate-400 uppercase tracking-widest">Synchronizing Intelligence...</p>
               </div>
            ) : data.length === 0 ? (
               <div className="p-32 flex flex-col items-center justify-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 shadow-inner">
                      <BarChart2 size={40} />
                  </div>
                  <p className="text-badge font-black text-slate-400 uppercase tracking-widest">No Compliance Anomalies Detected</p>
               </div>
            ) : data.map(item => (
              <div 
                key={item.ticket_id} 
                onClick={() => navigate(`/tickets/${item.ticket_id}`)}
                className="group p-8 hover:bg-slate-50/50 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-8 cursor-pointer"
              >
                <div className="flex items-center gap-8">
                  <div className={`w-1.5 h-16 rounded-full transition-transform group-hover:scale-y-110 ${
                    item.risk_level === 'Breached' ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 
                    item.risk_level === 'High' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 
                    item.risk_level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <div>
                    <div className="text-[11px] font-black text-blue-600 tracking-widest flex items-center gap-4 mb-2 uppercase">
                       Reference: #{item.short_id || item.ticket_id}
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200 tracking-widest">
                        {item.severity_original}
                      </span>
                      <span className="text-[10px] text-indigo-400 font-extrabold tracking-widest">{item.source_system}</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight mb-3">
                        {item.title || "Compliance Vector Detected"}
                    </div>
                    <div className="text-badge font-black text-slate-400 uppercase tracking-widest flex flex-wrap items-center gap-8">
                      <span className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Clock size={12} className="text-slate-400" /> 
                        Threshold: <span className={`font-mono font-black ${item.sla_breached ? 'text-red-600' : 'text-slate-800'}`}>{item.remaining_time}m remaining</span>
                      </span>
                      <span className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <BarChart2 size={12} className="text-slate-400" /> 
                        Risk Index: <span className={`font-black ${item.risk_level === 'High' || item.risk_level === 'Breached' ? 'text-red-600' : 'text-emerald-500'}`}>{item.risk_percentage}% - {item.risk_level}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="w-48 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner border border-slate-200/50">
                    <div className={`h-full transition-all duration-1000 ${
                       item.risk_percentage >= 80 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' :
                       item.risk_percentage >= 50 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    }`} style={{ width: `${item.risk_percentage}%` }} />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner group-hover:scale-110">
                      <ChevronRight size={20} strokeWidth={3} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const RiskStat = ({ title, value, icon, color }) => {
  const colors = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100 shadow-[0_10px_30px_rgba(239,68,68,0.1)]',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };
  return (
    <div className={`p-5 rounded-2xl border ${colors[color]} bg-white flex items-center gap-4 transition-all hover:translate-y-[-2px] duration-300 shadow-sm border border-slate-100`}>
      <div className={`p-2.5 rounded-xl shadow-sm border border-inherit bg-white text-inherit`}>{icon}</div>
       <div>
        <p className="text-badge font-bold uppercase text-slate-400">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
    </div>
  );
};

export default SLARisk;
