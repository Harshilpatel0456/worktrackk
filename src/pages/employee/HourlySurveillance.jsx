import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { CameraSnapshotCard } from '../../components/surveillance/CameraSnapshotCard';
import { Badge } from '../../components/common/Badge';
import { adminApi } from '../../services/adminApi';
import { INITIAL_HOURLY_SURVEILLANCE_BATCHES } from '../../data/initialData';
import {
  Camera,
  ShieldAlert,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  Info,
  RotateCcw,
  Upload,
} from 'lucide-react';

export const HourlySurveillance = () => {
  const { selectedEmployeeId } = useAuth();
  const {
    surveillanceBatches = [],
    updateSnapshotVerification,
    submitHourlySurveillanceBatch,
    employees = [],
    customers = [],
    showToast,
  } = useApp();

  const currentEmp = employees?.find((e) => e.id === selectedEmployeeId) || employees?.[0] || { id: 'emp-1', name: 'Aarav Shah' };
  const primaryCustomer = customers?.[0] || { id: 'cust-1', companyName: 'Acme Retail Store #104' };

  const [backendBatches, setBackendBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shiftSchedule, setShiftSchedule] = useState(null);

  useEffect(() => {
    let active = true;
    adminApi.schedules.list()
      .then((rows) => {
        if (!active) return;
        const today = new Date();
        const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todaysSchedules = (rows || []).filter((row) =>
          row.shiftDate === todayDate && row.status !== 'CANCELLED'
        );
        const currentSchedule = todaysSchedules.find((row) => row.status === 'IN_PROGRESS')
          || todaysSchedules[0]
          || null;
        setShiftSchedule(currentSchedule);
      })
      .catch(() => setShiftSchedule(null));
    return () => { active = false; };
  }, []);

  // Load from backend API if available, fallback to local state / demo data
  const loadBatches = useCallback(async () => {
    try {
      if (adminApi.surveillance?.batches) {
        const rows = await adminApi.surveillance.batches();
        if (Array.isArray(rows) && rows.length > 0) {
          setBackendBatches(rows);
        }
      }
    } catch {
      // Fallback to local context batches
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Combine batches
  const rawBatches = backendBatches.length > 0
    ? backendBatches
    : Array.isArray(surveillanceBatches) && surveillanceBatches.length > 0
    ? surveillanceBatches
    : INITIAL_HOURLY_SURVEILLANCE_BATCHES;
  const parseShiftHour = (value) => {
    if (!value) return null;
    const match = String(value).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!match) return null;
    let hour = Number(match[1]);
    const suffix = match[3]?.toUpperCase();
    if (suffix === 'PM' && hour !== 12) hour += 12;
    if (suffix === 'AM' && hour === 12) hour = 0;
    if (!suffix && hour <= 23) return hour;
    return hour;
  };
  const shiftStart = 12;
  const shiftEnd = 18;
  const shiftBatches = rawBatches.filter((batch) => {
    const hour = parseShiftHour(batch.hour24 || batch.hour_slot);
    return hour != null && hour >= shiftStart && hour <= shiftEnd;
  });
  const batches = [...shiftBatches]
    .sort((left, right) => parseShiftHour(left.hour24 || left.hour_slot) - parseShiftHour(right.hour24 || right.hour_slot));
  const [selectedBatchId, setSelectedBatchId] = useState(() => batches[0]?.id || 'cctv-batch-14');

  const activeBatch = batches.find((b) => b?.id === selectedBatchId) || batches[0] || null;

  const [assessmentText, setAssessmentText] = useState(activeBatch?.overallAssessment || activeBatch?.overall_assessment || '');
  const [actionsText, setActionsText] = useState(activeBatch?.actionsTaken || activeBatch?.actions_taken || '');
  const [submitting, setSubmitting] = useState(false);

  // Sync text when batch changes
  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
    const b = batches.find((x) => x?.id === batchId);
    if (b) {
      setAssessmentText(b?.overallAssessment || b?.overall_assessment || '');
      setActionsText(b?.actionsTaken || b?.actions_taken || '');
    }
  };

  const handleVerify = async (bId, snapshotId, verifiedStatus, employeeNotes) => {
    if (adminApi.surveillance?.verifySnapshot) {
      try {
        await adminApi.surveillance.verifySnapshot(snapshotId, {
          employee_verification: verifiedStatus,
          employee_notes: employeeNotes,
        });
      } catch {}
    }

    if (updateSnapshotVerification) {
      updateSnapshotVerification(bId, snapshotId, verifiedStatus, employeeNotes);
    }

    // Update in local batch state
    setBackendBatches((prev) =>
      prev.map((batch) => {
        if (batch.id === bId && Array.isArray(batch.snapshots)) {
          return {
            ...batch,
            snapshots: batch.snapshots.map((s) =>
              s.id === snapshotId
                ? { ...s, employee_verification: verifiedStatus, employee_notes: employeeNotes }
                : s
            ),
          };
        }
        return batch;
      })
    );
  };

  const handleImageUpdated = (snapshotId, updatedSnapshot) => {
    setBackendBatches((prev) =>
      prev.map((batch) => {
        if (Array.isArray(batch.snapshots)) {
          return {
            ...batch,
            snapshots: batch.snapshots.map((s) => (s.id === snapshotId ? { ...s, ...updatedSnapshot } : s)),
          };
        }
        return batch;
      })
    );
  };

  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    if (!activeBatch?.id) return;

    setSubmitting(true);
    try {
      if (adminApi.surveillance?.submitBatch) {
        await adminApi.surveillance.submitBatch(activeBatch.id, {
          overall_assessment: assessmentText,
          actions_taken: actionsText,
        });
      }

      if (submitHourlySurveillanceBatch) {
        submitHourlySurveillanceBatch(activeBatch.id, assessmentText, actionsText);
      }

      showToast(`Hourly surveillance audit for ${activeBatch.hourSlot || activeBatch.hour_slot} submitted successfully.`);
      await loadBatches();
    } catch (err) {
      showToast(err.message || 'Audit submission completed');
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitted = activeBatch?.status === 'Submitted' || activeBatch?.status === 'SUBMITTED';
  const snapshots = activeBatch?.snapshots || [];
  const suspiciousCount = snapshots.filter(
    (s) => s?.employeeVerification === 'Flagged Suspicious' || s?.employee_verification === 'Flagged Suspicious'
  ).length;
  const submittedCount = batches.filter((batch) =>
    batch.status === 'Submitted' || batch.status === 'SUBMITTED'
  ).length;
  const pendingCount = Math.max(0, batches.length - submittedCount);

  if (!activeBatch) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#245CE2] dark:text-blue-400 flex items-center justify-center mx-auto">
          <Camera className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">No Surveillance Batches Available</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          There are currently no active surveillance batches scheduled. Check your store assignment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <Camera className="w-8 h-8 text-[#245CE2] dark:text-blue-400" />
            Hourly CCTV Audit & Screenshot Verification
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Upload genuine CCTV screenshot evidence for each camera location, verify security status, and submit hourly audits.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Store:</span>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#245CE2] dark:text-blue-400" />
            {activeBatch.customer_name || primaryCustomer?.companyName || 'Store #104'}
          </span>
        </div>
      </div>

      {/* Hourly Batches Selector Tabs */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-subtle space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Today's shift timeline: 12:00 PM–6:00 PM</span>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-300">
              {submittedCount} submitted
            </span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 font-bold text-blue-700 dark:text-blue-300">
                {pendingCount} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Selected:</span>
            <Badge status={activeBatch.status} />
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
          {batches.map((batch) => {
            const isSelected = batch.id === selectedBatchId;
            const hasSuspicious = (batch?.flaggedSuspiciousCount || batch?.flagged_suspicious_count || 0) > 0;
            const slotName = batch.hourSlot || batch.hour_slot || 'Batch';

            return (
              <button
                key={batch.id}
                type="button"
                onClick={() => handleSelectBatch(batch.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#245CE2] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{slotName}</span>
                {batch.status === 'Submitted' || batch.status === 'SUBMITTED' ? (
                  <span className={`w-2 h-2 rounded-full ${hasSuspicious ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
                )}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {/* Verification Instructions Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/90 dark:border-blue-900/60 flex items-start gap-3.5 text-blue-950 dark:text-blue-200">
        <Info className="w-5 h-5 text-[#245CE2] dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <span className="font-bold">Hourly Operational Protocol:</span>
          <p className="text-blue-900 dark:text-blue-300 leading-relaxed">
            Upload actual CCTV screenshots for each camera location using the <strong>Upload Screenshot</strong> button on each card. Inspect high-risk cash register and safe room areas, verify status (Verified OK or Flag Suspicious), and complete the hourly assessment below. Submitting will record your audit and notify the client organization.
          </p>
        </div>
      </div>

      {/* Active Batch Summary & Metrics */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-subtle grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 dark:text-slate-400 uppercase font-bold text-[11px] block">Hour Slot</span>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-base mt-1 block">
            {activeBatch.hourSlot || activeBatch.hour_slot || 'Current Window'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-400 uppercase font-bold text-[11px] block">Assigned Cameras</span>
          <span className="font-bold text-[#245CE2] dark:text-blue-400 text-base mt-1 block">
            {activeBatch.totalCameras || activeBatch.total_cameras || snapshots.length} Feeds
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-400 uppercase font-bold text-[11px] block">Screenshots Uploaded</span>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-base mt-1 block">
            {snapshots.filter((s) => s.image || s.image_url).length} of {snapshots.length}
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-400 uppercase font-bold text-[11px] block">Flagged Suspicious</span>
          <span className={`font-bold text-base mt-1 block ${suspiciousCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {suspiciousCount > 0 ? `${suspiciousCount} Anomaly Flagged` : '0 (All Clear)'}
          </span>
        </div>
      </div>

      {/* Grid of Camera Cards with Real Screenshot Upload */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#245CE2] dark:text-blue-400" />
            Camera Feeds ({snapshots.length} Locations)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            JPG, JPEG, PNG, WEBP Supported
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {snapshots.map((snap) => (
            <CameraSnapshotCard
              key={snap.id}
              snapshot={snap}
              batchId={activeBatch.id}
              date={activeBatch.date}
              hourSlot={activeBatch.hourSlot || activeBatch.hour_slot}
              onVerify={handleVerify}
              onImageUpdated={handleImageUpdated}
              isReadOnly={isSubmitted}
            />
          ))}
        </div>
      </div>

      {snapshots.some((snap) => snap.image || snap.image_url) && (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#245CE2] dark:text-blue-400" />
              Uploaded Images for {activeBatch.hourSlot || activeBatch.hour_slot}
            </h3>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {snapshots.filter((snap) => snap.image || snap.image_url).length} image(s)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshots.filter((snap) => snap.image || snap.image_url).map((snap) => {
              const imageUrl = snap.image_url || snap.image;
              return (
                <article key={`uploaded-${snap.id}`} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <img
                    src={imageUrl}
                    alt={snap.camera_name || snap.cameraName || 'Uploaded camera image'}
                    className="h-44 w-full object-cover"
                  />
                  <div className="p-3">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {snap.camera_name || snap.cameraName || 'Camera'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {snap.camera_id || snap.cameraId || 'Camera'} • {snap.uploaded_at ? new Date(snap.uploaded_at).toLocaleString() : 'Uploaded'}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Hourly Summary Submission Form */}
      <form onSubmit={handleSubmitBatch} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-6 sm:p-7 shadow-card space-y-5">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
          <Send className="w-5 h-5 text-[#245CE2] dark:text-blue-400" />
          Operator Overall Shift Assessment ({activeBatch.hourSlot || activeBatch.hour_slot})
        </h3>

        <div>
          <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
            Overall Security Summary for this Hour *
          </label>
          <textarea
            required
            rows={3}
            value={assessmentText}
            onChange={(e) => setAssessmentText(e.target.value)}
            placeholder="e.g. Store premises operating normally. Front cash registers staffed. Safe room secured..."
            disabled={isSubmitted}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#245CE2] disabled:opacity-70 dark:text-slate-100 leading-relaxed font-sans"
          />
        </div>

        <div>
          <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
            Operational Actions Taken (Optional)
          </label>
          <textarea
            rows={2}
            value={actionsText}
            onChange={(e) => setActionsText(e.target.value)}
            placeholder="e.g. Notified floor supervisor regarding cash register drawer. Verified cash counts..."
            disabled={isSubmitted}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#245CE2] disabled:opacity-70 dark:text-slate-100 leading-relaxed font-sans"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Submitting will record this hourly audit and dispatch a notification to the customer.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitted || submitting}
            className={`px-7 py-3 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all shadow-md ${
              isSubmitted
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-[#245CE2] hover:bg-blue-600 text-white shadow-blue-500/20'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitted
              ? `Report Submitted (${activeBatch.hourSlot || activeBatch.hour_slot})`
              : submitting
              ? 'Submitting...'
              : `Submit Hourly Audit (${activeBatch.hourSlot || activeBatch.hour_slot})`}
          </button>
        </div>
      </form>
    </div>
  );
};
