import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  ChevronDown, ChevronRight, Menu, Radio, Terminal,
  ShieldAlert, Layers, BarChart3, Clock, LayoutDashboard,
  Activity, Ticket, Server, Settings, ClipboardList, AlertCircle
} from "lucide-react";

export default function Sidebar({ incidentsCount = 0, criticalAlarmsCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const NavLink = ({ to, label, Icon, badge }) => (
    <Link to={to} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-body transition-all duration-300 sidebar-item
      ${isActive(to) 
        ? "shadow-sm bg-blue-500/20 border-l-4 border-blue-300" 
        : "text-blue-200 hover:bg-blue-600/20 hover:text-blue-100"}`}>
      <Icon size={18} className={`shrink-0 ${isActive(to) ? "text-blue-300" : "text-blue-400 group-hover:text-blue-200"}`} />
      {!collapsed && <span className={`flex-1 truncate font-bold uppercase tracking-tight ${isActive(to) ? "text-blue-100" : "text-[var(--blue-sidebar-text)]"}`}>{label}</span>}
      {badge && (
        <span className={`ml-auto text-badge font-bold px-2 py-0.5 rounded-lg min-w-5 text-center shadow-inner ${
            isActive(to) ? "bg-blue-400 text-white" : "bg-red-500 text-white"
        }`}>
          {badge}
        </span>
      )}
    </Link>
  );

  const CollapsibleSection = ({ label, Icon, children, defaultOpen = false }) => { // eslint-disable-line no-unused-vars
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    if (collapsed) {
      return (
        <div className="flex flex-col items-center py-4 border-b border-slate-100 gap-4">
           {children}
        </div>
      );
    }

    return (
      <div className="mb-4">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-badge text-blue-300 uppercase tracking-widest hover:text-blue-100 transition-colors border-none font-black"
        >
          <div className="flex items-center gap-3">
            <Icon size={14} />
            <span>{label}</span>
          </div>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {isOpen && (
          <div className="mt-2 ml-2 space-y-1 transition-all duration-500">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`text-slate-800 h-full shrink-0 flex flex-col transition-all duration-500 ${collapsed ? "w-20" : "w-72"} border-r border-slate-100 shadow-xl overflow-hidden z-[60] sidebar`} style={{ background: "linear-gradient(180deg, var(--blue-sidebar-dark), var(--blue-sidebar-light))" }}>

      {/* Header */}
      <div className={`flex items-center border-b border-blue-700/30 px-6 py-6 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div>
            <h1 className="text-section-title flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10" style={{ background: "var(--blue-accent)" }}>
                    <Radio size={18} className="text-white" />
                </div>
                <span className="text-white font-black uppercase tracking-tighter">CNMS <span style={{ color: "var(--blue-accent)" }}>PRO</span></span>
            </h1>
            <p className="text-badge uppercase mt-1 font-bold tracking-widest text-blue-200">Real-Time Operations</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-blue-300 hover:text-blue-100 transition-all p-2 rounded-xl bg-blue-800/50 border border-blue-600/50 hover:border-blue-400 shadow-sm">
          <Menu size={18} />
        </button>
      </div>

      <nav className="px-3 py-8 space-y-1 flex-1 overflow-y-auto no-scrollbar">
        
        <CollapsibleSection label="Command" Icon={LayoutDashboard} defaultOpen={true}>
          <NavLink to="/war-room"    label="NOC Command"   Icon={ShieldAlert} />
          <NavLink to="/"            label="Operational Overview"  Icon={LayoutDashboard} />
          <NavLink to="/analysis"    label="Performance Trends" Icon={Activity} />
          <NavLink to="/diagnostics" label="Sync Diagnostics" Icon={Terminal} />
        </CollapsibleSection>

        <CollapsibleSection label="Incidents" Icon={AlertCircle}>
          <NavLink to="/incidents" label="Incident Matrix" Icon={BarChart3} />
          <NavLink to="/incident-list" label="Active Response" Icon={Layers} badge={incidentsCount} />
          <NavLink to="/major-incidents" label="Major Outages" Icon={ShieldAlert} />
          <NavLink to="/sla-risk" label="SLA Risk Radar" Icon={Clock} />
        </CollapsibleSection>

        <CollapsibleSection label="Monitoring" Icon={Activity}>
          <NavLink to="/alarms" label="Alarm Stream" Icon={Activity} badge={criticalAlarmsCount} />
          <NavLink to="/tickets" label="Service Tickets" Icon={Ticket} />
        </CollapsibleSection>

        <CollapsibleSection label="Inventory" Icon={Settings}>
          <NavLink to="/devices" label="Asset Control" Icon={Server} />
          <NavLink to="/admin"   label="Console Admin" Icon={Settings} />
          <NavLink to="/audit"   label="Audit Trail"   Icon={ClipboardList} />
        </CollapsibleSection>
      </nav>

      <div className="p-6 border-t border-blue-700/30">
          {!collapsed && (
              <div className="flex items-center gap-4 bg-blue-800/30 p-3 rounded-[1.5rem] border border-blue-600/50">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-semibold text-sm shadow-lg shadow-blue-500/20 text-white" style={{ background: "var(--blue-accent)" }}>AD</div>
                  <div className="flex-1 min-w-0">
                      <div className="text-body font-bold truncate text-blue-100">Senior Architect</div>
                      <div className="text-badge font-bold uppercase text-blue-300">NOC Level 3</div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}