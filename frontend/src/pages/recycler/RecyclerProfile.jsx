import { customAlert } from '../../components/common/popupService';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RecyclerSidebar from '../../components/layout/RecyclerSidebar';
import { useNavigate } from 'react-router-dom';
import { authAPI, BASE_URL } from '../../services/api';
import ProfileImageCropper from '../../components/common/ProfileImageCropper';

export default function RecyclerProfile() {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', facility_name: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    authAPI.me()
      .then(user => setForm({
        full_name: user.full_name || '',
        email: user.email || '',
        facility_name: user.facility_name || '',
        address: user.address || '',
        profile_image: user.profile_image ? (user.profile_image.startsWith('http') ? user.profile_image : `${BASE_URL}${user.profile_image}`) : '',
      }))
      .catch(err => console.error('Failed to load profile', err));
  }, []);

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile(form);
      setToast('Profile saved successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      customAlert(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await authAPI.deleteAccount?.();
    } catch { /* best-effort */ }
    finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      navigate('/');
    }
  };

  return (
    <DashboardLayout sidebar={RecyclerSidebar} title="Recycler Profile / Settings">
      <div className="mb-8">
        <p className="text-primary font-bold tracking-widest text-xs uppercase mb-1">Account</p>
        <h2 className="text-3xl font-black text-on-surface -tracking-tight">Profile &amp; Settings</h2>
      </div>

      {toast && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-700">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <p className="text-sm font-bold">{toast}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span> Facility Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Facility Name</label>
                <input type="text" value={form.facility_name} onChange={set('facility_name')}
                  className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Manager Name</label>
                <input type="text" value={form.full_name} onChange={set('full_name')}
                  className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input type="email" value={form.email} disabled
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface text-slate-500 cursor-not-allowed" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Facility Address</label>
                <textarea rows={2} value={form.address} onChange={set('address')}
                  className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary transition-all resize-none" />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span> Processing Capabilities
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['Laptops', 'Mobile Phones', 'Circuit Boards', 'Batteries', 'Monitors', 'Peripherals'].map((cat, i) => (
                <label key={i} className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant hover:bg-surface transition-all cursor-pointer">
                  <input type="checkbox" defaultChecked={i < 4} className="w-5 h-5 rounded border-primary-light text-primary focus:ring-primary" />
                  <span className="text-sm font-medium text-on-surface">{cat}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary rounded-2xl p-6 text-white text-center shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="mb-4">
                <ProfileImageCropper 
                  currentImage={form.profile_image} 
                  onImageUpdated={(url) => setForm(p => ({...p, profile_image: url}))}
                  size="w-24 h-24"
                  role="recycler"
                />
              </div>
              <h3 className="text-xl font-black">{form.facility_name || form.full_name || 'Recycler'}</h3>
              <p className="text-white/60 text-sm">Licensed Recycler</p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full"></div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-4">Security</h3>
            <div className="space-y-3">
              <button onClick={() => navigate('/recycler/change-password')}
                className="w-full p-4 rounded-xl border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">lock</span>
                <span className="text-sm font-bold">Change Password</span>
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                className="w-full p-4 rounded-xl border border-error/20 hover:border-error hover:bg-error/5 transition-all text-left flex items-center gap-3">
                <span className="material-symbols-outlined text-error">delete</span>
                <span className="text-sm font-bold text-error">Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
            </div>
            <h3 className="text-xl font-black text-on-surface text-center mb-2">Delete Account</h3>
            <p className="text-slate-500 text-sm text-center mb-6">
              Are you sure you want to delete your account? This action is <strong className="text-red-500">permanent and irreversible</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 border border-outline-variant rounded-xl font-bold text-slate-600 hover:bg-surface transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
