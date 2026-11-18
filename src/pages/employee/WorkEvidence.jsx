import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Trash2,
  Download,
  Eye,
  X,
  FileText,
  Calendar,
} from 'lucide-react';

export const WorkEvidence = () => {
  const [evidenceList, setEvidenceList] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form inputs
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  // Preview modal
  const [previewImage, setPreviewImage] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [evidenceData, scheduleData, customerData] = await Promise.all([
        adminApi.evidence.list(),
        adminApi.schedules.list(),
        adminApi.customers.list(),
      ]);
      setEvidenceList(evidenceData);
      setSchedules(scheduleData);
      setCustomers(customerData);

      if (scheduleData.length > 0 && !selectedShiftId) {
        setSelectedShiftId(scheduleData[0].id);
        setSelectedCustomerId(scheduleData[0].customerId || '');
      }
    } catch (err) {
      setError(err.message || 'Unable to load evidence history.');
    } finally {
      setLoading(false);
    }
  }, [selectedShiftId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When shift selection changes, auto-sync customer
  const handleShiftChange = (shiftId) => {
    setSelectedShiftId(shiftId);
    const matched = schedules.find((s) => s.id === shiftId);
    if (matched?.customerId) {
      setSelectedCustomerId(matched.customerId);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles = [];
    const previews = [];

    for (const f of files) {
      if (!allowed.includes(f.type)) {
        setError(`File "${f.name}" has an unsupported format. Please upload JPG, PNG, or WebP.`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError(`File "${f.name}" exceeds 10MB limit.`);
        return;
      }
      validFiles.push(f);
      previews.push({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
        url: URL.createObjectURL(f),
      });
    }

    setError('');
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setFilePreviews(prev => [...prev, ...previews]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) {
      setError('Please choose at least one screenshot or photo to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('title', title.trim() || file.name);
        formData.append('description', description.trim());
        formData.append('file', file);
        if (selectedShiftId) formData.append('shift_assignment_id', selectedShiftId);
        if (selectedCustomerId) formData.append('customer_id', selectedCustomerId);
        await adminApi.evidence.upload(formData);
      }

      setSuccessMsg(`Successfully uploaded ${selectedFiles.length} evidence photo(s)!`);
      setTitle('');
      setDescription('');
      setSelectedFiles([]);
      setFilePreviews([]);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to upload evidence. Please verify your file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (id) => {
    if (!window.confirm('Are you sure you want to delete this evidence record?')) return;
    try {
      await adminApi.evidence.delete(id);
      setEvidenceList(prev => prev.filter(item => item.id !== id));
      setSuccessMsg('Evidence record removed.');
    } catch (err) {
      setError(err.message || 'Unable to delete evidence.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Camera className="w-7 h-7 text-[#245CE2]" />
            Work Evidence & Photographic Verification
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Upload genuine screenshots, camera photos, and zone inspection records. Evidence is permanently saved to PostgreSQL and accessible to authorized clients.
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="font-semibold">{error}</div>
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="font-semibold">{successMsg}</div>
        </div>
      )}

      {/* UPLOAD FORM */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Upload className="w-5 h-5 text-[#245CE2]" />
          Upload New Photographic Evidence
        </h2>

        <form onSubmit={handleUploadSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shift Assignment Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Assigned Shift Schedule *
              </label>
              <select
                value={selectedShiftId}
                onChange={(e) => handleShiftChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select Shift --</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shiftDate} • {s.shiftName} ({s.customerName})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Organization */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Customer Store / Account *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Evidence Title / Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Front Cash Drawer & Vault Verification"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Work Notes & Operational Observations
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details of the inspection, zone verification, or work completed..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* File Upload Drop Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Photographic Files (JPG, PNG, WebP — Up to 10MB each) *
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/70 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="evidence-file-input"
              />
              <label htmlFor="evidence-file-input" className="cursor-pointer block space-y-2">
                <ImageIcon className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-700">
                  Click to select images or drag and drop
                </div>
                <p className="text-xs text-slate-500">
                  Multiple screenshots and camera snapshots supported
                </p>
              </label>
            </div>
          </div>

          {/* Image Previews */}
          {filePreviews.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Selected Photos for Upload ({filePreviews.length}):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {filePreviews.map((item, idx) => (
                  <div key={idx} className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group">
                    <img src={item.url} alt={item.name} className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1.5 bg-white/95 text-[11px] truncate font-medium text-slate-800">
                      {item.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-md ${
                uploading || selectedFiles.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#245CE2] hover:bg-blue-700 text-white'
              }`}
            >
              <Upload className="w-5 h-5" />
              {uploading ? 'Uploading Evidence...' : `Upload ${selectedFiles.length || ''} Evidence Image(s)`}
            </button>
          </div>
        </form>
      </div>

      {/* EVIDENCE GALLERY & HISTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Camera className="w-5 h-5 text-slate-700" />
            Uploaded Work Evidence Records ({evidenceList.length})
          </h2>
        </div>

        {loading ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
            Loading evidence records...
          </div>
        ) : evidenceList.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
            No photographic evidence has been uploaded yet. Upload your first snapshot above!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {evidenceList.map((item) => (
              <article key={item.id} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  {/* Thumbnail */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer group" onClick={() => setPreviewImage(item)}>
                    <img
                      src={item.file_url || adminApi.evidence.viewUrl(item.id)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs">
                      <Eye className="w-4 h-4" /> Click to Inspect
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2.5">
                    <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" /> {item.customer_name}
                        </span>
                        <span className="font-mono text-[11px]">
                          {(item.file_size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : '--'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {item.uploaded_at ? new Date(item.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={item.file_url || adminApi.evidence.downloadUrl(item.id)}
                    download
                    className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" /> Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvidence(item.id)}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete evidence"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* FULL PREVIEW MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{previewImage.title}</h3>
                <p className="text-xs text-slate-300">{previewImage.customer_name} • {previewImage.file_name}</p>
              </div>
              <button onClick={() => setPreviewImage(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto flex justify-center bg-slate-950">
              <img
                src={previewImage.file_url || adminApi.evidence.viewUrl(previewImage.id)}
                alt={previewImage.title}
                className="max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            {previewImage.description && (
              <div className="p-4 bg-slate-50 text-xs text-slate-700 border-t border-slate-200">
                <span className="font-bold block text-slate-900 mb-0.5">Notes:</span>
                {previewImage.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
