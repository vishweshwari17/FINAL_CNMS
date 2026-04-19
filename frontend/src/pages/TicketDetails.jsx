// src/pages/TicketDetail.jsx  ─ CNMS
// CNMS = RIGHT side (blue bubbles) | LNMS = LEFT side (white bubbles)
//
// ID FLOW (CNMS side):
//   useParams() gives  id  = CNMS DB primary key  (e.g. "42")
//   ticket.id          = CNMS DB primary key       (used for /ack, /resolve, /comment)
//   ticket.ticket_uid  = shared key with LNMS      (used for display / sync reference)
//
// ALL API calls use  id  from useParams() — never ticket.id which may be undefined
// until the fetch resolves.

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTicket, addComment, acknowledgeTicket, resolveTicket, closeTicket } from "../api/api";
import {
  ArrowLeft, Send, CheckCheck, AlertTriangle,
  CheckCircle2, RefreshCw, Wifi, WifiOff, X
} from "lucide-react";

/* ─── helpers ─── */
const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  }) : "—";

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  }) : "";

/* ─── normalise status to uppercase key ─── */
const normalizeStatus = (raw) => {
  const v = String(raw || "").trim().toUpperCase();
  if (["ACK", "ACKNOWLEDGED"].includes(v)) return "ACK";
  if (["RESOLVED", "RESOLVE"].includes(v))  return "RESOLVED";
  if (v === "CLOSED")                        return "CLOSED";
  return "OPEN";
};

/* ─── who "owns" this side ─── */
// On CNMS, messages from CNMS / Admin appear on the RIGHT (blue)
const isMine = (sender) =>
  ["CNMS", "ADMIN", "USER"].includes((sender ?? "").toUpperCase());

/* ─── colours ─── */
const SEV = { Critical: "#ef4444", Major: "#f97316", Minor: "#eab308", Warning: "#3b82f6" };
const STATUS = {
  OPEN:     { c: "#3b82f6", bg: "#eff6ff", label: "Open" },
  ACK:      { c: "#f97316", bg: "#fff7ed", label: "Acknowledged" },
  RESOLVED: { c: "#22c55e", bg: "#f0fdf4", label: "Resolved" },
  CLOSED:   { c: "#6b7280", bg: "#f9fafb", label: "Closed" },
};

/* ─── StatusPill ─── */
function StatusPill({ status }) {
  const m = STATUS[status] || STATUS.OPEN;
  return (
    <span style={{ color: m.c, background: m.bg, border: `1.5px solid ${m.c}30` }}
      className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-badge font-bold uppercase">
      <span style={{ background: m.c }} className="w-1.5 h-1.5 rounded-full" />
      {m.label}
    </span>
  );
}

