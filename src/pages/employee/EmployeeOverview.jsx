import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useAttendance } from '../../context/AttendanceContext';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { adminApi } from '../../services/adminApi';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Building2,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  History,
  FileCheck,
  Timer,
} from 'lucide-react';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  : '--';

export const EmployeeOverview = () => {
  const { user, selectedEmployeeId } = useAuth();
  const { employees, assignments, shifts, showToast } = useApp();
  const navigate = useNavigate();

  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);
  const [myAttendance, setMyAttendance] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportError, setReportError] = useState('');

  const {
    todayShift,
    myShiftRows,
    todaySessions,
    completedSessions,
    totalCompletedHours,
    currentSessionNumber,
    isCheckedIn,
    isCheckedOut,
    stopwatchTime,
    attendanceError,
    refreshAttendance,
  } = useAttendance();

  const activeEmp = (employees && employees.length > 0)
    ? (employees.find((e) => e.id === selectedEmployeeId) || employees[0])
    : { name: user?.name || 'Staff Member', employeeId: 'EMP-1', roleTitle: 'Field Specialist' };

  // Active Approved assignments for this employee
  const empAssignments = assignments.filter(
    (a) => (a.employeeId === activeEmp.id || a.employee === activeEmp.id || a.employeeId === selectedEmployeeId) &&
      (a.status === 'Approved' || a.status === 'APPROVED' || a.status === 'ACTIVE')
  );
  const primaryAssignment = empAssignments[0];
  const primaryShift = shifts.find((s) => s.id === (primaryAssignment ? (primaryAssignment.shiftId || primaryAssignment.shift) : activeEmp?.currentShiftId)) || shifts[0];

  const todayDateStr = localDate();

  const loadAttendanceHistory = useCallback(async () => {
    try {
      const records = await adminApi.attendance.myAttendance();
      setMyAttendance(records || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadAttendanceHistory();
  }, [loadAttendanceHistory, isCheckedIn, isCheckedOut]);

  useEffect(() => {
    let active = true;
    adminApi.reports.list()
      .then((rows) => { if (active) setReports(rows || []); })
      .catch((error) => { if (active) setReportError(error.message); });
    return () => { active = false; };
  }, []);

  // Today's daily report
  const todayReport = reports.find(
    (r) => r.reportingDate === todayDateStr || r.shift_date === todayDateStr
  );

  const myReports = reports;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Welcome Banner with Current Shift & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-card">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Employee Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || activeEmp.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1 font-medium">
              Employee: {activeEmp.employeeId || 'EMP-1'}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-xs sm:text-sm text-slate-300 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
                  Assigned Customer Client
                </span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-4 h-4 text-[#245CE2]" />
                  {primaryAssignment ? primaryAssignment.customerName : 'Acme Retail Store #104'}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-white/20 hidden sm:block"></div>
            </div>
          </div>

        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          title="Active Allocations"
          value={empAssignments.length}
          subtitle="Approved client sites"
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Shift Working Time"
          value={stopwatchTime}
          subtitle={
            isCheckedIn
              ? `Session running live`
              : completedSessions && completedSessions.length > 0
              ? `Total today: ${totalCompletedHours.toFixed(2)}h`
              : 'Not checked in'
          }
          icon={Timer}
          color={isCheckedIn ? 'emerald' : 'blue'}
        />
        <StatCard
          title="Daily Report Status"
          value={todayReport ? (todayReport.version > 1 ? `Submitted (v${todayReport.version})` : 'Submitted') : 'Pending'}
          subtitle={todayReport ? 'Customer notified' : 'Due for this shift'}
          icon={FileText}
          color={todayReport ? 'emerald' : 'amber'}
        />
      </div>

      {/* Daily Report Quick Access Banner */}
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#245CE2] dark:text-blue-400 shrink-0">
            <FileCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {todayReport ? "Today's Shift Report is Submitted" : "Shift Daily Report Due"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {todayReport
                ? `Version ${todayReport.version} is active. You may revise this report or add additional notes anytime during your shift.`
                : "Submit work completed, pending task handovers, obstacles, and diagnostic attachments."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/employee/daily-report')}
          className="bg-[#245CE2] hover:bg-blue-600 text-white text-sm font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md shrink-0"
        >
          {todayReport ? (
            <>
              <History className="w-4 h-4" />
              View / Edit Today's Report
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Complete Daily Report
            </>
          )}
        </button>
      </div>

      {/* Two Column Section: Recent Reports & Attendance History */}
      {reportError && (
        <div role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/50 p-4 text-xs text-rose-700 dark:text-rose-300">
          {reportError}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">My Recent Reports</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Handover logs and revisions submitted by you</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/employee/history')}
              className="text-xs sm:text-sm font-bold text-[#245CE2] dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Full History <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {myReports.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No reports submitted yet.
              </div>
            ) : (
              myReports.slice(0, 3).map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className="py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 px-3 rounded-2xl transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{rep.customerName || rep.customer_name}</span>
                      <span className="text-xs text-slate-400">({rep.reportingDate || rep.shift_date})</span>
                      {rep.version > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-[#245CE2] dark:text-blue-300">
                          v{rep.version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {rep.workCompleted || rep.work_summary}
                    </p>
                  </div>
                  <Badge status={rep.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">My Attendance History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Recorded shift check-in and check-out logs</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/employee/attendance')}
              className="text-xs sm:text-sm font-bold text-[#245CE2] dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Check-In Terminal <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {attendanceError && <p role="alert" className="py-2 text-xs text-rose-600">{attendanceError}</p>}
            {myAttendance.slice(0, 4).map((att) => (
              <div key={att.id} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{att.shift_date} • {att.shift_name}</span>
                  <span className="text-xs text-slate-400">
                    {att.customer_name}
                  </span>
                </div>
                <div className="text-right">
                  <Badge status={att.attendance_status} />
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {att.check_in ? `${formatTime(att.check_in)} – ${att.check_out ? formatTime(att.check_out) : 'Open'}` : 'Absent'}
                  </p>
                </div>
              </div>
            ))}
            {!attendanceError && myAttendance.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No attendance records yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReportDetailModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
        onOpenVersionHistory={(r) => {
          setSelectedReport(null);
          setHistoryReport(r);
        }}
        onEditReport={(r) => {
          setSelectedReport(null);
          navigate('/employee/daily-report');
        }}
      />

      {historyReport && (
        <VersionHistoryModal
          reportId={historyReport.id}
          currentVersion={historyReport.version}
          onClose={() => setHistoryReport(null)}
        />
      )}
    </div>
  );
};
