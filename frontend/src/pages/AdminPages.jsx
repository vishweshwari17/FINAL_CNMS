import { useState, useEffect } from "react";
import { FaTrash, FaEdit, FaUserPlus, FaServer, FaCheck, FaTimes, FaSearch } from "react-icons/fa";
import { RefreshCw } from "lucide-react";
import axios from "axios";
import { getAuditLogs } from "../api/api";
import { fmt } from "../components/Badges";

const API = (import.meta.env.VITE_API_URL || "http://localhost:8001") + "/api/admin";

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", borderRadius: 10, minWidth: 260, maxWidth: 340,
          background: t.type === "success" ? "#0f766e" : "#dc2626",
          color: "#fff", fontSize: 14, fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "slideIn 0.3s ease"
        }}>
          {t.type === "success" ? <FaCheck size={14} /> : <FaTimes size={14} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", opacity: 0.7 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };
  const remove = (id) => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, success: m => add(m, "success"), error: m => add(m, "error"), remove };
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const roleBadge = { ADMIN: "#1e40af", NOC: "#0f766e", L1: "#7c3aed", L2: "#b45309" };
const typeBadge = { Router: "#0369a1", Switch: "#0f766e", Firewall: "#dc2626", Server: "#7c3aed" };

function Badge({ label, colorMap }) {
  const bg = colorMap[label] || "#6b7280";
  return (
    <span style={{
      background: bg + "18", color: bg, border: `1.5px solid ${bg}40`,
    }} className="px-2.5 py-0.5 rounded-lg text-badge font-bold uppercase">{label}</span>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label className="text-badge font-bold text-slate-500 uppercase">{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 12px",
  outline: "none", background: "#f8fafc", color: "#1e293b",
  transition: "border-color 0.15s",
  width: "100%", boxSizing: "border-box"
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

export function Administration() {
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState({ users: false, devices: false });

  const [userForm, setUserForm] = useState({ username: "", email: "", role: "NOC" });
  const [deviceForm, setDeviceForm] = useState({ device_name: "", hostname: "", ip_address: "", device_type: "Router", location: "" });

  const [editingUser, setEditingUser] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);

  const [searchUser, setSearchUser] = useState("");
  const [searchDevice, setSearchDevice] = useState("");

  useEffect(() => { fetchUsers(); fetchDevices(); }, []);

  const fetchUsers = async () => {
    setLoading(l => ({ ...l, users: true }));
    try {
      const res = await axios.get(`${API}/users`);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(l => ({ ...l, users: false }));
    }
  };

  const fetchDevices = async () => {
    setLoading(l => ({ ...l, devices: true }));
    try {
      const res = await axios.get(`${API}/devices`);
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error("Failed to load devices");
    } finally {
      setLoading(l => ({ ...l, devices: false }));
    }
  };

  // ── User CRUD ───────────────────────────────────────────────────────────────
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${API}/users/${editingUser}`, userForm);
        toast.success(`User "${userForm.username}" updated successfully`);
      } else {
        await axios.post(`${API}/users`, userForm);
        toast.success(`User "${userForm.username}" created successfully`);
      }
      setUserForm({ username: "", email: "", role: "NOC" });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      const msg = err?.response?.data?.detail || "User operation failed";
      toast.error(msg);
    }
  };

  const handleEditUser = (u) => {
    setUserForm({ username: u.username, email: u.email, role: u.role });
    setEditingUser(u.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    try {
      await axios.delete(`${API}/users/${id}`);
      toast.success(`User "${name}" deleted`);
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const cancelEditUser = () => {
    setUserForm({ username: "", email: "", role: "NOC" });
    setEditingUser(null);
  };

  // ── Device CRUD ─────────────────────────────────────────────────────────────
  const handleDeviceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDevice) {
        await axios.put(`${API}/devices/${editingDevice}`, deviceForm);
        toast.success(`Device "${deviceForm.device_name}" updated successfully`);
      } else {
        await axios.post(`${API}/devices`, deviceForm);
        toast.success(`Device "${deviceForm.device_name}" added successfully`);
      }
      setDeviceForm({ device_name: "", hostname: "", ip_address: "", device_type: "Router", location: "" });
      setEditingDevice(null);
      fetchDevices();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Device operation failed";
      toast.error(msg);
    }
  };

  const handleEditDevice = (d) => {
    setDeviceForm({ device_name: d.device_name, hostname: d.hostname, ip_address: d.ip_address, device_type: d.device_type, location: d.location });
    setEditingDevice(d.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteDevice = async (id, name) => {
    if (!window.confirm(`Delete device "${name}"?`)) return;
    try {
      await axios.delete(`${API}/devices/${id}`);
      toast.success(`Device "${name}" deleted`);
      fetchDevices();
    } catch {
      toast.error("Failed to delete device");
    }
  };

  const cancelEditDevice = () => {
    setDeviceForm({ device_name: "", hostname: "", ip_address: "", device_type: "Router", location: "" });
    setEditingDevice(null);
  };

  // ── Filters ─────────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );
  const filteredDevices = devices.filter(d =>
    d.device_name?.toLowerCase().includes(searchDevice.toLowerCase()) ||
    d.ip_address?.toLowerCase().includes(searchDevice.toLowerCase())
  );

  // ── Styles ───────────────────────────────────────────────────────────────────
  const card = {
    background: "#fff", borderRadius: 14, padding: 24,
    boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid #f1f5f9"
  };

  const btnPrimary = (color) => ({
    background: color, color: "#fff", border: "none", borderRadius: 8,
    padding: "10px 0", width: "100%", 
    cursor: "pointer", transition: "opacity 0.15s"
  });

  const btnSecondary = {
    background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0",
    borderRadius: 8, padding: "10px 0", width: "100%",
    cursor: "pointer"
  };

  const iconBtn = (color) => ({
    background: color + "12", color, border: `1px solid ${color}30`,
    borderRadius: 6, padding: "6px 8px", cursor: "pointer",
    transition: "background 0.15s"
  });

  const thStyle = {
    padding: "10px 12px", textAlign: "left", color: "#94a3b8",
    borderBottom: "2px solid #f1f5f9",
    whiteSpace: "nowrap"
  };

  const tdStyle = {
    padding: "11px 12px", color: "#334155",
    borderBottom: "1px solid #f8fafc", verticalAlign: "middle"
  };

  return (
    <>
      <style>{`
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
        input:focus, select:focus { border-color: #3b82f6 !important; background: #fff !important; box-shadow: 0 0 0 3px #3b82f620; }
        tr:hover td { background: #f8fafc; }
        button:hover { opacity: 0.85; }
      `}</style>

      <Toast toasts={toast.toasts} remove={toast.remove} />

      <div className="p-6 main-content min-h-screen bg-[#f8fafc] font-sans">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="text-page-title text-slate-800" style={{ margin: 0 }}>Administration</h1>
          <p className="text-small text-slate-500" style={{ marginTop: 4 }}>Manage system users and network devices</p>
        </div>

        {/* ── FORMS ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

          {/* User Form */}
          <div style={{ ...card, borderTop: `3px solid #3b82f6` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ background: "#eff6ff", borderRadius: 8, padding: "8px 10px", color: "#3b82f6" }}><FaUserPlus size={16} /></div>
              <div>
                <h2 className="text-section-title text-slate-900" style={{ margin: 0 }}>
                  {editingUser ? "Edit User" : "Create User"}
                </h2>
                {editingUser && <p className="text-badge font-bold text-amber-500 uppercase" style={{ margin: 0 }}>● Editing mode</p>}
              </div>
            </div>

            <form onSubmit={handleUserSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Username">
                <input className="text-body" style={inputStyle} placeholder="e.g. john_doe" value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })} required autoComplete="off" />
              </Field>
              <Field label="Email">
                <input className="text-body" style={inputStyle} type="email" placeholder="e.g. john@company.com" value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })} required autoComplete="off" />
              </Field>
              <Field label="Role">
                <select className="text-body" style={selectStyle} value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="NOC">NOC</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                </select>
              </Field>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="submit" className="text-badge font-bold uppercase transition-all" style={btnPrimary("#3b82f6")}>
                  {editingUser ? "Update User" : "Create User"}
                </button>
                {editingUser && (
                  <button type="button" className="text-badge font-bold uppercase transition-all" onClick={cancelEditUser} style={{ ...btnSecondary, width: "auto", padding: "10px 16px" }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Device Form */}
          <div style={{ ...card, borderTop: `3px solid #10b981` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ background: "#ecfdf5", borderRadius: 8, padding: "8px 10px", color: "#10b981" }}><FaServer size={16} /></div>
              <div>
                <h2 className="text-section-title text-slate-900" style={{ margin: 0 }}>
                  {editingDevice ? "Edit Device" : "Add Device"}
                </h2>
                {editingDevice && <p className="text-badge font-bold text-amber-500 uppercase" style={{ margin: 0 }}>● Editing mode</p>}
              </div>
            </div>

            <form onSubmit={handleDeviceSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Device Name">
                  <input style={inputStyle} placeholder="e.g. Cisco-Edge" value={deviceForm.device_name}
                    onChange={e => setDeviceForm({ ...deviceForm, device_name: e.target.value })} required autoComplete="off" />
                </Field>
                <Field label="Hostname">
                  <input style={inputStyle} placeholder="e.g. core-router-1" value={deviceForm.hostname}
                    onChange={e => setDeviceForm({ ...deviceForm, hostname: e.target.value })} required autoComplete="off" />
                </Field>
                <Field label="IP Address">
                  <input style={inputStyle} placeholder="e.g. 192.168.1.1" value={deviceForm.ip_address}
                    onChange={e => setDeviceForm({ ...deviceForm, ip_address: e.target.value })} required autoComplete="off" />
                </Field>
                <Field label="Device Type">
                  <select style={selectStyle} value={deviceForm.device_type} onChange={e => setDeviceForm({ ...deviceForm, device_type: e.target.value })}>
                    <option>Router</option><option>Switch</option><option>Firewall</option><option>Server</option>
                  </select>
                </Field>
              </div>
                <Field label="Location">
                  <input className="text-body" style={inputStyle} placeholder="e.g. DC1 - Rack A3" value={deviceForm.location}
                    onChange={e => setDeviceForm({ ...deviceForm, location: e.target.value })} required autoComplete="off" />
                </Field>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                 <button type="submit" className="text-badge font-bold uppercase transition-all" style={btnPrimary("#10b981")}>
                  {editingDevice ? "Update Device" : "Add Device"}
                </button>
                {editingDevice && (
                  <button type="button" onClick={cancelEditDevice} style={{ ...btnSecondary, width: "auto", padding: "10px 16px" }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ── TABLES ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Users Table */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
               <div>
                <h2 className="text-section-title text-slate-900" style={{ margin: 0 }}>Users</h2>
                <p className="text-small text-slate-400" style={{ margin: 0 }}>{users.length} total</p>
              </div>
              <div style={{ position: "relative" }}>
                <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 12 }} />
                 <input className="text-small" placeholder="Search..." value={searchUser} onChange={e => setSearchUser(e.target.value)}
                  style={{ ...inputStyle, width: 180, paddingLeft: 30 }} />
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                   <tr style={{ background: "#f8fafc" }}>
                    <th className="text-table-header table-cell-padded" style={{textAlign:"left", borderBottom: "2px solid #f1f5f9"}}>Username</th>
                    <th className="text-table-header table-cell-padded" style={{textAlign:"left", borderBottom: "2px solid #f1f5f9"}}>Email</th>
                    <th className="text-table-header table-cell-padded" style={{textAlign:"left", borderBottom: "2px solid #f1f5f9"}}>Role</th>
                    <th className="text-table-header table-cell-padded" style={{textAlign:"center", borderBottom: "2px solid #f1f5f9"}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading.users ? (
                    <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 32 }}>Loading...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 32 }}>
                      {searchUser ? "No users match your search" : "No users found"}
                    </td></tr>
                  ) : filteredUsers.map(u => (
                     <tr key={u.id}>
                      <td className="text-body font-bold text-slate-900 table-cell-padded" style={{borderBottom: "1px solid #f8fafc"}}>{u.username}</td>
                      <td className="text-body text-slate-500 table-cell-padded" style={{borderBottom: "1px solid #f8fafc"}}>{u.email}</td>
                      <td className="table-cell-padded" style={{borderBottom: "1px solid #f8fafc"}}><Badge label={u.role} colorMap={roleBadge} /></td>
                      <td className="text-body table-cell-padded" style={{ textAlign: "center", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => handleEditUser(u)} style={iconBtn("#3b82f6")} title="Edit"><FaEdit /></button>
                          <button onClick={() => deleteUser(u.id, u.username)} style={iconBtn("#ef4444")} title="Delete"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Devices Table */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
               <div>
                <h2 className="text-section-title text-slate-900" style={{ margin: 0 }}>Devices</h2>
                <p className="text-small text-slate-400" style={{ margin: 0 }}>{devices.length} total</p>
              </div>
              <div style={{ position: "relative" }}>
                <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 12 }} />
                 <input className="text-small" placeholder="Search..." value={searchDevice} onChange={e => setSearchDevice(e.target.value)}
                  style={{ ...inputStyle, width: 180, paddingLeft: 30 }} />
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                   <tr style={{ background: "#f8fafc" }}>
                    <th className="text-table-header table-cell-padded" style={{textAlign:"left", borderBottom: "2px solid #f1f5f9"}}>Device</th>
                    <th className="text-table-header table-cell-padded" style={{textAlign:"left", borderBottom: "2px solid #f1f5f9"}}>IP</th>
                    <th className="text-table-header table-cell-padded" style={{textAlign:"left", borderBottom: "2px solid #f1f5f9"}}>Type</th>
                    <th className="text-table-header table-cell-padded" style={{textAlign:"left", borderBottom: "2px solid #f1f5f9"}}>Location</th>
                    <th className="text-table-header table-cell-padded" style={{textAlign:"center", borderBottom: "2px solid #f1f5f9"}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading.devices ? (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 32 }}>Loading...</td></tr>
                  ) : filteredDevices.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 32 }}>
                      {searchDevice ? "No devices match your search" : "No devices found"}
                    </td></tr>
                  ) : filteredDevices.map(d => (
                     <tr key={d.id}>
                      <td className="table-cell-padded" style={{borderBottom: "1px solid #f8fafc"}}>
                        <div className="text-body font-bold text-slate-900">{d.device_name}</div>
                        <div className="text-badge text-slate-400 font-bold uppercase">{d.hostname}</div>
                      </td>
                       <td className="text-small font-mono text-blue-700 table-cell-padded" style={{borderBottom: "1px solid #f8fafc"}}>{d.ip_address}</td>
                      <td className="table-cell-padded" style={{borderBottom: "1px solid #f8fafc"}}><Badge label={d.device_type} colorMap={typeBadge} /></td>
                      <td className="text-badge font-bold text-slate-500 uppercase table-cell-padded" style={{borderBottom: "1px solid #f8fafc"}}>{d.location}</td>
                      <td className="text-body table-cell-padded" style={{ textAlign: "center", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => handleEditDevice(d)} style={iconBtn("#3b82f6")} title="Edit"><FaEdit /></button>
                          <button onClick={() => deleteDevice(d.id, d.device_name)} style={iconBtn("#ef4444")} title="Delete"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ── Audit Logs ────────────────────────────────────────────────
export function AuditLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { 
      const res = await axios.get(`${API}/audit`, { params: { limit: 200 } });
      setLogs(Array.isArray(res.data) ? res.data : []); 
    }
    catch(e){ console.error(e); }
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  return (
    <div className="p-6 main-content min-h-full">
      <div className="flex items-center justify-between mb-6">
         <div>
          <h1 className="text-page-title text-slate-800 uppercase font-bold">Audit Logs</h1>
          <p className="text-small text-gray-500 mt-1 font-medium">Track all system activity and user actions</p>
        </div>
         <button onClick={load} className="flex items-center gap-2 text-badge font-bold uppercase text-gray-500 hover:text-blue-600 border border-gray-200 bg-white px-3 py-1.5 rounded-lg">
          <RefreshCw size={14} className={loading?"animate-spin":""}/> Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
         <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-section-title text-gray-600 uppercase">Activity History</h2>
          <span className="text-badge font-bold text-gray-400 uppercase">{logs.length} records</span>
        </div>
        <table className="w-full text-left">
           <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Time","User","Action","Entity","ID"].map(h=>(
                <th key={h} className="table-cell-padded text-table-header text-blue-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">Loading…</td></tr>}
            {!loading && logs.length===0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">No audit logs found</td></tr>}
            {logs.map(log=>(
               <tr key={log.log_id} className="hover:bg-blue-50 transition-colors duration-100">
                <td className="table-cell-padded text-small text-gray-500 font-mono whitespace-nowrap">{fmt(log.created_at)}</td>
                <td className="table-cell-padded">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                    {log.user_name}
                  </span>
                </td>
                <td className="table-cell-padded text-body text-gray-800 font-bold">{log.action}</td>
                 <td className="table-cell-padded">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                    {log.entity_type}
                  </span>
                </td>
                <td className="table-cell-padded text-small text-gray-500 font-mono">#{log.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}