/* ─── Progress Steps ─── */
const STEPS = ["OPEN", "ACK", "RESOLVED", "CLOSED"];
function ProgressSteps({ status }) {
  const idx = STEPS.indexOf(status);
  return (
    <div className="flex items-start w-full my-4">
      {STEPS.map((s, i) => {
        const done   = i <= idx;
        const active = i === idx;
        const m      = STATUS[s];
        return (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div style={{
                background:  active ? m.c : done ? "#22c55e" : "#e5e7eb",
                border:      active ? `2px solid ${m.c}` : "2px solid transparent",
                boxShadow:   active ? `0 0 0 4px ${m.c}22` : "none",
                transition:  "all 0.3s",
              }} className="w-7 h-7 rounded-full flex items-center justify-center">
                {done && !active && <CheckCheck size={12} color="white" />}
                {active          && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                {!done           && <span className="w-2 h-2 rounded-full bg-gray-300" />}
              </div>
              <span className="text-badge mt-1 font-bold uppercase"
                style={{ color: done ? "#374151" : "#9ca3af" }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ background: i < idx ? "#22c55e" : "#e5e7eb", transition: "background 0.5s" }}
                className="flex-1 h-0.5 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Chat Bubble ─── */
function Bubble({ msg }) {
  const sender   = msg.sender || "UNKNOWN";
  const isSystem = sender.toUpperCase() === "SYSTEM";
  const mine     = isMine(sender);

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="bg-gray-100 text-gray-500 text-badge px-3 py-1 rounded-full border border-gray-200 uppercase font-bold">
          {msg.message}
        </span>
      </div>
    );
  }

  // CNMS messages → RIGHT (blue).  LNMS messages → LEFT (sky blue avatar)
  const initials = sender.toUpperCase() === "LNMS" ? "LN" : sender.slice(0, 2).toUpperCase();
  const avatarBg = mine ? "#1d4ed8" : "#0ea5e9";

  return (
    <div className={`flex items-end gap-2 mb-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mb-0.5"
        style={{ background: avatarBg }}>
        <span className="text-white text-badge font-bold">{initials}</span>
      </div>
      <div className={`flex flex-col max-w-[68%] ${mine ? "items-end" : "items-start"}`}>
        <span className="text-badge font-bold uppercase text-gray-400 mb-0.5 px-1">{sender}</span>
        <div style={{
          background:   mine ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "#ffffff",
          color:        mine ? "#fff" : "#1f2937",
          borderRadius: mine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
          boxShadow:    mine ? "0 2px 10px #2563eb33" : "0 1px 4px #0000001a",
          border:       mine ? "none" : "1px solid #e5e7eb",
        }} className="px-3.5 py-2 text-body leading-relaxed break-words">
          {msg.message}
        </div>
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-small text-gray-400">{fmtTime(msg.created_at)}</span>
          {mine && <CheckCheck size={11} className="text-blue-300" />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ MAIN ═══════════════ */
export default function TicketDetail() {
  // ✅  id  = CNMS DB primary key — used for every API call
  const { id }   = useParams();
  const navigate = useNavigate();

  const [ticket,       setTicket]       = useState(null);
  const [deletedInfo,  setDeletedInfo]  = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [online,       setOnline]       = useState(true);
  const [resolveModal, setResolveModal] = useState(false);
  const [resolveNote,  setResolveNote]  = useState("");

  const chatRef  = useRef(null);
  const inputRef = useRef(null);

  /* ── guard: if id is missing show error immediately ── */
  useEffect(() => {
    if (!id) {
      setLoading(false);
      setTicket(null);
    }
  }, [id]);

  /* ── fetch ticket + messages ── */
  const fetchTicket = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      // GET /tickets/:id  →  returns ticket + messages[] (CNMS backend)
      const res = await getTicket(id);
      const t   = res.data;
      setTicket(t);
      setDeletedInfo(null);
      // Backend now always returns messages array (fixed in CNMS tickets.py)
      setMessages(Array.isArray(t.messages) ? t.messages : []);
      setOnline(true);
    } catch (err) {
      if (err.response && err.response.status === 410) {
        setDeletedInfo(err.response.data.detail);
        setTicket(null);
      }
      setOnline(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  /* ── auto-scroll chat to bottom ── */
  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  /* ── poll every 5 s for LNMS messages arriving ── */
  useEffect(() => {
    const t = setInterval(() => fetchTicket(true), 5000);
    return () => clearInterval(t);
  }, [fetchTicket]);

  /* ── send message (CNMS → saved locally + forwarded to LNMS) ── */
  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || sending || !id) return;
    setSending(true);

    // Optimistic bubble
    const opt = {
      id: `opt-${Date.now()}`, sender: "CNMS",
      message: msg, created_at: new Date().toISOString(),
    };
    setMessages(p => [...p, opt]);
    setInput("");

    try {
      // ✅ Use id from useParams — POST /tickets/:id/comment
      await addComment(id, { message: msg, sender: "CNMS" });
      await fetchTicket(true);   // replace optimistic with real data
    } catch {
      setMessages(p => p.filter(m => m.id !== opt.id));
      setInput(msg);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  /* ── ACK (CNMS operator acknowledges) ── */
  const handleAck = async () => {
    setSyncing(true);
    try {
      // ✅ PUT /tickets/:id/ack  — id from useParams
      await acknowledgeTicket(id);
      await fetchTicket(true);
    } finally {
      setSyncing(false);
    }
  };

  /* ── Resolve (CNMS operator resolves) ── */
  const handleResolve = async () => {
    setSyncing(true);
    try {
      await resolveTicket(id, { resolution_note: resolveNote || "Resolved via CNMS" });
      setResolveModal(false);
      await fetchTicket(true);
    } finally {
      setSyncing(false);
    }
  };

  /* ── Close (CNMS operator closes) ── */
  const handleClose = async () => {
    setSyncing(true);
    try {
      await closeTicket(id);
      await fetchTicket(true);
    } finally {
      setSyncing(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── loading / error ── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-badge text-gray-400 font-bold uppercase">Loading ticket…</span>
      </div>
    </div>
  );

  if (deletedInfo) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <X size={32} className="text-red-500" />
        </div>
        <h2 className="text-page-title text-slate-800 mb-2">Ticket Removed</h2>
        <p className="text-body text-gray-500 mb-6 px-4">
          {deletedInfo.message}
        </p>
        <div className="bg-gray-50 p-4 rounded-xl text-small text-gray-400 font-mono mb-8 text-left border border-gray-100">
          <div className="mb-1"><span className="text-gray-300 mr-2 uppercase font-bold">Purged:</span> {fmt(deletedInfo.deleted_at)}</div>
          <div className="flex gap-2">
            <span className="text-gray-300 shrink-0">REASON:</span>
            <span className="text-gray-500 uppercase leading-tight">{deletedInfo.reason}</span>
          </div>
        </div>
        <button onClick={() => navigate("/tickets")}
          className="w-full py-3 bg-gray-800 text-white rounded-xl text-badge font-bold uppercase transition-all shadow-lg shadow-gray-200">
          Return to Ticket List
        </button>
      </div>
    </div>
  );

  if (!ticket) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <AlertTriangle size={40} className="text-orange-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Ticket not found</p>
        <button onClick={() => navigate("/tickets")}
          className="mt-4 text-blue-600 text-sm hover:underline">← Back</button>
      </div>
    </div>
  );

  const status     = normalizeStatus(ticket.status);
  const isResolved = ["RESOLVED", "CLOSED"].includes(status);

  return (
    <div className="p-6 main-content min-h-screen">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate("/tickets")}
          className="flex items-center gap-2 text-badge font-bold uppercase text-gray-500 hover:text-blue-700 transition-colors">
          <ArrowLeft size={15} /> Back to Tickets
        </button>
        <div className="flex items-center gap-2">
          {online
            ? <span className="flex items-center gap-1.5 text-badge font-bold uppercase text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <Wifi size={11} /> Live
              </span>
            : <span className="flex items-center gap-1.5 text-badge font-bold uppercase text-red-500 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                <WifiOff size={11} /> Offline
              </span>
          }
          <button onClick={() => fetchTicket()}
            className="flex items-center gap-1.5 text-badge font-bold uppercase text-gray-500 hover:text-blue-600 border border-gray-200 bg-white px-3 py-1.5 rounded-lg">
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> Sync
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 max-w-6xl mx-auto">

        {/* ── LEFT: ticket info ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* ticket card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="text-badge font-bold uppercase text-gray-400 mb-2">Ticket Metadata</div>
            {/* ✅ Show human-readable short_id; fall back through available fields */}
            <div className="text-page-title text-blue-700 font-mono mb-3">
              {ticket.ticket_uid || ticket.short_id || ticket.id}
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              <span className="flex items-center text-badge font-bold px-2.5 py-1 rounded-full uppercase"
                style={{ color: SEV[ticket.severity] || "#6b7280", background: `${SEV[ticket.severity] || "#6b7280"}1a` }}>
                <span style={{ background: SEV[ticket.severity] || "#6b7280" }}
                  className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" />
                {ticket.severity || "—"}
              </span>
              <StatusPill status={status} />
            </div>

            <ProgressSteps status={status} />

            {/* action buttons */}
            {!isResolved && (
              <div className="flex flex-col gap-2 mt-2">
                {status === "OPEN" && (
                  <button onClick={handleAck} disabled={syncing}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                    style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", boxShadow: "0 4px 14px #f9731640" }}>
                    {syncing ? "Acknowledging…" : "✓ Acknowledge Ticket"}
                  </button>
                )}
                {status === "ACK" && (
                  <button onClick={() => setResolveModal(true)} disabled={syncing}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                    style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", boxShadow: "0 4px 14px #16a34a40" }}>
                    {syncing ? "Resolving…" : "✓ Resolve Ticket"}
                  </button>
                )}
                {status === "RESOLVED" && (
                  <button onClick={handleClose} disabled={syncing}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                    style={{ background: "linear-gradient(135deg,#6b7280,#4b5563)", boxShadow: "0 4px 14px #6b728040" }}>
                    {syncing ? "Closing…" : "✓ Close Ticket"}
                  </button>
                )}
              </div>
            )}
            {isResolved && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mt-2">
                <CheckCircle2 size={15} className="text-green-500" />
                <span className="text-green-700 text-body font-bold uppercase">
                  Ticket {status === "CLOSED" ? "Closed" : "Resolved"}
                </span>
              </div>
            )}
          </div>

          {/* details panel */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="text-badge font-bold uppercase text-gray-400 mb-3">Technical Details</div>
            <div className="space-y-3">
              {[
                { l: "Alarm ID",  v: ticket.alarm_uid || ticket.alarm_id },
                { l: "LNMS Ticket", v: ticket.ticket_uid || ticket.short_id || ticket.id },
                { l: "LNMS Node", v: ticket.lnms_node_id },
                { l: "Device",    v: ticket.device_name },
                { l: "Title",     v: ticket.title },
                { l: "Created",   v: fmt(ticket.created_at) },
                ...(ticket.alarm_status ? [{ l: "Alarm Status", v: ticket.alarm_status }] : []),
                ...(ticket.resolved_at ? [{ l: "Resolved At", v: fmt(ticket.resolved_at) }] : []),
                ...(ticket.resolved_by ? [{ l: "Resolved By", v: ticket.resolved_by }] : []),
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between items-start gap-4">
                  <span className="text-badge font-bold uppercase text-gray-400 shrink-0 w-24">{l}</span>
                  <span className="text-small font-mono text-gray-800 text-right break-all">{v || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {ticket.resolution_note && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="text-badge font-bold text-green-700 uppercase mb-1">
                Resolution Note
              </div>
              <p className="text-body text-green-900">{ticket.resolution_note}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: chat ── */}
        <div className="lg:col-span-3 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          style={{ height: "calc(100vh - 130px)", minHeight: 520 }}>

          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-white">
            <div>
              <div className="text-section-title text-slate-800">Ticket Conversation</div>
              <div className="flex items-center gap-1.5 text-small text-gray-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {/* CNMS receives messages from LNMS; syncs every 5 s */}
                Synced with LNMS · {online ? "Active Channel" : "Link Lost"}
              </div>
            </div>
            <span className="text-badge font-bold text-gray-400 bg-gray-100 rounded-full px-2.5 py-1 uppercase">
              {messages.length} Signals
            </span>
          </div>

          {/* messages list */}
          <div ref={chatRef}
            className="flex-1 overflow-y-auto px-4 py-4"
            style={{ background: "linear-gradient(180deg,#f0f6ff 0%,#fff 100%)" }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Send size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 text-center">No messages yet.<br />Start the conversation.</p>
              </div>
            ) : (
              messages.map((m, i) => <Bubble key={m.id || i} msg={m} />)
            )}
          </div>

          {/* input */}
          <div className="px-4 py-3 border-t border-gray-100 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                disabled={isResolved}
                placeholder={isResolved ? "Ticket is resolved" : "Type a message… (Enter to send)"}
                style={{ resize: "none", maxHeight: 100 }}
                className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button onClick={sendMessage}
                disabled={!input.trim() || sending || isResolved}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", boxShadow: "0 4px 12px #2563eb44" }}>
                <Send size={14} color="white" />
              </button>
            </div>
            <p className="text-badge font-bold text-gray-400 mt-1.5 ml-1 uppercase">
              CNMS metadata synchronized with LNMS endpoint
            </p>
          </div>
        </div>
      </div>

      {/* RESOLVE MODAL */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Resolve Ticket</h2>
              <button onClick={() => setResolveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              This will update status to <strong>RESOLVED</strong> and sync to LNMS immediately.
            </p>
            <textarea rows={3} value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
              placeholder="Describe how the issue was resolved…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setResolveModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleResolve} disabled={syncing}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
                {syncing ? "Resolving…" : "Confirm Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-badge text-gray-300 mt-5 font-bold uppercase">
        CNMS Row ID: {ticket.id} · Shared Ticket ID: {ticket.ticket_uid || ticket.short_id || ticket.id}
      </div>
    </div>
  );
}
