import { useState, useEffect } from "react";

export default function Header({ lnmsNodes = [] }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const connected = lnmsNodes.filter(n => n.status === "CONNECTED").length;

  return (
    <div className="px-5 py-0 h-13 flex items-center gap-4 shrink-0 shadow-sm z-50 border-b border-blue-700/30" style={{ background: "var(--blue-header)" }}>
      <div className="flex items-center gap-3">
        <div>
          <div className="text-section-title text-white font-bold uppercase tracking-tight">TCS Central Network Management System</div>
        </div>
      </div>

      <div className="w-px h-7 bg-blue-400/50 mx-1" />

      {/* TCP Status */}
      <div className="flex items-center gap-1.5 bg-blue-800/50 border border-blue-600/50 rounded-full px-3 py-1 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-badge text-blue-100 font-bold">TCP · {connected}/{lnmsNodes.length} LNMS</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-6 mr-4">
        <div className="relative cursor-pointer group">
          <div className="p-2.5 bg-blue-800/40 hover:bg-blue-700/60 rounded-xl border border-blue-600/30 transition-all shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-100 group-hover:text-white transition-colors"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          </div>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-blue-900 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-bounce">2</span>
        </div>
      </div>

      <div className="flex items-center gap-6 text-badge text-blue-200 font-bold uppercase tracking-widest">
        <span>USER: <strong className="text-white">Admin</strong></span>
        <span>NODE ID: <strong className="text-white">001</strong></span>
        <span className="text-blue-300">
          {time.toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"})}
        </span>
        <span className="font-mono text-blue-300">{time.toLocaleTimeString("en-IN")}</span>
      </div>
    </div>
  );
}