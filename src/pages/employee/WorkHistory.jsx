import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import {
  History,
  Calendar,
  Clock,
  Filter,
  Building2,
  CheckCircle2,
  Play,
  Square,
  Camera,
  FileText,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  AlertCircle,
  LogIn,
  LogOut,
} from 'lucide-react';

export const WorkHistory = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (selectedEventType) filters.event_type = selectedEventType;
      if (selectedCustomer) filters.customer = selectedCustomer;
      if (search) filters.search = search;

      const [logData, summaryData, customerList] = await Promise.all([
        adminApi.activity.list(filters),
        adminApi.activity.summary(),
        adminApi.customers.list(),
      ]);

      setLogs(logData);
      setSummary(summaryData);
      setCustomers(customerList);
    } catch (err) {
      setError(err.message || 'Unable to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedEventType, selectedCustomer, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedEventType('');
    setSelectedCustomer('');
    setSearch('');
  };

  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'SHIFT_STARTED':
        return {
          icon: Play,
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Shift Started',
        };
      case 'SHIFT_ENDED':
        return {
          icon: Square,
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Shift Ended',
        };
      case 'EVIDENCE_UPLOADED':
        return {
          icon: Camera,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Evidence Uploaded',
        };
      case 'REPORT_CREATED':
      case 'REPORT_SUBMITTED':
      case 'REPORT_EDITED':
        return {
          icon: FileText,
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          label: eventType.replace('_', ' '),
        };
      case 'FEEDBACK_RECEIVED':
      case 'FEEDBACK_REPLY':
        return {
          icon: MessageSquare,
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: eventType.replace('_', ' '),
        };
      case 'LOGIN':
        return {
          icon: LogIn,
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-500',
          label: 'System Login',
        };
      case 'LOGOUT':
        return {
          icon: LogOut,
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-400',
          label: 'System Logout',
        };
      default:
        return {
          icon: History,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: eventType || 'System Event',
        };
    }
  };

  return (
    <div className="space-y-7 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-[#245CE2]" />
            My Work History & Activity Audit Trail
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Complete, transparent chronological record of your shifts, evidence uploads, submitted reports, and system actions.
          </p>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#245CE2] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Transparent Work Tracking Policy:</span>
          <p className="text-blue-800 mt-0.5 leading-relaxed">
            WorkTrack logs only explicit operational actions (shift clocking, evidence submissions, reports, and replies). No keystroke logging, background screen recordings, or invasive surveillance is ever implemented.
          </p>
        </div>
      </div>

      {/* SUMMARY STATS BAR */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Shifts</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{summary.total_shifts}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Hours Worked</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{summary.total_working_hours} h</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Avg Duration</span>
            <span className="text-2xl font-black text-[#245CE2] mt-1 block">{summary.avg_shift_duration} h</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Reports Filed</span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">{summary.reports_submitted}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Evidence Photos</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{summary.evidence_uploaded}</span>
          </div>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-500" /> Filter Work Activities
          </span>
          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Activity Type</label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
            >
              <option value="">All Activity Types</option>
              <option value="SHIFT_STARTED">Shift Started</option>
              <option value="SHIFT_ENDED">Shift Ended</option>
              <option value="EVIDENCE_UPLOADED">Evidence Uploaded</option>
              <option value="REPORT_CREATED">Report Created</option>
              <option value="REPORT_SUBMITTED">Report Submitted</option>
              <option value="REPORT_EDITED">Report Edited</option>
              <option value="FEEDBACK_RECEIVED">Feedback Received</option>
              <option value="FEEDBACK_REPLY">Feedback Reply</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Customer Client</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CHRONOLOGICAL TIMELINE */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-700" />
          Activity Timeline ({logs.length} events)
        </h2>

        {error && (
          <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
            Loading activity history...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
            No activity events found for the selected criteria.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 pl-4 sm:pl-6 space-y-6">
            {logs.map((log) => {
              const meta = getEventBadge(log.event_type);
              const EventIcon = meta.icon;
              const dateObj = new Date(log.created_at);

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className={`absolute -left-[25px] sm:-left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-white ${meta.dot} shadow`} />

                  <article className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm hover:shadow transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${meta.color}`}>
                          <EventIcon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                        {log.customer_name && (
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" /> {log.customer_name}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 font-mono">
                        {dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <p className="text-sm font-medium text-slate-800 leading-relaxed">
                      {log.description}
                    </p>

                    {(log.shift_name || log.shift_date) && (
                      <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Shift: <strong>{log.shift_name || 'Assigned Shift'}</strong> ({log.shift_date})</span>
                      </div>
                    )}
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
