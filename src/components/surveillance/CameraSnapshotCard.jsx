import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Maximize2,
  X,
  FileText,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';

export const CameraSnapshotCard = ({
  snapshot,
  batchId,
  onVerify,
  onImageUpdated,
  isReadOnly = false,
  date,
  hourSlot,
}) => {
  const fileInputRef = useRef(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(snapshot.employeeNotes || snapshot.employee_notes || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const verificationStatus = snapshot.employeeVerification || snapshot.employee_verification || 'Verified OK';
  const isSuspicious = verificationStatus === 'Flagged Suspicious';

  const imageUrl = snapshot.image_url || snapshot.image || snapshot.localPreviewUrl;
  const fileName = snapshot.image_filename || (snapshot.image ? String(snapshot.image).split('/').pop() : null);

  const handleStatusChange = (newStatus) => {
    if (isReadOnly) return;
    onVerify(batchId, snapshot.id, newStatus, notesText);
  };

  const handleSaveNotes = () => {
    onVerify(batchId, snapshot.id, verificationStatus, notesText);
    setIsEditingNotes(false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase()) && !/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      setUploadError('Invalid file type. Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds the 10MB limit.');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      if (adminApi.surveillance?.uploadSnapshotImage) {
        const updated = await adminApi.surveillance.uploadSnapshotImage(snapshot.id, file);
        if (onImageUpdated) onImageUpdated(snapshot.id, updated);
      }
    } catch (err) {
      // In offline / demo mode fallback, generate object URL preview
      const localUrl = URL.createObjectURL(file);
      if (onImageUpdated) {
        onImageUpdated(snapshot.id, {
          ...snapshot,
          image: localUrl,
          image_url: localUrl,
          image_filename: file.name,
          uploaded_at: new Date().toISOString(),
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (isReadOnly) return;
    setIsUploading(true);
    setUploadError('');
    try {
      if (adminApi.surveillance?.removeSnapshotImage) {
        const updated = await adminApi.surveillance.removeSnapshotImage(snapshot.id);
        if (onImageUpdated) onImageUpdated(snapshot.id, updated);
      }
    } catch {
      if (onImageUpdated) {
        onImageUpdated(snapshot.id, {
          ...snapshot,
          image: null,
          image_url: null,
          image_filename: null,
          uploaded_at: null,
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-subtle ${
        isSuspicious
          ? 'border-amber-300 dark:border-amber-600/80 ring-2 ring-amber-400/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div>
        {/* Card Header: Camera Name & Zone */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#245CE2] dark:text-blue-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight">
                {snapshot.cameraName || snapshot.camera_name || `Camera ${snapshot.cameraId || snapshot.camera_id}`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {snapshot.zone || 'Store Location'} {snapshot.capture_time ? `• ${snapshot.capture_time}` : ''}
              </p>
            </div>
          </div>

          {(snapshot.isHighRisk || snapshot.is_high_risk) && (
            <span className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              Priority Zone
            </span>
          )}
        </div>

        {/* IMAGE VIEWPORT / UPLOAD AREA */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-video flex flex-col justify-center items-center group">
          {imageUrl ? (
            <>
              {/* Actual Uploaded Screenshot */}
              <img
                src={imageUrl}
                alt={snapshot.cameraName || 'CCTV Capture'}
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => setPreviewModalOpen(true)}
              />

              {/* Overlay with Camera ID & Click to enlarge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[11px] font-mono rounded-md border border-white/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{snapshot.cameraId || snapshot.camera_id}</span>
              </div>

              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Click to enlarge"
                aria-label="Enlarge image"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Bottom bar with filename / timestamp */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2.5 flex items-center justify-between text-xs text-white">
                <span className="truncate max-w-[200px] text-[11px] font-mono text-slate-300">
                  {fileName || 'cctv-capture.jpg'}
                </span>
                <span className="text-[10px] text-slate-300">
                  {date || 'Audit Capture'} {hourSlot ? `• ${hourSlot}` : ''}
                </span>
              </div>
            </>
          ) : (
            /* Clear placeholder when no screenshot is uploaded */
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-200">No screenshot uploaded</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Upload a verification screenshot from this camera location.
                </p>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 bg-[#245CE2] hover:bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Upload Screenshot
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Upload error banner if any */}
        {uploadError && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {uploadError}
          </p>
        )}

        {/* Image Controls: Replace & Remove Buttons when image exists */}
        {imageUrl && !isReadOnly && (
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-[#245CE2] dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              Replace Screenshot
            </button>

            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={isUploading}
              className="text-rose-600 dark:text-rose-400 hover:underline font-semibold inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        )}

        {/* Operator Verification Section */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Operator Verification:
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                isSuspicious
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {verificationStatus}
            </span>
          </div>

          {!isReadOnly && onVerify && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleStatusChange('Verified OK')}
                className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  verificationStatus === 'Verified OK'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Verified OK
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('Flagged Suspicious')}
                className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  verificationStatus === 'Flagged Suspicious'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Flag Suspicious
              </button>
            </div>
          )}

          {/* Operator observations / notes */}
          {isEditingNotes ? (
            <div className="space-y-2 mt-2">
              <input
                type="text"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Operator observation notes..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(false)}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-3 py-1 bg-[#245CE2] hover:bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  Save Note
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
              <span className="truncate max-w-[220px] italic">
                {notesText ? `Note: "${notesText}"` : 'No operator notes added'}
              </span>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-[#245CE2] dark:text-blue-400 hover:underline font-bold ml-2 shrink-0"
                >
                  {notesText ? 'Edit' : '+ Add Note'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CLICK-TO-ENLARGE PREVIEW MODAL */}
      {previewModalOpen && imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-3 bg-slate-800 flex items-center justify-between border-b border-slate-700 text-white">
              <div>
                <h4 className="font-bold text-sm">
                  {snapshot.cameraName || snapshot.camera_name || `Camera ${snapshot.cameraId}`}
                </h4>
                <p className="text-xs text-slate-400">
                  {snapshot.zone} • {date || 'Audit'} • {hourSlot || 'Shift Capture'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black max-h-[75vh]">
              <img
                src={imageUrl}
                alt="Enlarged CCTV Screenshot"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
