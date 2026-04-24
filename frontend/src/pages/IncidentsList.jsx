import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ChevronDown, ChevronUp, AlertCircle, Clock, 
  ExternalLink, Filter, Search, MoreVertical,
  Activity, Layers
} from 'lucide-react';
import { getIncidents, getIncidentAlarms } from '../api/api';
import { format } from 'date-fns';

const IncidentsList = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [childAlarms, setChildAlarms] = useState({});
  const [filter, setFilter] = useState({ severity: '', status: 'OPEN' });

  useEffect(() => {
    fetchIncidents();
  }, [filter]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
<<<<<<< HEAD
      const res = await getIncidents(filter);
      setIncidents(res.data.items || []);
=======
      const data = await getIncidents(filter);
      setIncidents(data.items || []);
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(id);
    if (!childAlarms[id]) {
        try {
<<<<<<< HEAD
            const res = await getIncidentAlarms(id);
            setChildAlarms(prev => ({ ...prev, [id]: res.data }));
=======
            const alarms = await getIncidentAlarms(id);
            setChildAlarms(prev => ({ ...prev, [id]: alarms }));
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c
        } catch (err) {
            console.error("Error fetching child alarms:", err);
        }
    }
  };

  return (
    <div className="p-6 main-content min-h-screen">
      <div className="max-w-7xl mx-auto mt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-page-title text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100/50 rounded-xl text-blue-600">
                <AlertCircle size={28} />
              </div>
              Correlated Incidents
            </h2>
            <p className="text-small text-slate-500 mt-2 font-medium">Monitoring grouped network anomalies and root cause analysis</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 px-3 border-r border-slate-100">
              <Filter size={16} className="text-slate-400" />
              <span className="text-badge font-bold text-slate-400 uppercase">Severity</span>
            </div>
            <select 
              className="bg-transparent text-small font-semibold text-slate-700 py-1.5 focus:outline-none cursor-pointer"
              value={filter.severity}
              onChange={(e) => setFilter({...filter, severity: e.target.value})}
            >
              <option value="">All Levels</option>
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="table-cell-padded w-14"></th>
                  {["Incident UID", "Affected Device", "Main Anomaly", "Severity", "Impact"].map(h => (
                    <th key={h} className={`table-cell-padded text-table-header text-slate-500 font-bold ${h === 'Impact' ? 'text-center' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                          <Search size={24} />
                        </div>
                        <p className="text-body text-slate-500 font-medium">No active incidents found</p>
                      </div>
                    </td>
                  </tr>
                ) : incidents.map((incident) => (
                  <React.Fragment key={incident.id}>
                    <tr 
                      className={`group hover:bg-blue-50/30 transition-all duration-200 cursor-pointer ${expandedId === incident.id ? 'bg-blue-50/50' : ''}`}
                      onClick={() => toggleExpand(incident.id)}
                    >
                      <td className="table-cell-padded text-center">
                        <div className={`p-1.5 rounded-lg transition-colors ${expandedId === incident.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                          {expandedId === incident.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </td>
                      <td className="table-cell-padded">
                        <Link 
                          to={`/war-room/${incident.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-small px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-200 hover:bg-blue-600 hover:text-white transition-all cursor-pointer inline-block font-mono"
                        >
                          {incident.incident_uid}
                        </Link>
                      </td>
                      <td className="table-cell-padded">
                         <Link 
                          to={`/devices?search=${incident.device_name}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-body font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {incident.device_name}
                        </Link>
                      </td>
                      <td className="table-cell-padded">
                         <p className="text-body text-slate-600 font-medium max-w-sm truncate">{incident.title}</p>
                      </td>
                      <td className="table-cell-padded">
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td className="table-cell-padded text-center">
                         <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-badge font-bold text-slate-700 border border-slate-200">
                          <Activity size={12} className="text-blue-500" />
                          {incident.child_alarms_count}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Detail View */}
                    {expandedId === incident.id && (
                      <tr>
                        <td colSpan="6" className="p-0 bg-gray-50/50">
                          <div className="p-6 border-l-4 border-blue-600 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                 <h4 className="text-section-title text-slate-500 flex items-center gap-3">
                                   <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                                     <Layers size={16} />
                                   </div>
                                   Propagation Timeline & Root Cause Analysis
                                 </h4>
                                 <Link 
                                   to={`/war-room/${incident.id}`}
                                   className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-badge font-bold uppercase rounded-xl shadow-lg shadow-blue-500/30 hover:scale-105 transition-all"
                                 >
                                   Enter War Room <ExternalLink size={12} />
                                 </Link>
                              </div>
                               <div className="flex items-center gap-4 text-small font-bold text-slate-400">
                                 <span className="flex items-center gap-1.5"><Clock size={14} /> Tracking Since: {format(new Date(incident.created_at || Date.now()), 'HH:mm:ss')}</span>
                               </div>
                            </div>

                            <div className="grid gap-3">
                              {childAlarms[incident.id] ? childAlarms[incident.id].map(alarm => (
                                <div key={alarm.id} className="group/alarm flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200">
                                  <div className="flex items-center gap-5">
                                    <div className={`p-2 rounded-xl ${alarm.is_root_cause ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                      <Activity size={18} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-body font-bold text-slate-900">{alarm.alarm_name}</span>
                                        {alarm.is_root_cause && (
                                           <span className="bg-amber-100 text-amber-700 text-badge font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase">
                                             Root Cause
                                           </span>
                                        )}
                                      </div>
                                       <p className="text-small text-slate-400 mt-0.5 flex items-center gap-1">
                                         <Clock size={12} /> {format(new Date(alarm.raised_at), 'MMM dd, HH:mm:ss')}
                                       </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                     <span className="text-badge font-bold text-slate-400 uppercase bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 group-hover/alarm:border-blue-100 group-hover/alarm:text-blue-500 transition-colors">
                                       {alarm.component || 'General'}
                                     </span>
                                  </div>
                                </div>
                              )) : (
                                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                                  <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mb-3"></div>
                                  <p className="text-sm font-medium text-slate-400">Analyzing correlations...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const SeverityBadge = ({ severity }) => {
  const styles = {
    Critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    Major: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    Minor: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Info: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  };
  return (
     <span className={`px-2.5 py-1 rounded-md text-badge font-bold border ${styles[severity] || styles.Info}`}>
      {severity.toUpperCase()}
    </span>
  );
};

export default IncidentsList;
