import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import {
  Camera,
  Download,
  Eye,
  Calendar,
  Building2,
  Clock,
  User,
  Filter,
  X,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const CustomerWorkEvidence = () => {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (dateFilter) filters.date_from = dateFilter;
      const data = await adminApi.evidence.list(filters);
      setEvidenceList(data);
    } catch (err) {
      setError(err.message || 'Unable to load evidence records.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Camera className="w-7 h-7 text-[#245CE2]" />
            Store Work Evidence & Photographic Verification
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Review genuine inspection photographs, register audits, and verified screenshots uploaded by your on-duty workforce.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Filter Date:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Gallery */}
      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
          Loading evidence records...
        </div>
      ) : evidenceList.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
          No photographic evidence found for your account.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {evidenceList.map((item) => (
            <article key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div
                  className="relative h-48 bg-slate-900 overflow-hidden cursor-pointer group"
                  onClick={() => setPreviewImage(item)}
                >
                  <img
                    src={item.file_url || adminApi.evidence.viewUrl(item.id)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs">
                    <Eye className="w-4 h-4" /> Click to Inspect Full Resolution
                  </div>
                </div>

                <div className="p-4 space-y-2">
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
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <User className="w-3.5 h-3.5 text-blue-600" /> {item.employee_name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {item.employee_code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : '--'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {item.uploaded_at ? new Date(item.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <a
                  href={item.file_url || adminApi.evidence.downloadUrl(item.id)}
                  download
                  className="w-full py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Download High-Resolution Evidence
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{previewImage.title}</h3>
                <p className="text-xs text-slate-300">Audited by: {previewImage.employee_name} ({previewImage.employee_code})</p>
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
                <span className="font-bold block text-slate-900 mb-0.5">Operator Notes:</span>
                {previewImage.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
