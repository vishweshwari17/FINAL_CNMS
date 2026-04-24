import React from 'react';
import { Server, ShieldAlert, Clock, Gauge, Target, Users, Zap, AlertTriangle } from "lucide-react";

const AIRootCauseEngine = ({ clusterDetails, loadingDetails }) => {
  if (loadingDetails) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm animate-pulse">
        <div className="relative">
          <Zap size={48} className="text-blue-500 animate-bounce" />
          <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 animate-pulse"></div>
        </div>
        <p className="mt-6 text-badge font-black text-slate-400 uppercase tracking-widest">Inference in Progress...</p>
      </div>
    );
  }

  if (!clusterDetails) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center">
        <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
           <Target size={40} strokeWidth={1} />
        </div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Awaiting Forensic Input</h3>
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[280px]">
          Select an incident from the Triage Matrix to initiate deep root cause analysis and impact mapping.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-500/20">
              <ShieldAlert size={24} />
           </div>
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Root Cause Status</h2>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                 Forensic Analysis Verified
              </p>
           </div>
        </div>
        <div className="flex items-center gap-2 px-6 py-2.5 bg-amber-50 border border-amber-100 rounded-2xl shadow-sm">
           <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Confidence Index</span>
           <span className="text-[15px] font-black text-amber-700">{clusterDetails.confidence}%</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-2 gap-6">
          {/* Root Cause Device */}
          <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:border-blue-300 transition-all">
             <div className="flex items-center gap-3 mb-4">
                <Server size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Root Cause Device</span>
             </div>
             <p className="text-xl font-black text-slate-800 uppercase truncate">{clusterDetails.root_cause_device}</p>
             <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-tighter">Core Infrastructure Layer</p>
          </div>

          {/* Root Cause Alarm */}
          <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:border-red-300 transition-all">
             <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={18} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Root Cause Alarm</span>
             </div>
             <p className="text-xl font-black text-slate-800 uppercase truncate">{clusterDetails.root_cause_alarm}</p>
             <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-tighter">Service Degradation Trigger</p>
          </div>

          {/* Detection Time */}
          <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
             <div className="flex items-center gap-3 mb-4">
                <Clock size={18} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detected At</span>
             </div>
             <p className="text-xl font-black text-slate-800 tabular-nums">{clusterDetails.detected_at}</p>
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Clock size={64} />
             </div>
          </div>

          {/* Impact Scope */}
          <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
             <div className="flex items-center gap-3 mb-4">
                <Users size={18} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impact Scope</span>
             </div>
             <p className="text-xl font-black text-slate-800">{clusterDetails.impact_scope} <span className="text-[12px] text-slate-400">DEVICES</span></p>
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Gauge size={64} />
             </div>
          </div>
      </div>

      {/* Suggested Action Bar */}
      <div className="mt-8 p-6 bg-blue-600 rounded-[2.2rem] shadow-xl shadow-blue-500/20 flex items-center justify-between group cursor-default hover:bg-blue-700 transition-all">
         <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shrink-0">
               <Zap size={22} fill="currentColor" />
            </div>
            <div>
               <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Recommended Response</p>
               <p className="text-[15px] font-black text-white uppercase tracking-tight">{clusterDetails.suggested_action}</p>
            </div>
         </div>
         <button className="px-6 py-3 bg-white text-blue-600 text-badge font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg">Execute</button>
      </div>
    </div>
  );
};

export default AIRootCauseEngine;
