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
  Trash2,
} from 'lucide-react';

export const AdminWorkEvidence = () => {
  const [evidenceList, setEvidenceList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (selectedEmployee) filters.employee = selectedEmployee;
      if (selectedCustomer) filters.customer = selectedCustomer;
      if (dateFilter) filters.date_from = dateFilter;

      const [evidenceData, empData, custData] = await Promise.all([
        adminApi.evidence.list(filters),
        adminApi.employees.list(),
        adminApi.customers.list(),
      ]);

      setEvidenceList(evidenceData);
      setEmployees(empData);
      setCustomers(custData);
    } catch (err) {
      setError(err.message || 'Unable to load evidence records.');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee, selectedCustomer, dateFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this evidence record as Administrator?')) return;
    try {
      await adminApi.evidence.delete(id);
      setEvidenceList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err.message || 'Unable to delete evidence.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Camera className="w-7 h-7 text-[#245CE2]" />
            Enterprise Work Evidence & Photographic Verification
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Administrative monitoring of all on-duty screenshots, inspection photos, and shift verifications across stores.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Filter Employee</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName || emp.name} ({emp.employeeCode || emp.employeeId})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Filter Customer Store</label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
          >
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Filter Date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
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
          No photographic evidence found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {evidenceList.map((item) => (
            <article key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div
                  className="relative h-40 bg-slate-900 overflow-hidden cursor-pointer group"
                  onClick={() => setPreviewImage(item)}
                >
                  <img
                    src={item.file_url || adminApi.evidence.viewUrl(item.id)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs">
                    <Eye className="w-4 h-4" /> Inspect
                  </div>
                </div>

                <div className="p-3.5 space-y-1.5">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                    {item.title}
                  </h3>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-blue-600" /> {item.employee_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> {item.customer_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                <a
                  href={item.file_url || adminApi.evidence.downloadUrl(item.id)}
                  download
                  className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50"
                  title="Delete evidence"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                <p className="text-xs text-slate-300">{previewImage.employee_name} • {previewImage.customer_name}</p>
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
