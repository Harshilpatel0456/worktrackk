import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { adminApi } from '../../services/adminApi';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  Award,
  Edit3,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Lock,
  MapPin,
  Briefcase,
} from 'lucide-react';

export const EmployeeProfile = () => {
  const { user, selectedEmployeeId } = useAuth();
  const { employees, assignments, customers, showToast } = useApp();

  const fileInputRef = useRef(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editable form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  const fallbackEmp = (employees && employees.length > 0)
    ? (employees.find((e) => e.id === selectedEmployeeId) || employees[0])
    : { name: user?.name || 'Staff Member', email: user?.email };

  const loadProfile = async () => {
    setLoading(true);
    try {
      if (adminApi.employees?.getMe) {
        const data = await adminApi.employees.getMe();
        if (data && data.email) {
          setProfileData(data);
          setFirstName(data.firstName || data.first_name || (data.fullName ? data.fullName.split(' ')[0] : ''));
          setLastName(data.lastName || data.last_name || (data.fullName ? data.fullName.split(' ').slice(1).join(' ') : ''));
          setPhone(data.phone || '');
          setAddress(data.address || '');
          setImagePreview(data.profile_image_url || data.profile_image || null);
          return;
        }
      }
    } catch {
      // Fallback to local user
    } finally {
      setLoading(false);
    }

    // Default from auth
    setFirstName(user?.name ? user.name.split(' ')[0] : (fallbackEmp.name ? fallbackEmp.name.split(' ')[0] : ''));
    setLastName(user?.name ? user.name.split(' ').slice(1).join(' ') : (fallbackEmp.name ? fallbackEmp.name.split(' ').slice(1).join(' ') : ''));
    setPhone(fallbackEmp.phone || '');
    setAddress(fallbackEmp.address || '');
    setImagePreview(user?.avatar || fallbackEmp.avatar || null);
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const currentEmp = profileData || fallbackEmp;
  const myAssignments = assignments.filter(
    (a) => (a.employeeId === currentEmp.id || a.employee === currentEmp.id || a.employeeId === selectedEmployeeId) &&
      (a.status === 'Approved' || a.status === 'APPROVED' || a.status === 'ACTIVE')
  );

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type.toLowerCase()) && !/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      setErrorMsg('Please upload a valid image (JPG, JPEG, PNG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size cannot exceed 5MB.');
      return;
    }

    setErrorMsg('');
    setProfileImageFile(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setProfileImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg('');
    setProfileImageFile(null);
    setRemoveImage(false);
    loadProfile();
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setErrorMsg('First name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('firstName', firstName.trim());
      formData.append('lastName', lastName.trim());
      formData.append('phone', phone.trim());
      formData.append('address', address.trim());

      if (profileImageFile) {
        formData.append('profile_image', profileImageFile);
      } else if (removeImage) {
        formData.append('remove_profile_image', 'true');
      }

      if (adminApi.employees?.updateMe) {
        const updated = await adminApi.employees.updateMe(formData);
        setProfileData(updated);
        setImagePreview(updated.profile_image_url || updated.profile_image || null);
      }

      setSuccessMsg('Profile updated successfully!');
      showToast('Profile information saved successfully.');
      setIsEditing(false);
      setProfileImageFile(null);
      setRemoveImage(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const displayName = profileData?.fullName || `${firstName} ${lastName}`.trim() || user?.name || fallbackEmp.name;
  const avatarUrl = imagePreview || currentEmp.profile_image_url || currentEmp.avatar || user?.avatar;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-[#245CE2] dark:text-blue-400" />
            Employee Profile
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Manage your personal profile information, contact details, and account credentials.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-5 py-2.5 bg-[#245CE2] hover:bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* EDIT PROFILE FORM MODE */}
      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#245CE2] dark:text-blue-400" />
              Edit Personal Profile
            </h2>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Picture Uploader */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-28 h-28 rounded-3xl object-cover ring-4 ring-blue-500/20 shadow-md"
                />
              ) : (
                <div className="w-28 h-28 rounded-3xl bg-blue-100 dark:bg-blue-950 text-[#245CE2] dark:text-blue-400 flex items-center justify-center font-extrabold text-4xl shadow-md ring-4 ring-blue-500/20">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Profile Picture</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Supports JPG, JPEG, PNG, and WEBP. Maximum file size 5MB.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-[#245CE2] dark:text-blue-300 rounded-xl text-xs sm:text-sm font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  {avatarUrl ? 'Change Picture' : 'Upload Picture'}
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 rounded-xl text-xs sm:text-sm font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-base focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-base focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-base focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                Residential Address / Location
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="City, State, Zip"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-base focus:ring-2 focus:ring-[#245CE2] dark:text-slate-100 font-medium"
              />
            </div>
          </div>

          {/* Protected Fields Notice & Display */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Administrator-Controlled Fields (Read-Only):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-slate-600 dark:text-slate-400">
              <div>
                <span className="block text-slate-400 text-[10px]">Staff ID:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono">{currentEmp.employeeId || currentEmp.employee_code || 'EMP-1'}</strong>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">Role:</span>
                <strong className="text-slate-800 dark:text-slate-200">Workforce Field Employee</strong>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">Department:</span>
                <strong className="text-slate-800 dark:text-slate-200">{currentEmp.department || 'Operations'}</strong>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">Status:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{currentEmp.status || 'Active'}</strong>
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm sm:text-base hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-7 py-3 bg-[#245CE2] hover:bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      ) : (
        /* READ-ONLY PROFILE VIEW MODE */
        <div className="space-y-6">
          {/* Profile Header Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-6 sm:p-8 shadow-card">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-28 h-28 rounded-3xl object-cover ring-4 ring-blue-500/20 shadow-md"
                />
              ) : (
                <div className="w-28 h-28 rounded-3xl bg-blue-100 dark:bg-blue-950 text-[#245CE2] dark:text-blue-400 flex items-center justify-center font-extrabold text-4xl shadow-md ring-4 ring-blue-500/20">
                  {displayName.charAt(0)}
                </div>
              )}

              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {displayName}
                  </h2>
                  <Badge status={currentEmp.status || 'ACTIVE'} />
                </div>

                <p className="text-sm sm:text-base font-semibold text-[#245CE2] dark:text-blue-400 mt-1">
                  {currentEmp.roleTitle || currentEmp.designation || 'Workforce Field Employee'} • {currentEmp.department || 'Operations'}
                </p>

                <div className="mt-5 flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-400">ID:</span>
                    <strong className="text-slate-800 dark:text-slate-100">{currentEmp.employeeId || currentEmp.employee_code || 'EMP-1'}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {currentEmp.email || user?.email || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {phone || currentEmp.phone || 'N/A'}
                  </span>
                  {address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {address}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Joined {currentEmp.joiningDate || currentEmp.joining_date || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Shift & Customer Authorizations */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-6 sm:p-7 shadow-subtle space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#245CE2] dark:text-blue-400" />
              Authorized Client Deployments ({myAssignments.length})
            </h3>

            <div className="space-y-3">
              {myAssignments.length === 0 ? (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-500 text-center">
                  No active client deployments currently scheduled.
                </div>
              ) : (
                myAssignments.map((asg) => {
                  const customer = customers.find((c) => c.id === asg.customerId || c.id === asg.customer);
                  const custName = asg.customerName || customer?.companyName || 'Assigned Client';
                  const shiftLabel = asg.shiftName || asg.shift_name || asg.designation || 'Standard Shift';
                  return (
                    <div
                      key={asg.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-base block">
                          {custName}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                          {shiftLabel} • Assigned Date: {asg.assignmentDate || asg.assignment_date || 'Active'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Approved Deployment
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
