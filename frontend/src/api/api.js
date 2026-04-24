import axios from "axios";

// Base URL: LNMS on 8000, fallback if not set
<<<<<<< HEAD
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8001") + "/api";
=======
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8001";
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c

const API = axios.create({
  baseURL: BASE
});

/* =========================
       API CALLS
========================= */
export const getLnmsNodes      = ()           => API.get("/lnms-nodes");
export const getDashboardStats = ()           => API.get("/dashboard/stats");
export const getAlarms         = (params={}) => API.get("/alarms", { params });
export const getDevices        = (params={}) => API.get("/devices", { params });
export const getDevice         = (id)        => API.get(`/devices/${id}`);
export const getIncidents        = (params={}) => API.get("/incidents", { params });
export const getIncidentAlarms  = (id)        => API.get(`/incidents/${id}/alarms`);
export const updateIncidentStatus = (id, s)    => API.put(`/incidents/${id}/status`, { status: s });
export const getIncidentStats   = ()           => API.get("/dashboard/incident-stats");
export const getWarRoomData      = ()           => API.get("/war-room/");
export const getClusterDetails    = (id)         => API.get(`/war-room/clusters/${id}`);
export const acknowledgeIncident = (id)         => API.put(`/war-room/incidents/${id}/acknowledge`);
export const resolveIncident     = (id)         => API.put(`/war-room/incidents/${id}/resolve`);
<<<<<<< HEAD
export const getMajorIncidents   = ()           => API.get("/major-incidents/");
export const getSlaRisk         = ()           => API.get("/sla/risk");
=======
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c

// Tickets (CNMS unified)
export const getTickets        = (params={}) => API.get("/tickets", { params });
export const getTicket         = (id)        => API.get(`/tickets/${id}`);
export const addComment        = (id, data)  => API.post(`/tickets/${id}/comment`, data);
export const acknowledgeTicket = (id)        => API.put(`/tickets/${id}/ack`);
export const resolveTicket     = (id, data)  => API.put(`/tickets/${id}/resolve`, data);
export const closeTicket       = (id)        => API.put(`/tickets/${id}/close`);

// Diagnostics & Admin
export const getTcpLogs         = (limit=50)  => API.get("/tcp-log", { params: { limit } });
export const getAuditLogs       = (limit=100) => API.get("/admin/audit", { params: { limit } });
export const getCorrelatedAlarms = ()          => API.get("/admin/correlated-alarms");

/* =========================
       HELPER FUNCTIONS
       for Tickets.jsx
========================= */
export const handleAcknowledgeTicket = async (ticketId) => {
  try {
    return await acknowledgeTicket(ticketId);
  } catch (err) {
    console.error(`Error acknowledging ticket ${ticketId}:`, err);
    throw err;
  }
};

export const handleResolveTicket = async (ticketId, user, note) => {
  try {
    // Note: Tickets.jsx passes (ticketId, "Admin", note)
    // resolveTicket expects (id, { resolution_note: note, ... })
    return await resolveTicket(ticketId, { resolution_note: note, resolved_by: user });
  } catch (err) {
    console.error(`Error resolving ticket ${ticketId}:`, err);
    throw err;
  }
};

export const handleCloseTicket = async (ticketId) => {
  try {
    return await closeTicket(ticketId);
  } catch (err) {
    console.error(`Error closing ticket ${ticketId}:`, err);
    throw err;
  }
};

export const fullSyncFromCnms = async () => {
  try {
    // Call CNMS → LNMS sync API if exists, otherwise just log
    console.log("Syncing CNMS tickets to LNMS...");
    // Example: await API.post("/sync/cnms-to-lnms");
  } catch (err) {
    console.error("Error syncing CNMS tickets:", err);
  }
};