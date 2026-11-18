import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import {
  History,
  Clock,
  Building2,
  User,
  ShieldCheck,
  Play,
  Square,
  Camera,
  FileText,
  MessageSquare,
  Filter,
  RotateCcw,
  LogIn,
  LogOut,
} from 'lucide-react';

export const AdminActivityHistory = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (selectedEmployee) filters.employee = selectedEmployee;
      if (selectedCustomer) filters.customer = selectedCustomer;
      if (selectedEventType) filters.event_type = selectedEventType;

      const [logData, summaryData, empData, custData] = await Promise.all([
        adminApi.activity.list(filters),
        adminApi.activity.summary(),
        adminApi.employees.list(),
        adminApi.customers.list(),
      ]);

      setLogs(logData);
      setSummary(summaryData);
      setEmployees(empData);
      setCustomers(custData);
    } catch (err) {
      setError(err.message || 'Unable to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedEmployee, selectedCustomer, selectedEventType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedEmployee('');
    setSelectedCustomer('');
    setSelectedEventType('');
  };

  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'SHIFT_STARTED':
        return { icon: Play, color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Shift Started' };
      case 'SHIFT_ENDED':
        return { icon: Square, color: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Shift Ended' };
      case 'ATTENDANCE_CORRECTION':
        return { icon: Clock, color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Correction' };
      case 'EVIDENCE_UPLOADED':
        return { icon: Camera, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Evidence Upload' };
      case 'REPORT_SUBMITTED':
      case 'REPORT_CREATED':
      case 'REPORT_EDITED':
        return { icon: FileText, color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Report Event' };
      case 'FEEDBACK_RECEIVED':
      case 'FEEDBACK_REPLY':
        return { icon: MessageSquare, color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Feedback' };
      case 'LOGIN':
        return { icon: LogIn, color: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Login' };
      case 'LOGOUT':
        return { icon: LogOut, color: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Logout' };
      default:
        return { icon: History, color: 'bg-slate-100 text-slate-700 border-slate-200', label: eventType || 'Action' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-[#245CE2]" />
            Enterprise Activity Audit Trail & Compliance Log
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            System-wide chronological audit of all shift clockings, evidence uploads, reports, feedback, and admin corrections.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Shifts</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{summary.total_shifts}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Logged Hours</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{summary.total_working_hours} h</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Avg Duration</span>
            <span className="text-2xl font-black text-[#245CE2] mt-1 block">{summary.avg_shift_duration} h</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Reports Submitted</span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">{summary.reports_submitted}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Evidence Files</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{summary.evidence_uploaded}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" /> Filter Logs
          </span>
          <button onClick={handleReset} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName || e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Event Type</label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
            >
              <option value="">All Events</option>
              <option value="SHIFT_STARTED">Shift Started</option>
              <option value="SHIFT_ENDED">Shift Ended</option>
              <option value="ATTENDANCE_CORRECTION">Correction</option>
              <option value="EVIDENCE_UPLOADED">Evidence Uploaded</option>
              <option value="REPORT_SUBMITTED">Report Submitted</option>
              <option value="FEEDBACK_RECEIVED">Feedback</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Log Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-600" />
          Event Records ({logs.length})
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading activity logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">No activity events found.</div>
        ) : (
          <div className="divide-y divide-slate-100 space-y-3">
            {logs.map((log) => {
              const meta = getEventBadge(log.event_type);
              const EventIcon = meta.icon;
              const dateObj = new Date(log.created_at);

              return (
                <div key={log.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 ${meta.color}`}>
                        <EventIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                      {log.employee_name && (
                        <span className="text-xs font-semibold text-slate-800">
                          {log.employee_name} ({log.employee_code})
                        </span>
                      )}
                      {log.customer_name && (
                        <span className="text-xs text-slate-500">
                          • {log.customer_name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 pl-1">{log.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
