import { customAlert } from '../../components/common/popupService';
import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RecyclerSidebar from '../../components/layout/RecyclerSidebar';
import PasswordField from '../../components/common/PasswordField';
import { authAPI } from '../../services/api';

export default function RecyclerChangePassword() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false); // eslint-disable-line no-unused-vars
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPass !== form.confirm) return;
    try {
      await authAPI.changePassword({
        old_password: form.current,
        new_password: form.newPass,
      });
      // authAPI.changePassword revokes sessions and redirects to /login.
    } catch (err) {
      customAlert(err.message || 'Failed to change password');
    }
  };

  const strength = (() => {
    const p = form.newPass;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Strong', 'Excellent'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-teal-400', 'bg-[#326669]'][strength];



  return (
    <DashboardLayout sidebar={RecyclerSidebar} title="Change Password">
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-10 text-center md:text-left">
          <p className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full font-black tracking-widest text-[10px] uppercase mb-4 border border-primary/20">Security Center</p>
          <h2 className="text-4xl font-black text-on-surface tracking-tighter">Change Your Password</h2>
          <p className="text-slate-500 font-medium mt-3 text-lg">Ensure your account uses a strong, secure password.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-primary/5 border border-primary/10 relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              
              {success && (
                <div className="mb-8 flex items-center gap-4 p-5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-800 animate-fade-in shadow-sm">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-teal-600 shrink-0">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  </div>
                  <div>
                     <p className="font-bold text-sm">Update Successful!</p>
                     <p className="text-xs mt-0.5 opacity-80">Your new password is now securely saved.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <PasswordField
                  id="current"
                  label="Current Password"
                  value={form.current}
                  show={showCurrent}
                  onToggle={() => setShowCurrent(!showCurrent)}
                  onChange={(e) => setForm({ ...form, current: e.target.value })}
                  placeholder="Enter your current password"
                />

                <div className="pt-2">
                  <PasswordField
                    id="newPass"
                    label="New Password"
                    value={form.newPass}
                    show={showNew}
                    onToggle={() => setShowNew(!showNew)}
                    onChange={(e) => setForm({ ...form, newPass: e.target.value })}
                    placeholder="Create a strong password"
                  />
                  
                  {/* Password Strength Indicator */}
                  <div className="mt-4 pt-1">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Strength</span>
                       <span className={`text-xs font-black uppercase tracking-widest ${strength >= 3 ? 'text-primary' : 'text-slate-400'}`}>
                         {strengthLabel || 'None'}
                       </span>
                    </div>
                    <div className="flex gap-1.5 h-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-500 ease-out ${
                            form.newPass.length > 0 && i <= strength ? strengthColor : 'bg-slate-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 pb-4">
                  <PasswordField
                    id="confirm"
                    label="Confirm New Password"
                    value={form.confirm}
                    show={showConfirm}
                    onToggle={() => setShowConfirm(!showConfirm)}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    placeholder="Re-enter your new password"
                  />
                  
                  {form.confirm && form.newPass !== form.confirm && (
                    <div className="mt-3 flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                      <span className="material-symbols-outlined text-sm">error</span>
                      <p className="text-xs font-bold">Passwords do not match.</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={form.newPass !== form.confirm || strength < 2}
                  className="w-full py-4 bg-primary text-white text-lg rounded-2xl font-black tracking-wide shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-xl mt-4"
                >
                  <span className="material-symbols-outlined text-[22px]">lock_reset</span>
                  Save New Password
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-gradient-to-br from-[#326669] to-teal-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-center">
              <span className="material-symbols-outlined absolute -right-4 -top-4 text-[150px] text-white/5 pointer-events-none rotate-12">shield_locked</span>
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 flex items-center justify-center mb-6">
                   <span className="material-symbols-outlined text-white text-2xl">password</span>
                </div>
                
                <h3 className="text-2xl font-black mb-6 tracking-tight drop-shadow-sm">Secure Your Account</h3>
                
                <div className="bg-black/20 rounded-2xl p-6 border border-white/10">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-white/70 mb-4 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Password Requirements
                   </h4>
                   <ul className="space-y-3">
                     {[
                       { text: 'At least 8 characters long', met: form.newPass.length >= 8 },
                       { text: 'Includes at least one uppercase letter', met: /[A-Z]/.test(form.newPass) },
                       { text: 'Includes at least one number', met: /[0-9]/.test(form.newPass) },
                       { text: 'Includes at least one special symbol', met: /[^A-Za-z0-9]/.test(form.newPass) },
                     ].map((req, i) => (
                       <li key={i} className={`flex items-start gap-3 text-sm transition-colors duration-300 ${req.met ? 'text-white' : 'text-white/50'}`}>
                         <span className="material-symbols-outlined text-[16px] mt-0.5" style={{ fontVariationSettings: req.met ? "'FILL' 1" : "'FILL' 0" }}>
                           {req.met ? 'check_circle' : 'radio_button_unchecked'}
                         </span>
                         <span className="leading-snug">{req.text}</span>
                       </li>
                     ))}
                   </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
