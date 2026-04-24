import { useEffect, useState } from "react";
import { getTcpLogs } from "../api/api";
import { RefreshCw, Terminal } from "lucide-react";

export default function SyncDiagnostics() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTcpLogs();
      setLogs(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 main-content min-h-full">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-slate-800 flex items-center gap-2">
            <Terminal size={24} className="text-blue-600" />
            Sync Diagnostics
          </h1>
          <p className="text-small text-gray-500 mt-1">
            Real-time LNMS ↔ CNMS Sync Events
          </p>
        </div>

        <button
          onClick={load}
<<<<<<< HEAD
          className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg shadow-md transition-all active:scale-95"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
=======
          className="flex items-center gap-2 text-small text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c
          Refresh
        </button>
      </div>

      {/* CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">

        {/* TOP BAR */}
        <div className="px-5 py-3 bg-gray-100 flex items-center justify-between">
          <span className="text-section-title text-gray-700">
            Live Sync Stream
          </span>

          <span className="flex items-center gap-2 text-badge text-green-600 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Active
          </span>
        </div>

        {/* TABLE */}
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm text-left">

            {/* TABLE HEADER */}
            <thead className="bg-gray-50 sticky top-0 border-b">
              <tr className="text-gray-600">
                <th className="table-cell-padded text-table-header">Timestamp</th>
                <th className="table-cell-padded text-table-header">Node</th>
                <th className="table-cell-padded text-table-header">Direction</th>
                <th className="table-cell-padded text-table-header">Type</th>
                <th className="table-cell-padded text-table-header">Status</th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody className="divide-y">

              {logs.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-blue-50 transition"
                >
                  {/* TIME */}
                  <td className="table-cell-padded text-small text-gray-500">
                    {new Date(l.created_at).toLocaleString()}
                  </td>

                  {/* NODE */}
                  <td className="table-cell-padded font-bold text-badge text-blue-600">
                    {l.lnms_node_id}
                  </td>

                  {/* DIRECTION */}
                  <td className="table-cell-padded">
                    <span
                      className={`px-2 py-1 rounded-full text-badge font-medium ${l.direction === "INBOUND"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-purple-100 text-purple-600"
                        }`}
                    >
                      {l.direction}
                    </span>
                  </td>

                  {/* TYPE */}
                  <td className="table-cell-padded text-body text-gray-600">
                    {l.msg_type}
                  </td>

                  {/* STATUS */}
                  <td className="table-cell-padded">
                    <span
                      className={`px-2 py-1 rounded-full text-badge font-bold ${l.status === "SUCCESS"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}

              {/* EMPTY STATE */}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-10 text-center text-gray-400 italic"
                  >
                    No sync events recorded yet...
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}