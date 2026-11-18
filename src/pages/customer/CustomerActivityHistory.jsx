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
  AlertCircle,
} from 'lucide-react';

export const CustomerActivityHistory = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [logData, summaryData] = await Promise.all([
        adminApi.activity.list(),
        adminApi.activity.summary(),
      ]);
      setLogs(logData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || 'Unable to load customer activity trail.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'SHIFT_STARTED':
        return { icon: Play, color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Shift Started' };
      case 'SHIFT_ENDED':
        return { icon: Square, color: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Shift Ended' };
      case 'EVIDENCE_UPLOADED':
        return { icon: Camera, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Evidence Uploaded' };
      case 'REPORT_SUBMITTED':
      case 'REPORT_CREATED':
      case 'REPORT_EDITED':
        return { icon: FileText, color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Report Update' };
      case 'FEEDBACK_RECEIVED':
      case 'FEEDBACK_REPLY':
        return { icon: MessageSquare, color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Feedback & Reply' };
      default:
        return { icon: History, color: 'bg-slate-100 text-slate-700 border-slate-200', label: eventType || 'Action' };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-[#245CE2]" />
            Store Workforce Activity & Audit Trail
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Live chronological operational events for your store account, including guard clock-ins, shift completions, and reports.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Assigned Shifts</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{summary.total_shifts}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Guard Hours</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{summary.total_working_hours} h</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Daily Reports</span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">{summary.reports_submitted}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Evidence Files</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{summary.evidence_uploaded}</span>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-700" />
          Chronological Event Feed ({logs.length})
        </h2>

        {loading ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
            Loading activity log...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
            No activity events recorded yet for your account.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 pl-4 sm:pl-6 space-y-5">
            {logs.map((log) => {
              const meta = getEventBadge(log.event_type);
              const EventIcon = meta.icon;
              const dateObj = new Date(log.created_at);

              return (
                <article key={log.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${meta.color}`}>
                        <EventIcon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                      {log.employee_name && (
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-600" /> {log.employee_name} ({log.employee_code})
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-500 font-mono">
                      {dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {log.description}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
