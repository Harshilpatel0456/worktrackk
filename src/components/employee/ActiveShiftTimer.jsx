import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { useApp } from '../../context/AppContext';
import {
  Play,
  Square,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const ActiveShiftTimer = () => {
  const { showToast } = useApp();
  const {
    todayShift,
    activeAttendance,
    isCheckedIn,
    stopwatchTime,
    punching,
    checkIn,
    checkOut,
    currentSessionNumber,
  } = useAttendance();

  const [confirmEndModal, setConfirmEndModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const shiftName = todayShift?.shift_name || todayShift?.shiftName || (isCheckedIn ? `Shift ${currentSessionNumber}` : 'Assigned Shift');
  const customerName = todayShift?.customer_name || todayShift?.customerName || 'Assigned Client';
  const startTime = activeAttendance?.check_in
    ? new Date(activeAttendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const handleStartShift = async () => {
    setActionLoading(true);
    try {
      await checkIn();
    } catch (err) {
      // Toast already shown in context
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndShift = async () => {
    setActionLoading(true);
    try {
      await checkOut();
      setConfirmEndModal(false);
    } catch (err) {
      // Toast already shown in context
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {/* Persistent Global Sticky Shift Status and Timer Bar */}
      <div className="sticky top-0 z-30 w-full transition-colors duration-200">
        {isCheckedIn ? (
          /* ACTIVE SHIFT STATE: High-visibility pill & bar with live stopwatch */
          <div className="bg-emerald-900 dark:bg-emerald-950 text-white border-b border-emerald-700/60 shadow-md py-2.5 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              {/* Left: Indicator, Money icon, live stopwatch, Shift name */}
              <div className="flex items-center gap-3">
                {/* Live Pill matching user's reference mockup */}
                <div className="flex items-center gap-2 bg-emerald-800/90 dark:bg-emerald-900 border border-emerald-400/50 rounded-2xl px-3.5 py-1.5 shadow-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                  </span>

                  <Clock className="h-5 w-5 text-emerald-300" aria-hidden="true" />

                  <div className="flex flex-col">
                    <span className="font-mono text-base sm:text-lg font-black tracking-wider text-white">
                      {stopwatchTime || '00:00:00'}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wide">
                      Working Now
                    </span>
                  </div>
                </div>

                {/* Details: Customer and Start Time */}
                <div className="hidden md:flex flex-col text-xs text-emerald-100 pl-1 border-l border-emerald-700/50">
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                    {customerName}
                  </span>
                  <span className="text-emerald-200 text-[11px]">
                    Started at: <strong className="font-mono text-white">{startTime}</strong>
                  </span>
                </div>
              </div>

              {/* Right: Quick Action Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmEndModal(true)}
                  disabled={actionLoading || punching}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  End Shift
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* READY STATE: Persistent banner showing ready status and Start Shift button */
          <div className="bg-slate-800 dark:bg-slate-900 text-white border-b border-slate-700 py-2.5 px-4 sm:px-6 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full bg-slate-700 dark:bg-slate-800 border border-slate-600 text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  READY
                </span>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Assigned: <strong className="text-white font-semibold">{shiftName}</strong>
                  </span>
                  <span className="text-slate-500 hidden sm:inline">•</span>
                  <span className="hidden sm:inline text-slate-300">
                    Client: <strong className="text-white font-semibold">{customerName}</strong>
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleStartShift}
                  disabled={actionLoading || punching}
                  className="inline-flex items-center gap-2 px-4 py-1.5 sm:py-2 bg-[#245CE2] hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {actionLoading || punching ? 'Starting...' : 'Start Shift'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL FOR ENDING SHIFT */}
      {confirmEndModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Square className="w-7 h-7 fill-current" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold tracking-tight">
                End Your Active Shift?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                This will save your check-out timestamp, calculate your total working duration, and conclude your active shift session.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Shift / Schedule:</span>
                <span className="font-bold">{shiftName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Customer:</span>
                <span className="font-bold">{customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Started At:</span>
                <span className="font-mono font-bold">{startTime}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                <span>Total Elapsed Duration:</span>
                <span className="font-mono">{stopwatchTime}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmEndModal(false)}
                disabled={actionLoading}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndShift}
                disabled={actionLoading}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors shadow-md flex items-center justify-center gap-2"
              >
                {actionLoading ? 'Recording...' : 'Yes, End Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
