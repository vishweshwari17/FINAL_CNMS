import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getLnmsNodes } from "./api/api";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Alarms from "./pages/Alarms";
import TicketList from "./pages/Tickets";
import Devices from "./pages/Devices";
import { Administration, AuditLogs } from "./pages/AdminPages";
import TicketDetails from "./pages/TicketDetails";
import SyncDiagnostics from "./pages/SyncDiagnostics";
import TrendAnalysis from "./pages/TrendAnalysis";
import IncidentDashboard from "./pages/IncidentDashboard";
import IncidentsList from "./pages/IncidentsList";
import SLARisk from "./pages/SLARisk";
import MajorIncidents from "./pages/MajorIncidents";
import WarRoom from "./pages/WarRoom";
import InventoryDetail from "./pages/InventoryDetail";
import useAlarmWebSocket from "./hooks/useAlarmWebSocket";
import { useCallback, useRef } from "react";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AppContent() {
  const [lnmsNodes, setLnmsNodes] = useState([]);
  const [counts, setCounts] = useState({ incidents: 0, criticalAlarms: 0, totalNotifications: 0 });
  const navigate = useNavigate();

  const seenAlarms = useRef(new Set());

  const fetchCounts = useCallback(async () => {
    try {
      const [incRes, almRes, statsRes] = await Promise.all([
        import("./api/api").then(m => m.getIncidents({ status: "OPEN" })),
        import("./api/api").then(m => m.getAlarms({ severity: "Critical", status: "Active" })),
        import("./api/api").then(m => m.getDashboardStats())
      ]);
      
      const stats = statsRes.data;
      const totalTickets = (stats.tickets.OPEN || 0) + (stats.tickets.ACK || 0);
      const totalAlarms = stats.alarms.ACTIVE || 0;

      setCounts({
        incidents: incRes.data.total || incRes.data.items?.length || 0,
        criticalAlarms: almRes.data.length || 0,
        totalNotifications: totalTickets + totalAlarms
      });
    } catch (err) {
      console.error("Error fetching counts:", err);
    }
  }, []);

  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === "NEW_ALARM" || data.type === "TICKET_NEW" || data.type === "ALARM_UPDATE") {
      const { alarm } = data;
      
      if (data.type === "NEW_ALARM" && alarm) {
        // Prevent duplicate notifications
        if (seenAlarms.current.has(alarm.alarm_uid)) return;
        seenAlarms.current.add(alarm.alarm_uid);
        
        if (seenAlarms.current.size > 100) {
          const first = seenAlarms.current.values().next().value;
          seenAlarms.current.delete(first);
        }

        if (alarm.severity === "Critical") {
          const audio = new Audio("https://www.soundjay.com/buttons/beep-01a.mp3");
          audio.play().catch(() => {});
        }

        window.dispatchEvent(new CustomEvent("NEW_ALARM_RECEIVED", { detail: alarm }));

        const toastConfig = {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          theme: "colored",
        };

        const toastContent = (
          <div onClick={() => navigate(`/tickets?search=${alarm.alarm_uid}`)} className="cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="font-bold text-badge uppercase">{alarm.severity} ALARM</span>
            </div>
            <div className="text-sm font-semibold mt-1">{alarm.alarm_name}</div>
            <div className="text-badge opacity-90 mt-1">Device: {alarm.device_name}</div>
          </div>
        );

        if (alarm.severity === "Critical") toast.error(toastContent, toastConfig);
        else if (alarm.severity === "Major") toast.warning(toastContent, { ...toastConfig, style: { background: '#f97316' } });
        else if (alarm.severity === "Minor") toast.info(toastContent, { ...toastConfig, style: { background: '#eab308' } });
        else toast.info(toastContent, { ...toastConfig, style: { background: '#3b82f6' } });
      }

      // Re-fetch counts for any relevant WebSocket update
      fetchCounts();
    }

    // Refresh nodes list
    getLnmsNodes().then(r => setLnmsNodes(r.data)).catch(() => {});
  }, [navigate, fetchCounts]);

  useAlarmWebSocket(handleWebSocketMessage);

  useEffect(() => {
    getLnmsNodes().then(r => setLnmsNodes(r.data)).catch(()=>{});
    fetchCounts();
  }, [fetchCounts]);

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-800 main-content">
      <Header lnmsNodes={lnmsNodes} notificationCount={counts.totalNotifications} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          incidentsCount={counts.incidents} 
          criticalAlarmsCount={counts.criticalAlarms} 
        />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Routes>
            <Route path="/"                    element={<Dashboard />} />
            <Route path="/alarms"              element={<Alarms />} />
            <Route path="/incidents"           element={<IncidentDashboard />} />
            <Route path="/incident-list"      element={<IncidentsList />} />
            <Route path="/sla-risk"            element={<SLARisk />} />
            <Route path="/major-incidents"     element={<MajorIncidents />} />
            <Route path="/analysis"            element={<TrendAnalysis />} />
            <Route path="/diagnostics"         element={<SyncDiagnostics />} />
            <Route path="/tickets"             element={<TicketList />} />
            <Route path="/tickets/:id"         element={<TicketDetails />} />
            <Route path="/devices"             element={<Devices />} />
            <Route path="/admin"               element={<Administration />} />
            <Route path="/audit"               element={<AuditLogs />} />
            <Route path="/war-room"           element={<WarRoom />} />
            <Route path="/war-room/:id"       element={<WarRoom />} />
            <Route path="/inventory/:id"      element={<InventoryDetail />} />
            <Route path="*"                   element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-900 p-20">
      <div className="p-4 bg-red-100 rounded-2xl text-red-600 mb-6 font-black text-2xl">404</div>
      <h1 className="text-4xl font-black mb-4">Command Center Link Broken</h1>
      <p className="text-slate-500 mb-8 max-w-md text-center">The tactical coordinate you entered does not exist in the CNMS repository. Please return to home base.</p>
      <button 
        onClick={() => navigate("/")}
        className="px-8 py-3 bg-blue-600 text-white font-bold uppercase rounded-2xl shadow-xl shadow-blue-500/30 hover:scale-105 transition-all"
      >
        Return to Dashboard
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}