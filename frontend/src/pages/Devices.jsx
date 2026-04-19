import React, { useEffect, useState } from "react";
import { getDevices, getLnmsNodes } from "../api/api";
import { NodeBadge } from "../components/Badges";
import { 
  RefreshCw, Search, Filter, Laptop, 
  ChevronLeft, ChevronRight, Download, MoreVertical
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function Devices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [lnmsF, setLnmsF] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  const load = async () => {
    setLoading(true);
    try {
      const [d, n] = await Promise.all([getDevices(), getLnmsNodes()]);
      const deviceData = d.data.data || d.data;
      setDevices(Array.isArray(deviceData) ? deviceData : []);
      setNodes(n.data || []);
    } catch(e) { 
      console.error("Failed to load devices/nodes:", e);
      setDevices([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = devices.filter(d =>
    (d.hostname?.toLowerCase().includes(search.toLowerCase()) || d.ip_address?.includes(search)) &&
    (typeF ? d.device_type === typeF : true) &&
    (statusF ? d.status === statusF : true) &&
    (lnmsF !== "ALL" ? d.lnms_node_id === lnmsF : true)
  );

  const pages = Math.ceil(filtered.length / perPage);
  const visible = filtered.slice((page-1)*perPage, page*perPage);

  return (
    <div className="p-8 font-sans text-slate-800 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-page-title text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-2xl text-indigo-600 shadow-sm">
                <Laptop size={32} />
              </div>
              Inventory Control
            </h1>
            <p className="text-small mt-2">Managing {devices.length} synchronized network assets</p>
          </div>
          
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={load}
              className="flex items-center gap-2 px-4 py-2 text-small font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase border-r border-slate-100"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-small font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 mb-8 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              placeholder="Search hostname or IP address..." 
              value={search} 
              onChange={e => {setSearch(e.target.value); setPage(1);}}
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-body font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all opacity-80 hover:opacity-100 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
             <FilterSelect 
              value={typeF} 
              onChange={v => {setTypeF(v); setPage(1);}}
              options={["Router","Switch","Firewall","Server","AP","Other"]}
              placeholder="All Types"
             />
             <div className="w-px h-8 bg-slate-200 mx-1" />
             <FilterSelect 
              value={statusF} 
              onChange={v => {setStatusF(v); setPage(1);}}
              options={["ACTIVE","INACTIVE"]}
              placeholder="All Status"
             />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <NodeFilterBtn active={lnmsF === "ALL"} label="All Nodes" onClick={() => {setLnmsF("ALL"); setPage(1);}} />
            {nodes.map(n => (
              <NodeFilterBtn 
                key={n.node_id} 
                active={lnmsF === n.node_id} 
                label={n.node_id} 
                onClick={() => {setLnmsF(n.node_id); setPage(1);}} 
              />
            ))}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-table-header text-slate-500">
                  {["Hostname", "IP Address", "Type", "LNMS Node", "Location", "Status", ""].map(h => (
                    <th key={h} className="table-cell-padded">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="animate-spin text-indigo-500" size={32} />
                        <span className="text-small font-bold text-slate-400 uppercase">Querying Inventory...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-300">
                        <Search size={48} />
                        <span className="text-small font-bold uppercase">No matching assets found</span>
                      </div>
                    </td>
                  </tr>
                )}
                {visible.map(d => (
                  <tr key={d.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                    <td className="table-cell-padded">
                      <div className="flex flex-col">
                        <Link 
                          to={`/inventory/${d.id}`}
                          className="text-body font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {d.hostname || 'Unknown'}
                        </Link>
                        <span className="text-small font-mono mt-0.5">ID: {d.id}</span>
                      </div>
                    </td>
                    <td className="table-cell-padded">
                       <span className="text-small font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{d.ip_address}</span>
                    </td>
                    <td className="table-cell-padded">
                      <span className="text-badge font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                        {d.device_type}
                      </span>
                    </td>
                    <td className="table-cell-padded">
                      <NodeBadge nodeId={d.lnms_node_id || "LOCAL"} />
                    </td>
                    <td className="table-cell-padded text-body text-slate-500">
                      {d.location || '—'}
                    </td>
                    <td className="table-cell-padded">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-badge font-bold uppercase border ${
                        d.status === "ACTIVE" 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-red-50 text-red-600 border-red-100"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${d.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {d.status}
                      </span>
                    </td>
                    <td className="table-cell-padded text-right">
                      <button 
                        onClick={() => navigate(`/inventory/${d.id}`)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-8 py-6 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
              <span className="text-small font-bold text-slate-400 uppercase">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-1">
                  {[...Array(pages)].map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setPage(i + 1)}
                      className={`w-9 h-9 rounded-xl text-small font-bold transition-all ${
                        page === i + 1 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                          : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-400'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={page === pages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FilterSelect = ({ value, onChange, options, placeholder }) => (
  <select 
    value={value} 
    onChange={e => onChange(e.target.value)}
    className="bg-transparent text-small font-bold text-slate-600 px-4 py-2 outline-none cursor-pointer appearance-none"
  >
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const NodeFilterBtn = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-badge font-bold uppercase whitespace-nowrap transition-all border ${
      active 
        ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" 
        : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
    }`}
  >
    {label}
  </button>
);