import React from 'react';
import { ShieldAlert, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";

const ThreatIntelligence = ({ score = 42 }) => {
  const currentStatus = score > 75 ? 'CRITICAL' : (score > 40 ? 'ELEVATED' : 'STABLE');
  const statusColor = currentStatus === 'CRITICAL' ? 'text-red-600' : (currentStatus === 'ELEVATED' ? 'text-amber-600' : 'text-emerald-600');
  const statusBg = currentStatus === 'CRITICAL' ? 'bg-red-50' : (currentStatus === 'ELEVATED' ? 'bg-amber-50' : 'bg-emerald-50');

  return (
    <div className="h-full flex flex-col bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${statusBg} flex items-center justify-center ${statusColor} border border-slate-100 shadow-sm`}>
            <ShieldAlert size={20} />
          </div>
          <h2 className="text-badge font-black text-slate-800 uppercase tracking-widest">Network Risk Index</h2>
        </div>
        
        {/* Status Badge */}
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500 ${
          currentStatus === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 
          currentStatus === 'ELEVATED' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
          'bg-emerald-50 text-emerald-600 border-emerald-100'
        }`}>
          {currentStatus}
        </div>
      </div>

      {/* Score Cluster */}
      <div className="flex-1 flex flex-col justify-center items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Threat Velocity</p>
          <div className="relative">
              <div className={`text-7xl font-black tabular-nums tracking-tighter ${statusColor} transition-colors duration-500`}>
                {score}<span className="text-2xl ml-1">%</span>
              </div>
              <div className={`absolute -right-8 top-2`}>
                   {currentStatus === 'CRITICAL' ? <TrendingUp size={24} className="text-red-500 animate-bounce" /> : <ShieldCheck size={24} className="text-emerald-500" />}
              </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full max-w-[200px] h-2 bg-slate-50 rounded-full overflow-hidden mt-10 border border-slate-100 p-0.5">
             <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  currentStatus === 'CRITICAL' ? 'bg-red-600' : 
                  currentStatus === 'ELEVATED' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${score}%` }}
             />
          </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1">Anomaly Depth</p>
             <p className="text-[14px] font-black text-slate-700">HIGH FIDELITY</p>
          </div>
          <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1">Impact Vector</p>
             <p className="text-[14px] font-black text-slate-700">MULTI-NODE</p>
          </div>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl -z-10 group-hover:bg-blue-50 transition-colors"></div>
    </div>
  );
};

export default ThreatIntelligence;
