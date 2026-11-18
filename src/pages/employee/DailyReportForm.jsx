import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { adminApi } from '../../services/adminApi';
import {
  FileText,
  Building2,
  User,
  Clock,
  Calendar,
  Paperclip,
  CheckCircle,
  AlertCircle,
  History,
  Send,
  Save,
  Trash2,
  ShieldCheck,
  FileCheck,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

export const DailyReportForm = () => {
  const { user, selectedEmployeeId } = useAuth();
  const { showToast } = useApp();
  const [schedules, setSchedules] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentEmp = user?.employeeProfile || { id: selectedEmployeeId, name: user?.name, user: { get_full_name: user?.name } };

  useEffect(() => {
    let active = true;
    Promise.all([adminApi.schedules.list(), adminApi.reports.list()])
      .then(([scheduleRows, reportRows]) => {
        if (!active) return;
        const validSchedules = (scheduleRows || []).filter((row) => row.status !== 'CANCELLED');
        setSchedules(validSchedules);
        setReports(reportRows || []);
        setSelectedShiftId((current) => current || validSchedules.find((row) => row.shiftDate === todayDateStr)?.id || validSchedules[0]?.id || '');
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [todayDateStr]);

  const primaryAssignment = schedules.find((row) => row.id === selectedShiftId);
  const primaryCustomer = {
    id: primaryAssignment?.customerId,
    companyName: primaryAssignment?.customerName || 'Assigned customer',
  };
  const primaryShift = {
    id: primaryAssignment?.shiftId,
    name: primaryAssignment?.shiftName || 'Assigned shift',
    startTime: primaryAssignment?.shiftStartTime || '',
    endTime: primaryAssignment?.shiftEndTime || '',
  };
  const existingReport = reports.find((report) => report.shift_assignment === primaryAssignment?.id || report.shiftAssignment === primaryAssignment?.id);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form Fields
  const [workCompleted, setWorkCompleted] = useState('');
  const [title, setTitle] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [issues, setIssues] = useState('');
  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [revisionSummary, setRevisionSummary] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  // Pre-fill if editing existing report
  useEffect(() => {
    if (existingReport) {
      setTitle(existingReport.title || '');
      setWorkCompleted(existingReport.workCompleted || existingReport.work_summary || '');
      setPendingTasks(existingReport.pendingTasks || existingReport.pending_tasks || '');
      setIssues(existingReport.issues || existingReport.issues_or_blockers || '');
      setAdditionalRemarks(existingReport.additionalRemarks || existingReport.additional_remarks || '');
      setAttachments(existingReport.attachments || []);
      setNewFiles([]);
    } else {
      setTitle(`Daily Shift Report - ${primaryShift?.name || 'Assigned Shift'}`);
      setWorkCompleted('');
      setPendingTasks('');
      setIssues('');
      setAdditionalRemarks('');
      setAttachments([]);
      setNewFiles([]);
    }
  }, [existingReport?.id, primaryAssignment?.id, primaryShift?.name]);

  const handleAddAttachment = (event) => {
    const files = Array.from(event.target.files || []);
    setNewFiles((previous) => [...previous, ...files]);
    event.target.value = '';
  };

  const handleRemoveAttachment = (idx) => setNewFiles((previous) => previous.filter((_, i) => i !== idx));

  const uploadFiles = async (reportId) => {
    for (const file of newFiles) await adminApi.reports.uploadAttachment(reportId, file);
    setNewFiles([]);
  };

  const formData = (status) => ({
    shift_assignment: primaryAssignment.id,
    title: title.trim(),
    work_summary: workCompleted.trim(),
    tasks_completed: '',
    pending_tasks: pendingTasks,
    issues_or_blockers: issues,
    additional_remarks: additionalRemarks,
    status,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!primaryAssignment) {
      showToast('Select an assigned shift before submitting a report.', 'error');
      return;
    }
    if (!title.trim() || !workCompleted.trim()) {
      showToast('Report title and work summary are required.', 'error');
      return;
    }

    setSaving(true);
    setError('');
    try {
      let report;
      if (existingReport) {
        report = await adminApi.reports.update(existingReport.id, {
          ...formData(existingReport.status),
          change_summary: revisionSummary || `Revision ${existingReport.version + 1}`,
        });
        if (existingReport.status === 'DRAFT') report = await adminApi.reports.submit(report.id);
      } else {
        report = await adminApi.reports.create(formData('SUBMITTED'));
      }
      await uploadFiles(report.id);
      const updatedReports = await adminApi.reports.list();
      setReports(updatedReports);
      setRevisionSummary('');
      showToast('Daily report submitted successfully. Client notified.');
    } catch (requestError) {
      setError(requestError.message);
      showToast(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!primaryAssignment || !title.trim() || !workCompleted.trim()) {
      showToast('Select an assigned shift and enter a title and work summary.', 'error');
      return;
    }
    setSaving(true);
    try {
      const report = existingReport
        ? await adminApi.reports.update(existingReport.id, { ...formData('DRAFT'), change_summary: revisionSummary })
        : await adminApi.reports.create(formData('DRAFT'));
      await uploadFiles(report.id);
      setReports(await adminApi.reports.list());
      showToast('Draft saved successfully.');
    } catch (requestError) {
      setError(requestError.message);
      showToast(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {loading && (
        <div role="status" className="rounded-2xl bg-white dark:bg-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
          Loading assigned shifts and daily reports...
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 p-4 text-sm text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          {error}
        </div>
      )}

      {/* Assigned Shift Selector Bar */}
      {!loading && schedules.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-subtle">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Select Assigned Shift to Report:
          </label>
          <select
            value={selectedShiftId}
            onChange={(event) => setSelectedShiftId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
          >
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.shiftDate} • {schedule.shiftName} • {schedule.customerName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#245CE2] dark:text-blue-400" />
            Shift Daily Report
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Complete your shift handover report. Document completed work, pending tasks, challenges, and attachments.
          </p>
        </div>

        {existingReport && (
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto"
          >
            <History className="w-4 h-4 text-[#245CE2] dark:text-blue-400" />
            View Version History (v{existingReport.version})
          </button>
        )}
      </div>

      {/* Mode Banner: New vs Revision */}
      {existingReport ? (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start justify-between gap-4 text-sm text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <History className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-base block">
                Report Already Submitted for this Shift (Version {existingReport.version}) — Revision Mode
              </span>
              <p className="text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                Editing this form will preserve your previous submissions and generate <strong>Version {existingReport.version + 1}</strong>. The client will be automatically notified of your update.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 font-bold shrink-0">
            Last Modified: {new Date(existingReport.updatedAt || existingReport.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/90 dark:border-blue-800 flex items-start gap-3 text-sm text-blue-900 dark:text-blue-200">
          <ShieldCheck className="w-6 h-6 text-[#245CE2] dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-base block">Verified Shift Deployment:</span>
            <p className="text-blue-800 dark:text-blue-300 mt-0.5 leading-relaxed">
              Customer organization, staff credentials, shift window, and date are verified against your active schedule.
            </p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-6 sm:p-8 shadow-card space-y-7">
        {/* Metadata Details Bar */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Customer Client
            </label>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#245CE2] dark:text-blue-400" />
              {primaryCustomer.companyName}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Assigned Client</span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Reporting Employee
            </label>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {currentEmp.name || user?.name}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">{currentEmp.employeeId || 'EMP-1'}</span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Shift Window
            </label>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              {primaryShift.name}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">{primaryShift.startTime} – {primaryShift.endTime}</span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Reporting Date
            </label>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#245CE2] dark:text-blue-400" />
              {primaryAssignment?.shiftDate || todayDateStr}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Today's Date</span>
          </div>
        </div>

        {/* Report Title */}
        <div>
          <label className="block text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
            Report Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Daily Shift Report - Morning Shift"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100"
          />
        </div>

        {/* Revision summary prompt if in revision mode */}
        {existingReport && (
          <div>
            <label className="block text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
              Reason / Summary for Revision (Version {existingReport.version + 1}) *
            </label>
            <input
              type="text"
              required
              value={revisionSummary}
              onChange={(e) => setRevisionSummary(e.target.value)}
              placeholder="e.g. Added ultrasonic test results on Unit #4..."
              className="w-full px-4 py-3 bg-blue-50/50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-2xl text-base text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
          </div>
        )}

        {/* Section 1: Work Completed */}
        <div>
          <label className="block text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">
            1. Work Completed During Shift *
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2.5">
            Detail all operational tasks, equipment serviced, tests conducted, or deliverables completed during your shift.
          </p>
          <textarea
            required
            rows={5}
            value={workCompleted}
            onChange={(e) => setWorkCompleted(e.target.value)}
            placeholder="1. Conducted scheduled maintenance on machine #2...&#10;2. Verified sensor calibrations and logged readings...&#10;3. Cleaned workstations for incoming afternoon shift..."
            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100 leading-relaxed font-sans"
          />
        </div>

        {/* Section 2: Pending Tasks */}
        <div>
          <label className="block text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">
            2. Pending Tasks Handed Over to Next Shift
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2.5">
            Items requiring continuation, pending inventory arrivals, or unresolved jobs.
          </p>
          <textarea
            rows={3}
            value={pendingTasks}
            onChange={(e) => setPendingTasks(e.target.value)}
            placeholder="e.g. Review spare parts delivery scheduled for 16:00..."
            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100 leading-relaxed font-sans"
          />
        </div>

        {/* Section 3: Issues / Challenges */}
        <div>
          <label className="block text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">
            3. Issues / Challenges Encountered
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2.5">
            Safety anomalies, machine bottlenecks, power fluctuations, or customer concerns.
          </p>
          <textarea
            rows={3}
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
            placeholder="e.g. Hydraulic pump exhibited minor vibration under peak load..."
            className="w-full p-4 bg-rose-50/30 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100 leading-relaxed font-sans"
          />
        </div>

        {/* Section 4: Additional Remarks */}
        <div>
          <label className="block text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">
            4. Additional Remarks
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2.5">
            General observations, handover notes, or team recommendations.
          </p>
          <textarea
            rows={2}
            value={additionalRemarks}
            onChange={(e) => setAdditionalRemarks(e.target.value)}
            placeholder="e.g. Handover meeting completed with next shift supervisor..."
            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100 leading-relaxed font-sans"
          />
        </div>

        {/* Section 5: File Attachments */}
        <div>
          <label className="block text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">
            5. File Attachments & Documentation
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Attach inspection sheets, telemetry logs, or diagnostic screenshots (JPG, PNG, PDF, WEBP).
          </p>

          <div className="flex items-center gap-3 mb-4">
            <label className="cursor-pointer px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors border border-slate-300 dark:border-slate-600">
              <Upload className="w-4 h-4 text-[#245CE2] dark:text-blue-400" />
              <span>Choose Files to Attach</span>
              <input
                type="file"
                multiple
                onChange={handleAddAttachment}
                className="hidden"
              />
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {newFiles.length + attachments.length} file(s) selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {attachments.map((file, idx) => (
              <div
                key={file.id || idx}
                className="bg-slate-100 dark:bg-slate-700/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                <Paperclip className="w-4 h-4 text-[#245CE2] dark:text-blue-400" />
                <span className="font-semibold">{file.name}</span>
                <span className="text-slate-400">({file.size || 'Saved'})</span>
              </div>
            ))}
            {newFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="bg-blue-50 dark:bg-blue-950/60 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-2 text-xs font-medium text-blue-900 dark:text-blue-200"
              >
                <Paperclip className="w-4 h-4 text-[#245CE2] dark:text-blue-400" />
                <span className="font-semibold">{file.name}</span>
                <span className="text-slate-400">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  aria-label={`Remove ${file.name}`}
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Single official report per shift with automated version audit</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Save Draft
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-7 py-3 bg-[#245CE2] hover:bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              <Send className="w-4 h-4" />
              {saving
                ? 'Submitting...'
                : existingReport
                ? `Submit Revision (v${existingReport.version + 1})`
                : 'Submit Daily Report'}
            </button>
          </div>
        </div>
      </form>

      {/* Version History Modal */}
      {isHistoryModalOpen && existingReport && (
        <VersionHistoryModal
          reportId={existingReport.id}
          currentVersion={existingReport.version}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}
    </div>
  );
};
