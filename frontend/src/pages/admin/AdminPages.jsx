import { customAlert, customConfirm } from '../../components/common/popupService';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminSidebar from '../../components/layout/AdminSidebar';
import api, { authAPI, BASE_URL, getToken } from '../../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProfileImageCropper from '../../components/common/ProfileImageCropper';

const ITEMS_PER_PAGE = 5;

// shared reusable Password field with visibility toggle
function PasswordField({ label, value, onChange, placeholder, show, onToggle, required = true }) {
  return (
    <div className="relative">
      <label className="block text-sm font-bold text-slate-700 mb-2 tracking-wide uppercase tracking-widest text-[10px]">{label}</label>
      <div className="relative">
        <input
          required={required}
          value={value}
          onChange={onChange}
          className="w-full px-5 py-4 pr-12 rounded-2xl border-2 border-primary/10 bg-surface-bright shadow-sm focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-800 placeholder:text-slate-400 font-medium"
          placeholder={placeholder}
          type={show ? 'text' : 'password'}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all outline-none"
        >
          <span className="material-symbols-outlined text-[20px]">{show ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
    </div>
  );
}

// Shared reusable Pagination component
function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div className="px-6 py-4 flex items-center justify-between border-t border-outline-variant">
      <p className="text-xs text-slate-500">Page {current} of {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface transition-all disabled:opacity-40">
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        {Array.from({ length: total }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onChange(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${p === current ? 'bg-primary text-white' : 'hover:bg-surface border border-outline-variant'}`}>{p}</button>
        ))}
        <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total} className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface transition-all disabled:opacity-40">
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

// Reusable Admin page shell
function AdminPage({ title, subtitle, children }) {
  return (
    <DashboardLayout sidebar={AdminSidebar} title={title}>
      <div className="mb-8">
        <p className="text-primary font-bold tracking-widest text-xs uppercase mb-1">{subtitle}</p>
        <h2 className="text-3xl font-black text-on-surface -tracking-tight">{title}</h2>
      </div>
      {children}
    </DashboardLayout>
  );
}

// ─── User Management ─────────────────────────────────────────────────
export function UserManagement() {
  const [users, setUsers] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [editingUser, setEditingUser] = React.useState(null);
  const [overview, setOverview] = React.useState(null);
  const [searchInput, setSearchInput] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const debounceRef = React.useRef(null);

  const loadUsers = React.useCallback(async () => {
    try {
      const params = {
        page: currentPage,
        page_size: ITEMS_PER_PAGE,
        role: 'user',
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      const data = await api.admin.users(params);

      setUsers(data.items || []);
      setTotalPages(
        Math.ceil((data.total || 1) / ITEMS_PER_PAGE)
      );
    } catch (error) {
      console.error('Failed to load users', error);
    }
  }, [currentPage, searchTerm]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  React.useEffect(() => {
    api.admin.getOverview().then(setOverview).catch(() => {});
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(val);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 400);
  };


  const toggleActive = async (user) => {
    try {
      if (user.is_active) {
        await api.admin.blockUser(user.id);
      } else {
        await api.admin.unblockUser(user.id);
      }
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (user) => {
    if (await customConfirm(`Are you sure you want to delete user ${user.full_name}?`)) {
      try {
        await api.admin.deleteUser(user.id);
        loadUsers();
      } catch (error) {
        console.error("Delete failed", error);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.admin.updateUser(editingUser.id, editingUser);
      loadUsers();
      setEditingUser(null);
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const navigate = useNavigate();

  return (
    <AdminPage title="User Management" subtitle="Administration">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Users', value: overview ? overview.total_users.toLocaleString() : '—', icon: 'group' },
          { label: 'Active Users', value: overview ? overview.active_users.toLocaleString() : '—', icon: 'person' },
          { label: 'Suspended Users', value: overview ? overview.suspended_users.toLocaleString() : '—', icon: 'person_off' },
          { label: 'New Registrations', value: 'Recent', icon: 'person_add' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary-container rounded-xl text-primary"><span className="material-symbols-outlined">{s.icon}</span></div>
            </div>
            <p className="text-on-surface-variant text-sm font-semibold uppercase tracking-wide">{s.label}</p>
            <h3 className="text-3xl font-black text-on-surface mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface">All Users</h3>
          <div className="flex gap-3">
            <input
              placeholder="Search users..."
              value={searchInput}
              onChange={handleSearchChange}
              className="px-4 py-2 rounded-xl border border-outline-variant text-sm focus:ring-2 focus:ring-primary/20 w-64"
            />
            <button onClick={() => navigate('/admin/add-user')} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span> Add User
            </button>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-surface text-primary text-[10px] uppercase tracking-widest font-black">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4">Active</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-primary font-bold text-sm">{(u.full_name || '?')[0]}</div>
                    <div>
                      <p className="font-bold text-on-surface text-sm">{u.full_name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">{u.role}</td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.is_active ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-slate-400">{new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-6 py-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={u.is_active} onChange={() => toggleActive(u)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </td>
                <td className="px-6 py-5">
                  <div className="flex gap-2">
                    <button onClick={() => setEditingUser(u)} className="p-2 hover:bg-surface rounded-lg transition-all text-slate-400 hover:text-primary">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(u)} className="p-2 hover:bg-surface rounded-lg transition-all text-slate-400 hover:text-error">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination current={currentPage} total={totalPages} onChange={setCurrentPage} />
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
            <h3 className="text-2xl font-black text-on-surface mb-6">Edit User</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">Name</label>
                <input required value={editingUser.full_name || ''} onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-surface-bright focus:bg-white focus:border-primary transition-all text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">Email</label>
                <input required type="email" value={editingUser.email} disabled className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-slate-100 text-slate-500 cursor-not-allowed transition-all text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">Phone</label>
                <input type="number" value={editingUser.phone || ''} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-surface-bright focus:bg-white focus:border-primary transition-all text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">Role</label>
                <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-surface-bright focus:bg-white focus:border-primary transition-all text-sm font-medium">
                  <option value="user">User</option>
                  <option value="collector">Collector</option>
                  <option value="recycler">Recycler</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

// ─── Collector Management ─────────────────────────────────────────────
export function CollectorManagement() {
  const [collectors, setCollectors] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [editingCollector, setEditingCollector] = React.useState(null);
  const [overview, setOverview] = React.useState(null);

  const loadCollectors = React.useCallback(async () => {
    try {
      const data = await api.admin.users({
        role: 'collector',
        page: currentPage,
        page_size: ITEMS_PER_PAGE,
      });

      setCollectors(data.items || []);
      setTotalPages(
        Math.ceil((data.total || 1) / ITEMS_PER_PAGE)
      );
    } catch (error) {
      console.error('Failed to load collectors', error);
    }
  }, [currentPage]);

  React.useEffect(() => {
    loadCollectors();
  }, [loadCollectors]);

  React.useEffect(() => {
    api.admin.getOverview().then(setOverview).catch(() => {});
  }, []);

  const toggleActive = async (col) => {
    try {
      if (col.is_active) {
        await api.admin.blockUser(col.id);
      } else {
        await api.admin.unblockUser(col.id);
      }
      loadCollectors();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (collector) => {
    if (await customConfirm(`Are you sure you want to delete collector ${collector.full_name}?`)) {
      try {
        await api.admin.deleteCollector(collector.id);
        loadCollectors();
      } catch (error) {
        console.error("Delete failed", error);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.admin.updateCollector(editingCollector.id, editingCollector);
      loadCollectors();
      setEditingCollector(null);
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const navigate = useNavigate();

  return (
    <AdminPage title="Collector Management" subtitle="Operations">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Collectors', value: overview ? overview.active_collectors.toLocaleString() : '—', icon: 'local_shipping' },
          { label: 'Total Pickups', value: overview ? overview.total_pickups.toLocaleString() : '—', icon: 'schedule' },
          { label: 'Completed', value: overview ? overview.completed_pickups.toLocaleString() : '—', icon: 'check_circle' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
            <div className="p-3 bg-primary-container rounded-xl text-primary w-fit mb-4"><span className="material-symbols-outlined">{s.icon}</span></div>
            <p className="text-sm text-slate-500 font-semibold uppercase">{s.label}</p>
            <p className="text-3xl font-black text-on-surface mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface">All Collectors</h3>
          <button onClick={() => navigate('/admin/add-collector')} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span> Add Collector
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-surface text-primary text-[10px] uppercase tracking-widest font-black">
            <tr>
              <th className="px-6 py-4">Collector</th>
              <th className="px-6 py-4">Zone</th>
              <th className="px-6 py-4">Today's Pickups</th>
              <th className="px-6 py-4">Rating</th>
              <th className="px-6 py-4">Active</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {collectors.map((c) => (
              <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center text-primary font-bold">{(c.full_name || '?')[0]}</div>
                    <div>
                      <p className="font-bold text-on-surface">{c.full_name}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-500">{c.address || 'N/A'}</td>
                <td className="px-6 py-5 text-sm text-slate-600">--</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-sm font-bold">--</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={c.is_active} onChange={() => toggleActive(c)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </td>
                <td className="px-6 py-5">
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCollector(c)} className="p-2 hover:bg-surface rounded-lg text-slate-400 hover:text-primary transition-all"><span className="material-symbols-outlined text-sm">edit</span></button>
                    <button onClick={() => handleDelete(c)} className="p-2 hover:bg-surface rounded-lg text-slate-400 hover:text-error transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination current={currentPage} total={totalPages} onChange={setCurrentPage} />
      </div>

      {/* Edit Collector Modal */}
      {editingCollector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
            <h3 className="text-2xl font-black text-on-surface mb-6">Edit Collector</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">Name</label>
                <input required value={editingCollector.full_name || ''} onChange={e => setEditingCollector({ ...editingCollector, full_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-surface-bright focus:bg-white focus:border-primary transition-all text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">Email</label>
                <input required type="email" value={editingCollector.email || ''} disabled className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-slate-100 text-slate-500 cursor-not-allowed transition-all text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">Phone</label>
                <input type="number" value={editingCollector.phone || ''} onChange={e => setEditingCollector({ ...editingCollector, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-surface-bright focus:bg-white focus:border-primary transition-all text-sm font-medium" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingCollector(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

// ─── Waste Assignment Module ──────────────────────────────────────────
export function WasteAssignment() {
  const [selectedRequest, setSelectedRequest] = React.useState(null);
  const [assignedCollector, setAssignedCollector] = React.useState(null);
  const [assignedRecycler, setAssignedRecycler] = React.useState(null);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [wasteRequests, setWasteRequests] = React.useState([]);
  const [collectors, setCollectors] = React.useState([]);
  const [recyclers, setRecyclers] = React.useState([]);

  const loadData = async () => {
    try {
      const [reqData, colData, recData] = await Promise.all([
        api.admin.pickups({ status: 'PENDING' }),
        api.admin.users({ role: 'collector', is_active: true }),
        api.admin.users({ role: 'recycler', is_active: true })
      ]);
      setWasteRequests(reqData.items || []);
      setCollectors((colData.items || []).filter(c => c.is_available !== false));
      setRecyclers(recData.items || []);
    } catch (error) {
      console.error("Failed to load assignment data", error);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleAssign = async () => {
    if (!selectedRequest || !assignedCollector || !assignedRecycler) return;
    try {
      await api.admin.assignPickup(selectedRequest.id, { 
        collector_id: assignedCollector.id,
        recycler_id: assignedRecycler.id
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedRequest(null);
        setAssignedCollector(null);
        setAssignedRecycler(null);
        loadData();
      }, 3000);
    } catch (error) {
      console.error("Failed to assign collector", error);
      customAlert(error.message || 'Failed to assign');
    }
  };

  return (
    <AdminPage title="Waste Assignment" subtitle="Admin Operations">
      {showSuccess && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-700">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <p className="text-sm font-bold">Collector and Recycler assigned successfully! The logistics chain is now active.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* E-Waste Requests */}
        <div className="lg:col-span-7">
          <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-primary rounded-full"></span>
            All Uploaded E-Waste Requests
          </h3>
          <div className="space-y-4">
            {wasteRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => { setSelectedRequest(req); setAssignedCollector(null); setAssignedRecycler(null); }}
                className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md ${selectedRequest?.id === req.id ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-outline-variant'
                  }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-primary">#{req.id}</span>
                      {selectedRequest?.id === req.id && (
                        <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded-full uppercase">Selected</span>
                      )}
                    </div>
                    <p className="font-bold text-on-surface">Pickup Request</p>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase">Unassigned</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-sm text-primary">person</span>
                    User #{req.user_id}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-sm text-primary">scale</span>
                    {req.waste?.estimated_weight ? `${req.waste.estimated_weight} kg` : 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-sm text-primary">payments</span>
                    {req.waste?.estimated_price ? `₹${req.waste.estimated_price.toLocaleString()}` : <span className="text-slate-400 italic text-[10px]">Pending AI Assessment</span>}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 col-span-2">
                    <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                    {req.address}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                    {req.pickup_date ? new Date(req.pickup_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-sm text-primary">info</span>
                    {req.notes || 'No notes'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collector Selection Panel */}
        <div className="lg:col-span-5">
          <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-primary rounded-full"></span>
            {selectedRequest ? `Assign Collector for ${selectedRequest.id}` : 'Select a Request First'}
          </h3>

          {!selectedRequest ? (
            <div className="bg-white rounded-2xl border border-dashed border-primary/30 p-12 text-center">
              <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-2xl">assignment_ind</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Click on a waste request on the left to view available collectors.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Request Summary */}
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 mb-2">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Selected Request</p>
                <p className="font-bold text-on-surface">#{selectedRequest.id}</p>
                <p className="text-sm text-slate-500">{selectedRequest.address}</p>
              </div>

              {collectors.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setAssignedCollector(col)}
                  className={`bg-white rounded-2xl p-5 border transition-all ${
                      assignedCollector?.id === col.id ? 'border-primary shadow-md ring-2 ring-primary/20 cursor-pointer' :
                        'border-outline-variant hover:border-primary/40 hover:shadow-sm cursor-pointer'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg bg-primary`}>
                        {col.full_name ? col.full_name[0] : '?'}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{col.full_name}</p>
                        <p className="text-xs text-slate-400">{col.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-700`}>
                        Available
                      </span>
                      {assignedCollector?.id === col.id && (
                        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mt-6 mb-3">Select Target Recycler</h4>
              <div className="grid grid-cols-1 gap-3">
                {recyclers.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => setAssignedRecycler(rec)}
                    className={`bg-white rounded-2xl p-4 border transition-all ${
                        assignedRecycler?.id === rec.id ? 'border-teal-500 shadow-md ring-2 ring-teal-500/20 cursor-pointer' :
                          'border-outline-variant hover:border-teal-500/40 hover:shadow-sm cursor-pointer'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black bg-teal-500">
                          {rec.full_name ? rec.full_name[0] : 'R'}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{rec.full_name}</p>
                          <p className="text-[10px] text-slate-400">Authorized Partner</p>
                        </div>
                      </div>
                      {assignedRecycler?.id === rec.id && (
                        <span className="material-symbols-outlined text-teal-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAssign}
                disabled={!assignedCollector || !assignedRecycler}
                className="w-full mt-6 py-4 bg-primary text-white rounded-xl font-bold text-base shadow-xl shadow-primary/20 hover:shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="material-symbols-outlined">assignment_ind</span>
                Finalize Assignment
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  );
}

export function AddUser() {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'user', pass: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.pass !== form.confirm) return;
    try {
      await api.admin.createUser({
        full_name: form.name,
        email: form.email,
        password: form.pass,
        role: form.role
      });
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/admin/user-management');
      }, 2000);
    } catch (err) {
      console.error(err);
      customAlert(err.message || 'Failed to create user');
    }
  };

  return (
    <AdminPage title="Add User" subtitle="Administration">
      <div className="max-w-7xl pb-12 mx-auto sm:mx-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-primary/5 border border-primary/10 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

              {showSuccess && (
                <div className="mb-8 flex items-center gap-4 p-5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-800 animate-fade-in shadow-sm">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-teal-600 shrink-0">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">User Added Successfully!</p>
                    <p className="text-xs mt-0.5 opacity-80">Redirecting back to management...</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 tracking-wide uppercase tracking-widest text-[10px]">Full Name</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-5 py-4 rounded-2xl border-2 border-primary/10 bg-surface-bright shadow-sm focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-800 placeholder:text-slate-400 font-medium" placeholder="Enter full name" type="text" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 tracking-wide uppercase tracking-widest text-[10px]">Email Address</label>
                    <input required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-5 py-4 rounded-2xl border-2 border-primary/10 bg-surface-bright shadow-sm focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-800 placeholder:text-slate-400 font-medium" placeholder="example@renewgrid.com" type="email" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <PasswordField
                      label="Password"
                      placeholder="••••••••"
                      value={form.pass}
                      onChange={(e) => setForm({ ...form, pass: e.target.value })}
                      show={showPass}
                      onToggle={() => setShowPass(!showPass)}
                    />
                    <PasswordField
                      label="Confirm Password"
                      placeholder="••••••••"
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      show={showConfirm}
                      onToggle={() => setShowConfirm(!showConfirm)}
                    />
                  </div>
                  {form.confirm && form.pass !== form.confirm && (
                    <p className="text-xs font-bold text-error flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span> Passwords do not match</p>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
                  <button type="button" onClick={() => navigate('/admin/user-management')} className="w-full sm:w-auto px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all text-center">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-white text-lg rounded-2xl font-black tracking-wide shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined text-[22px]">person_add</span>
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 h-full">
            <div className="bg-gradient-to-br from-primary to-teal-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-center">
              <span className="material-symbols-outlined absolute -right-4 -top-4 text-[150px] text-white/5 pointer-events-none rotate-12">group</span>

              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-white text-2xl">person_add</span>
                </div>

                <h3 className="text-2xl font-black mb-6 tracking-tight drop-shadow-sm">Create New Account</h3>
                <p className="text-white/70 mb-8 font-medium leading-relaxed">Add new users or collectors to the system manually. They will receive an email to verify their account.</p>

                <div className="bg-black/20 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/70 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Role Information
                  </h4>
                  <ul className="space-y-3">
                    {[
                      'Users can request pickups and track history',
                      'Collectors are assigned routes and handle logistics',
                      'Recyclers process the collected e-waste'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white/90">
                        <span className="material-symbols-outlined text-[16px] mt-0.5 text-teal-400">info</span>
                        <span className="leading-snug font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

// ─── Add Collector ───────────────────────────────────────────────────
export function AddCollector() {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', pass: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.pass !== form.confirm) return;
    try {
      await api.admin.createUser({
        full_name: form.name,
        email: form.email,
        password: form.pass,
        role: 'collector'
      });
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/admin/collector-management');
      }, 2000);
    } catch (err) {
      console.error(err);
      customAlert(err.message || 'Failed to create collector');
    }
  };

  return (
    <AdminPage title="Add Collector" subtitle="Operations">
      <div className="max-w-7xl pb-12 mx-auto sm:mx-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-primary/5 border border-primary/10 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

              {showSuccess && (
                <div className="mb-8 flex items-center gap-4 p-5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-800 animate-fade-in shadow-sm">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-teal-600 shrink-0">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">Collector Added Successfully!</p>
                    <p className="text-xs mt-0.5 opacity-80">Redirecting back to management...</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 tracking-wide uppercase tracking-widest text-[10px]">Full Name</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-5 py-4 rounded-2xl border-2 border-primary/10 bg-surface-bright shadow-sm focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-800 placeholder:text-slate-400 font-medium" placeholder="Enter full name" type="text" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 tracking-wide uppercase tracking-widest text-[10px]">Email Address</label>
                    <input required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-5 py-4 rounded-2xl border-2 border-primary/10 bg-surface-bright shadow-sm focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-800 placeholder:text-slate-400 font-medium" placeholder="collector@renewgrid.com" type="email" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <PasswordField
                      label="Password"
                      placeholder="••••••••"
                      value={form.pass}
                      onChange={(e) => setForm({ ...form, pass: e.target.value })}
                      show={showPass}
                      onToggle={() => setShowPass(!showPass)}
                    />
                    <PasswordField
                      label="Confirm Password"
                      placeholder="••••••••"
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      show={showConfirm}
                      onToggle={() => setShowConfirm(!showConfirm)}
                    />
                  </div>
                  {form.confirm && form.pass !== form.confirm && (
                    <p className="text-xs font-bold text-error flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span> Passwords do not match</p>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
                  <button type="button" onClick={() => navigate('/admin/collector-management')} className="w-full sm:w-auto px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all text-center">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-white text-lg rounded-2xl font-black tracking-wide shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined text-[22px]">person_add</span>
                    Create Collector
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 h-full">
            <div className="bg-gradient-to-br from-primary to-teal-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-center">
              <span className="material-symbols-outlined absolute -right-4 -top-4 text-[150px] text-white/5 pointer-events-none rotate-12">local_shipping</span>

              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-white text-2xl">person_add</span>
                </div>

                <h3 className="text-2xl font-black mb-6 tracking-tight drop-shadow-sm">Join the Logistics Network</h3>
                <p className="text-white/70 mb-8 font-medium leading-relaxed">As a collector, you'll be responsible for picking up waste from users and delivering it to authorized recycling centers.</p>

                <div className="bg-black/20 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/70 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Collector Benefits
                  </h4>
                  <ul className="space-y-3">
                    {[
                      'Automated pick-up scheduling',
                      'Digital proof of delivery',
                      'Real-time route optimization',
                      'Performance-based incentives'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white/90">
                        <span className="material-symbols-outlined text-[16px] mt-0.5 text-teal-400">check_circle</span>
                        <span className="leading-snug font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

// ─── All other Admin pages unchanged below ────────────────────────────

export function RecyclerApproval() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await api.admin.users({ role: 'recycler', page_size: 100 });
      const items = (data.items || []).map(u => ({
        id: u.id,
        name: u.full_name || u.email,
        email: u.email,
        created_at: u.created_at,
        status: u.is_active ? 'Approved' : 'Pending',
      }));
      setApplications(items);
    } catch (err) {
      console.error('Failed to load recycler applications', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadApplications(); }, []);

  const pendingCount   = applications.filter(a => a.status === 'Pending').length;
  const approvedCount  = applications.filter(a => a.status === 'Approved').length;

  const handleApprove = async (app) => {
    if (!await customConfirm(`Approve ${app.name}?`)) return;
    try {
      await api.admin.updateRecyclerStatus(app.id, { status: 'approved' });
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'Approved' } : a));
    } catch (err) { customAlert(err.message || 'Failed to approve'); }
  };

  const handleReject = async (app) => {
    if (!await customConfirm(`Permanently delete/reject application for ${app.name}?`)) return;
    try {
      // For rejected recyclers, we now use hard-delete as per production requirements
      await api.admin.deleteUser(app.id);
      setApplications(prev => prev.filter(a => a.id !== app.id));
      toast.success('Application rejected and user removed.');
    } catch (err) { customAlert(err.message || 'Failed to reject'); }
  };

  return (
    <AdminPage title="Recycler Approval" subtitle="Compliance">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Pending', value: pendingCount, icon: 'pending' },
          { label: 'Approved', value: approvedCount, icon: 'verified' },
          { label: 'Total', value: applications.length, icon: 'group' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
            <div className="p-3 bg-primary-container rounded-xl text-primary w-fit mb-4"><span className="material-symbols-outlined">{s.icon}</span></div>
            <p className="text-sm text-slate-500 font-semibold uppercase">{s.label}</p>
            <p className="text-3xl font-black text-on-surface mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-outline-variant"><h3 className="text-lg font-bold">Recycler Applications</h3></div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : (
        <div className="divide-y divide-outline-variant">
          {applications.map((app) => (
            <div key={app.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-surface/50 transition-all gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 shrink-0"><span className="material-symbols-outlined">business</span></div>
                <div>
                  <p className="font-bold text-on-surface">{app.name}</p>
                  <p className="text-xs text-slate-400">{app.email} — Registered {app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p>
                </div>
              </div>
              <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
                <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full ${
                  app.status === 'Approved' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                }`}>{app.status}</span>
                {app.status === 'Pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(app)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:scale-[1.02] transition-all flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check</span> Approve
                    </button>
                    <button onClick={() => handleReject(app)} className="px-4 py-2 bg-white border-2 border-red-100 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-all flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">close</span> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {applications.length === 0 && <div className="p-8 text-center text-slate-500 font-bold">No recycler accounts found.</div>}
        </div>
        )}
      </div>
    </AdminPage>
  );
}

export function WasteAnalytics() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.admin.getAnalytics()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalKg = data ? data.total_waste_collected_kg : 0;
  const categories = data ? Object.entries(data.waste_by_category || {}) : [];
  const totalCat = categories.reduce((s, [, v]) => s + v, 0) || 1;
  const byStatus = data ? (data.pickups_by_status || {}) : {};
  const totalPickups = Object.values(byStatus).reduce((s, v) => s + v, 0);
  const completedPickups = byStatus['COMPLETED'] || 0;
  const recoveryRate = totalPickups > 0 ? `${Math.round((completedPickups / totalPickups) * 100)}%` : '0%';
  const monthlyTrend = data?.pickups_by_month || [];
  const maxMonthly = Math.max(...monthlyTrend.map(m => m.count || 0), 1);

  if (loading) {
    return (
      <AdminPage title="Waste Analytics" subtitle="Insights">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminPage>
    );
  }

  const statCards = [
    { label: 'Total Collected', value: `${totalKg.toLocaleString()} kg`, icon: 'scale', desc: 'Total e-waste weight completed' },
    { label: 'Total Pickups', value: (data?.total_pickups || 0).toLocaleString(), icon: 'local_shipping', desc: 'Total pickup requests logged' },
    { label: 'Recovery Rate', value: recoveryRate, icon: 'trending_up', desc: 'Completed pickups vs total' },
    { label: 'Waste Categories', value: categories.length.toString(), icon: 'category', desc: 'Unique electronic segments' }
  ];

  return (
    <AdminPage title="Waste Analytics" subtitle="Insights">
      {/* Grid of Waste Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="p-3 bg-primary-container text-primary rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{s.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{s.value}</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-2 font-medium">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Card: Waste by Category */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Waste by Category</h3>
              <p className="text-xs text-slate-400 mt-0.5">Physical breakdown contribution per electronic type</p>
            </div>
            <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-xl">pie_chart</span>
          </div>
          <div className="space-y-5">
            {categories.length === 0 ? (
              <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-slate-400 text-sm">No categorical e-waste data yet.</p>
              </div>
            ) : (
              categories.map(([cat, count], i) => {
                const pct = Math.round((count / totalCat) * 100);
                const colors = [
                  'from-primary to-primary-container',
                  'from-teal-500 to-cyan-500',
                  'from-indigo-500 to-violet-500',
                  'from-amber-500 to-orange-500',
                  'from-slate-500 to-slate-700'
                ];
                const activeColor = colors[i % colors.length];

                return (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-700 group-hover:text-primary transition-colors">{cat}</span>
                      <span className="text-slate-900">{count.toLocaleString()} uploaded ({pct}%)</span>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                      <div 
                        className={`h-full bg-gradient-to-r ${activeColor} rounded-full transition-all duration-1000`} 
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Card: Monthly Trends */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Monthly Trends</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total e-waste pickup requests completed per month</p>
            </div>
            <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-xl">bar_chart</span>
          </div>
          {monthlyTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-slate-400 text-sm">No monthly trend data yet.</p>
            </div>
          ) : (
            <div className="flex items-end gap-3 h-48 pt-6">
              {monthlyTrend.map((m, i) => {
                const pct = Math.round(((m.count || 0) / maxMonthly) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-full bg-slate-50 rounded-t-xl relative h-36 overflow-visible flex items-end">
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md whitespace-nowrap z-20">
                        {m.count} Pickup{m.count !== 1 ? 's' : ''}
                      </div>
                      <div 
                        className="w-full bg-gradient-to-t from-primary to-primary-container rounded-t-xl group-hover:brightness-105 transition-all duration-300 shadow-sm" 
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{m.month?.slice(5) || ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  );
}

export function RevenueTracking() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  React.useEffect(() => {
    setLoading(true);
    api.admin.getPayments(page, PAGE_SIZE)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const payments = data?.items || [];
  const total = data?.total || 0;
  const totalAmount = data?.total_amount || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminPage title="Revenue Tracking" subtitle="Financial">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Payments Received', value: `₹${totalAmount.toLocaleString()}`, icon: 'payments', color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Total Transactions', value: total.toLocaleString(), icon: 'receipt_long', color: 'text-primary', bg: 'bg-primary-container' },
          { label: 'Avg. Payment', value: total > 0 ? `₹${(totalAmount / total).toFixed(2)}` : '—', icon: 'trending_up', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-lg transition-all">
            <div className={`p-3 ${s.bg} rounded-xl ${s.color} w-fit mb-4`}><span className="material-symbols-outlined">{s.icon}</span></div>
            <p className="text-sm text-slate-500 font-semibold uppercase">{s.label}</p>
            <h3 className="text-3xl font-black text-on-surface mt-1">{loading ? '—' : s.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-outline-variant">
          <h3 className="text-lg font-bold text-on-surface">Recycler Payment Transactions</h3>
          <p className="text-xs text-slate-400 mt-1">Payments sent by recyclers to users upon processing their e-waste</p>
        </div>
        <table className="w-full text-left">
          <thead className="bg-surface text-primary text-[10px] uppercase tracking-widest font-black">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Recycler</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4">Pickup</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No payment transactions yet.</td></tr>
            ) : payments.map((p, i) => (
              <tr key={i} className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5 text-sm text-slate-400">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-black">{(p.recycler_name || 'R')[0]}</div>
                    <span className="text-sm font-bold text-on-surface">{p.recycler_name}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">{p.user_name}</td>
                <td className="px-6 py-5 text-sm text-slate-600">{p.waste_item}</td>
                <td className="px-6 py-5 text-sm font-bold text-primary">#{p.pickup_id}</td>
                <td className="px-6 py-5 text-right">
                  <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-black">₹{p.amount.toFixed(2)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination current={page} total={totalPages} onChange={setPage} />
      </div>
    </AdminPage>
  );
}

// ─── Assign Reward Points ────────────────────────────────────────────────────
export function AssignRewardPoints() {
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [assigning, setAssigning] = React.useState(null);
  const [form, setForm] = React.useState({ points: '', co2_saved_kg: '' });
  const [success, setSuccess] = React.useState(null);
  const PAGE_SIZE = 10;

  const loadJobs = React.useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.admin.getCompletedJobs(
        page,
        PAGE_SIZE
      );

      setJobs(data.items || []);
      setTotalPages(
        Math.ceil((data.total || 1) / PAGE_SIZE)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assigning) return;
    const pts = parseInt(form.points);
    if (!pts || pts <= 0) return customAlert('Enter a valid points value.');
    try {
      await api.admin.assignRewardPoints({
        pickup_id: assigning.pickup_id,
        user_id: assigning.user_id,
        points: pts,
        co2_saved_kg: parseFloat(form.co2_saved_kg) || 0,
      });
      setSuccess(`✓ ${pts} points assigned to ${assigning.user_name} for Pickup #${assigning.pickup_id}`);
      setAssigning(null);
      setForm({ points: '', co2_saved_kg: '' });
      loadJobs();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) { customAlert(err.message || 'Failed to assign points'); }
  };

  return (
    <AdminPage title="Assign Reward Points" subtitle="Rewards">
      {success && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-700 animate-fade-in">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <p className="text-sm font-bold">{success}</p>
        </div>
      )}
      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-outline-variant">
          <h3 className="text-lg font-bold text-on-surface">Completed Jobs — Pending Reward Assignment</h3>
          <p className="text-xs text-slate-400 mt-1">Select a job to assign reward points to the user</p>
        </div>
        <table className="w-full text-left">
          <thead className="bg-surface text-primary text-[10px] uppercase tracking-widest font-black">
            <tr>
              <th className="px-6 py-4">Pickup</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Item / Category</th>
              <th className="px-6 py-4">Weight</th>
              <th className="px-6 py-4">Valuation</th>
              <th className="px-6 py-4">Completed</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading ? (
              <tr><td colSpan="8" className="p-8 text-center text-slate-400">Loading...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan="8" className="p-8 text-center text-slate-400 font-bold">No completed jobs yet.</td></tr>
            ) : jobs.map((j, i) => (
              <tr key={i} className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5 font-bold text-primary">#{j.pickup_id}</td>
                <td className="px-6 py-5 text-sm text-on-surface font-semibold">{j.user_name}</td>
                <td className="px-6 py-5">
                  <p className="text-sm font-bold text-on-surface">{j.waste_item}</p>
                  <p className="text-xs text-slate-400">{j.category}</p>
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">{j.weight_kg ? `${j.weight_kg} kg` : 'N/A'}</td>
                <td className="px-6 py-5 text-sm font-bold text-primary">{j.final_price ? `₹${j.final_price.toLocaleString()}` : <span className="text-slate-400 italic font-normal text-[10px]">Pending AI Assessment</span>}</td>
                <td className="px-6 py-5 text-sm text-slate-400">{j.completed_at ? new Date(j.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    j.reward_assigned ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                  }`}>{j.reward_assigned ? 'Rewarded' : 'Pending'}</span>
                </td>
                <td className="px-6 py-5">
                  {j.reward_assigned ? (
                    <span className="text-xs text-slate-400 font-bold">Done</span>
                  ) : (
                    <button
                      onClick={() => { setAssigning(j); setForm({ points: (j.estimated_credit_points || Math.round((j.weight_kg || 1) * 10)).toString(), co2_saved_kg: (j.estimated_co2_saved || ((j.weight_kg || 1) * 0.5)).toFixed(2) }); }}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:scale-[1.02] transition-all"
                    >
                      Assign Points
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination current={page} total={totalPages} onChange={setPage} />
      </div>

      {/* Assign Modal */}
      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black text-on-surface mb-2">Assign Reward Points</h3>
            <p className="text-sm text-slate-400 mb-6">Pickup #{assigning.pickup_id} — {assigning.user_name}</p>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">Reward Points</label>
                <input required type="number" min="1" value={form.points} onChange={e => setForm({...form, points: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-surface-bright focus:bg-white focus:border-primary transition-all text-sm font-medium" placeholder="e.g. 150" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">CO₂ Saved (kg)</label>
                <input type="number" min="0" step="0.1" value={form.co2_saved_kg} onChange={e => setForm({...form, co2_saved_kg: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-surface-bright focus:bg-white focus:border-primary transition-all text-sm font-medium" placeholder="e.g. 5.0" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setAssigning(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">Assign Points</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
export function CO2Analytics() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.admin.getAnalytics()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const co2 = data ? data.total_co2_saved_kg : 0;
  const trees = co2 > 0 ? Math.round(co2 / 20) : 0;
  const energy = data ? data.energy_saved_kwh : 0;
  const diversion = data ? data.landfill_diversion_rate : 0;
  const pickupsToday = data ? data.pickups_today : 0;

  const co2ByMonth = data?.co2_by_month || [];
  const maxCo2Month = Math.max(...co2ByMonth.map(m => m.co2 || 0), 1);

  const co2ByCategory = data ? Object.entries(data.co2_by_category || {}) : [];
  const totalCo2Category = co2ByCategory.reduce((sum, [, v]) => sum + v, 0) || 1;

  if (loading) {
    return (
      <AdminPage title="CO2 Analytics" subtitle="Environmental Impact">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminPage>
    );
  }

  const cards = [
    {
      label: 'Total CO₂ Saved',
      value: `${co2.toLocaleString()} kg`,
      icon: 'eco',
      gradient: 'from-emerald-500 to-teal-600',
      description: 'Carbon dioxide emissions avoided'
    },
    {
      label: 'Reforestation Impact',
      value: `${trees.toLocaleString()} Trees`,
      icon: 'park',
      gradient: 'from-teal-500 to-green-600',
      description: 'Equivalent to planting seedlings'
    },
    {
      label: 'Energy Conservation',
      value: `${energy.toLocaleString()} kWh`,
      icon: 'bolt',
      gradient: 'from-amber-500 to-orange-600',
      description: 'Power offset equivalent'
    },
    {
      label: 'Landfill Diversion Rate',
      value: `${diversion}%`,
      icon: 'recycling',
      gradient: 'from-indigo-500 to-purple-600',
      description: 'Diverted from waste deposits'
    },
    {
      label: 'Pickups Managed Today',
      value: pickupsToday.toLocaleString(),
      icon: 'calendar_today',
      gradient: 'from-sky-500 to-blue-600',
      description: 'E-waste uploads handled today'
    }
  ];

  return (
    <AdminPage title="CO2 Analytics" subtitle="Environmental Impact">
      {/* Premium Dashboard Headline / Subcard */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-8 mb-8 relative overflow-hidden shadow-xl border border-white/10 hover:shadow-2xl transition-all duration-300">
        <div className="absolute right-0 top-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="bg-primary/20 text-primary-container px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-primary/30">System Carbon Metrics</span>
            <h3 className="text-3xl font-black mt-3 leading-tight">Environmental Offset Ledger</h3>
            <p className="text-slate-400 mt-2 text-sm max-w-xl">
              Track carbon footprint reductions, power savings, and reforestation equivalency indices generated through completed e-waste processing.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-5 rounded-2xl border border-white/10">
            <span className="material-symbols-outlined text-4xl text-teal-400 animate-pulse">energy_savings_leaf</span>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Offset Factor</p>
              <p className="text-2xl font-black text-white">0.5 kg/kg</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Environmental Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {cards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className={`p-3 bg-gradient-to-br ${s.gradient} text-white rounded-xl w-fit mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{s.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{s.value}</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-2 font-medium">{s.description}</p>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Offsets Monthly Trend (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-8 shadow-sm border border-outline-variant flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Carbon Offsets Monthly Trend</h3>
                <p className="text-xs text-slate-400 mt-0.5">CO₂ saved (kg) per month over the last year</p>
              </div>
              <span className="material-symbols-outlined text-teal-500 bg-teal-50 p-2 rounded-xl">bar_chart</span>
            </div>
            {co2ByMonth.length === 0 ? (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-slate-400 text-sm">No monthly trend data yet.</p>
              </div>
            ) : (
              <div className="flex items-end gap-3 h-64 pt-6">
                {co2ByMonth.map((m, i) => {
                  const pct = Math.round(((m.co2 || 0) / maxCo2Month) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-full bg-slate-50 rounded-t-xl relative h-48 overflow-visible flex items-end">
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md whitespace-nowrap z-20">
                          {m.co2.toLocaleString()} kg
                        </div>
                        <div 
                          className="w-full bg-gradient-to-t from-teal-600 to-emerald-400 rounded-t-xl group-hover:brightness-105 transition-all duration-300 shadow-sm" 
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{m.month?.slice(5) || ''}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Reduction by Category (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Carbon Reduction by Category</h3>
              <p className="text-xs text-slate-400 mt-0.5">Categorized breakdown of CO₂ saved</p>
            </div>
            <span className="material-symbols-outlined text-emerald-500 bg-emerald-50 p-2 rounded-xl">pie_chart</span>
          </div>
          <div className="space-y-5">
            {co2ByCategory.length === 0 ? (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-slate-400 text-sm">No categorical offset data yet.</p>
              </div>
            ) : (
              co2ByCategory.map(([cat, amount], i) => {
                const pct = Math.round((amount / totalCo2Category) * 100);
                const colorGradients = [
                  'from-emerald-500 to-teal-600',
                  'from-teal-500 to-cyan-600',
                  'from-cyan-500 to-blue-600',
                  'from-indigo-500 to-violet-600',
                  'from-purple-500 to-pink-600',
                  'from-amber-500 to-orange-600',
                  'from-slate-500 to-slate-700'
                ];
                const activeGradient = colorGradients[i % colorGradients.length];

                return (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-700 group-hover:text-primary transition-colors">{cat}</span>
                      <span className="text-slate-900">{amount.toLocaleString()} kg ({pct}%)</span>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                      <div 
                        className={`h-full bg-gradient-to-r ${activeGradient} rounded-full transition-all duration-1000`} 
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

export function PickupStatistics() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.admin.getAnalytics()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminPage title="Pickup Statistics" subtitle="Operations">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminPage>
    );
  }

  const byStatus = data ? data.pickups_by_status : {};
  const total = Object.values(byStatus).reduce((s, v) => s + v, 0);
  const completed = byStatus['COMPLETED'] || 0;
  const successRate = total ? Math.round((completed / total) * 100) : 0;
  const monthlyTrend = data?.pickups_by_month || [];
  const maxMonthly = Math.max(...monthlyTrend.map(m => m.count || 0), 1);

  const statusColors = {
    COMPLETED: '#0d9488',   // Teal-600
    PROCESSING: '#3b82f6',  // Blue-500
    COLLECTED: '#6366f1',   // Indigo-500
    ASSIGNED: '#f59e0b',    // Amber-500
    PENDING: '#94a3b8',     // Slate-400
    CANCELLED: '#ef4444',    // Red-500
  };

  // Prepare donut chart segments
  const circumference = 2 * Math.PI * 30; // 188.495
  let accumulatedPercent = 0;
  const donutSegments = Object.entries(byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => {
      const pct = (count / total) * 100;
      const strokeLength = (count / total) * circumference;
      const strokeOffset = circumference - (accumulatedPercent / 100) * circumference;
      accumulatedPercent += pct;
      return {
        status,
        count,
        pct,
        color: statusColors[status] || '#326669',
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeOffset,
      };
    });

  const statCards = [
    { label: 'Total Pickups', value: total.toLocaleString(), icon: 'local_shipping', desc: 'All requests received', color: 'text-primary', bg: 'bg-primary-container' },
    { label: "Today's Requests", value: data ? data.pickups_today.toLocaleString() : '0', icon: 'today', desc: 'Logged today', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed Pickups', value: completed.toLocaleString(), icon: 'check_circle', desc: 'Successfully collected', color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Success Rate', value: `${successRate}%`, icon: 'trending_up', desc: 'Completion efficiency', color: 'text-indigo-600', bg: 'bg-indigo-50', hasGauge: true },
  ];

  return (
    <AdminPage title="Pickup Statistics" subtitle="Operations">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-between group">
            <div className="flex-1">
              <div className={`p-3 ${s.bg} ${s.color} rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{s.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{s.value}</h3>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">{s.desc}</p>
            </div>
            {s.hasGauge && (
              <div className="relative w-16 h-16 ml-3 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                  <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="4" fill="transparent" 
                    className="text-indigo-600 transition-all duration-1000"
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - successRate / 100)}
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-indigo-700">{successRate}%</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Status Distribution Donut Chart (Left) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Status Distribution</h3>
                <p className="text-xs text-slate-400 mt-0.5">E-waste pickups breakdown by current state</p>
              </div>
              <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-xl">donut_large</span>
            </div>

            {total === 0 ? (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-slate-400 text-sm">No status data available yet.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center py-4">
                <div className="relative w-40 h-40 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* Background Circle */}
                    <circle cx="50" cy="50" r="30" fill="transparent" stroke="#f8fafc" strokeWidth="10" />
                    {/* Colored segments */}
                    {donutSegments.map((seg, idx) => (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="30"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="10"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeOffset}
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-500 hover:stroke-[11px] cursor-pointer"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-850 tracking-tight">{total}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pickups</span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-2">
                  {Object.entries(byStatus).map(([status, count]) => {
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    const color = statusColors[status] || '#326669';
                    return (
                      <div key={status} className="flex items-center justify-between text-xs font-semibold py-1 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                          <span className="text-slate-600 uppercase text-[10px] tracking-wide">{status}</span>
                        </div>
                        <span className="text-slate-900 font-bold">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Pickup Trend Bar Chart (Right) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Monthly Volume Trends</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Monthly collection requests timeline</p>
              </div>
              <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-xl">show_chart</span>
            </div>

            {monthlyTrend.length === 0 ? (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-slate-400 text-sm">No trend data available yet.</p>
              </div>
            ) : (
              <div className="flex items-end gap-3 h-52 pt-8">
                {monthlyTrend.map((m, i) => {
                  const pct = Math.round(((m.count || 0) / maxMonthly) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-full bg-slate-50/50 rounded-t-xl relative h-40 overflow-visible flex items-end">
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md whitespace-nowrap z-20">
                          {m.count} Request{m.count !== 1 ? 's' : ''}
                        </div>
                        <div
                          className="w-full bg-gradient-to-t from-primary to-[#508a8d] rounded-t-xl group-hover:brightness-105 transition-all duration-500 shadow-sm"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{m.month?.slice(5) || ''}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

export function AreaAnalytics() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.admin.pickups({ page_size: 100 })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Aggregate pickups by area (address)
  const areaMap = {};
  let totalPickups = 0;
  (data?.items || []).forEach(p => {
    const area = p.address?.split(',').slice(-2, -1)[0]?.trim() || p.address || 'Unknown';
    areaMap[area] = (areaMap[area] || 0) + 1;
    totalPickups++;
  });

  const allAreas = Object.entries(areaMap).sort(([, a], [, b]) => b - a);
  const topAreas = allAreas.slice(0, 5);
  const totalAreas = allAreas.length;

  const maxAreaCount = topAreas[0] ? topAreas[0][1] : 1;

  if (loading) {
    return (
      <AdminPage title="Area Analytics" subtitle="Geographic Insights">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminPage>
    );
  }

  // Rank Styling helpers
  const getRankStyle = (index) => {
    switch (index) {
      case 0:
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: 'workspace_premium',
          color: 'text-amber-500',
          label: 'Gold Rank'
        };
      case 1:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: 'workspace_premium',
          color: 'text-slate-400',
          label: 'Silver Rank'
        };
      case 2:
        return {
          bg: 'bg-orange-100 text-orange-850 border-orange-200',
          icon: 'workspace_premium',
          color: 'text-orange-500',
          label: 'Bronze Rank'
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-600 border-slate-100',
          icon: 'location_on',
          color: 'text-primary/70',
          label: `Rank ${index + 1}`
        };
    }
  };

  return (
    <AdminPage title="Area Analytics" subtitle="Geographic Insights">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Monitored Zones', value: totalAreas, icon: 'map', desc: 'Unique sectors active', bg: 'bg-primary-container text-primary' },
          { label: 'Highest Volume Area', value: topAreas[0] ? topAreas[0][0] : 'N/A', icon: 'local_fire_department', desc: `${topAreas[0] ? topAreas[0][1] : 0} total requests`, bg: 'bg-amber-50 text-amber-600' },
          { label: 'Total Volume Represented', value: `${totalPickups} requests`, icon: 'database', desc: 'Analyzed coordinates data', bg: 'bg-teal-50 text-teal-600' }
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-all duration-300">
            <div className={`p-3 rounded-xl w-fit mb-3 ${s.bg}`}>
              <span className="material-symbols-outlined">{s.icon}</span>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
            <h3 className="text-xl font-black text-slate-805 mt-1 truncate">{s.value}</h3>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Top Areas Horizontal Bar Comparison (Left) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant lg:col-span-7">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Zone Performance Leaderboard</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Top collection points ranked by request volume</p>
            </div>
            <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-xl">leaderboard</span>
          </div>

          {topAreas.length === 0 ? (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-slate-400 text-sm">No geographic pickup data available yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {topAreas.map(([area, count], i) => {
                const rank = getRankStyle(i);
                const pct = Math.round((count / maxAreaCount) * 100);
                return (
                  <div key={i} className="group p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-outline-variant hover:bg-white transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-black shadow-sm ${rank.bg}`}>
                          <span className="material-symbols-outlined text-sm">{rank.icon}</span>
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{area}</h4>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{rank.label}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">{count}</span>
                        <span className="text-[10px] text-slate-400 font-medium block">pickups</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-slate-150 rounded-full overflow-hidden border border-slate-200/50">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-[#4eb3b7] rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mock Map Geographic Distribution Visualizer (Right) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sector Collection Density</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Live pickup saturation map visualization</p>
              </div>
              <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-xl">grid_view</span>
            </div>

            {/* Grid Density Mock Diagram */}
            <div className="relative border border-slate-100 rounded-2xl bg-slate-50/50 p-6 flex flex-col items-center">
              <div className="grid grid-cols-4 gap-4 w-full aspect-square max-w-[200px] mb-4">
                {Array.from({ length: 16 }).map((_, idx) => {
                  const intensities = [2, 5, 8, 3, 1, 9, 4, 7, 0, 3, 6, 2, 8, 1, 4, 5];
                  const intensity = intensities[idx] || 0;
                  let bgClass = 'bg-slate-155';
                  let borderClass = 'border-slate-200/50';
                  let ping = false;
                  
                  if (intensity > 7) {
                    bgClass = 'bg-primary'; 
                    borderClass = 'border-primary/20';
                    ping = idx === 5; 
                  } else if (intensity > 4) {
                    bgClass = 'bg-primary-container/80'; 
                    borderClass = 'border-primary/10';
                  } else {
                    bgClass = 'bg-slate-200'; 
                  }
                  
                  return (
                    <div key={idx} className="relative flex items-center justify-center aspect-square bg-white border rounded-lg shadow-sm border-slate-100">
                      <div className={`w-4 h-4 rounded-full ${bgClass} border ${borderClass} transition-all duration-300 relative`}>
                        {ping && (
                          <span className="absolute -inset-1 rounded-full bg-primary/30 animate-ping"></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Map Legend */}
              <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider justify-center border-t border-slate-100 pt-3 w-full">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container border border-primary/20"></span>
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                  <span>Low</span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 mt-2">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">insights</span>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Collection density is highly concentrated in metropolitan centers. Logistic paths are currently optimized for top 5 active zones.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

export function TrendForecasting() {
  const [data, setData] = React.useState(null);
  
  React.useEffect(() => {
    api.admin.getForecast()
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) {
    return (
      <AdminPage title="Trend Forecasting" subtitle="AI Predictions">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminPage>
    );
  }

  const historical = data.historical_data || [];
  const forecast = data.forecast_data || [];
  
  const combined = [
    ...historical.map(h => ({ label: h.month, val: h.count, isForecast: false })),
    ...forecast.map(f => ({ label: f.month, val: f.predicted, isForecast: true }))
  ];

  const hasData = combined.length > 0;
  const maxVal = hasData ? Math.max(...combined.map(d => d.val), 10) : 10;
  const minVal = 0; // eslint-disable-line no-unused-vars

  // Chart coordinates calculation helpers
  const svgWidth = 640;
  const svgHeight = 260;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (idx) => {
    if (combined.length <= 1) return padLeft + plotWidth / 2;
    return padLeft + (idx / (combined.length - 1)) * plotWidth;
  };
  
  const getY = (val) => {
    return (svgHeight - padBottom) - (val / maxVal) * plotHeight;
  };

  // Generate SVG path strings
  let historicalPath = '';
  let historicalAreaPath = '';
  let forecastPath = '';

  if (historical.length > 0) {
    historicalPath = `M ${getX(0)} ${getY(historical[0].count)}`;
    historicalAreaPath = `M ${getX(0)} ${svgHeight - padBottom} L ${getX(0)} ${getY(historical[0].count)}`;
    for (let i = 1; i < historical.length; i++) {
      historicalPath += ` L ${getX(i)} ${getY(historical[i].count)}`;
      historicalAreaPath += ` L ${getX(i)} ${getY(historical[i].count)}`;
    }
    historicalAreaPath += ` L ${getX(historical.length - 1)} ${svgHeight - padBottom} Z`;
  }

  if (forecast.length > 0) {
    // Start forecast path from the last historical point if it exists
    const startIndex = historical.length > 0 ? historical.length - 1 : 0;
    const startX = getX(startIndex);
    const startY = getY(historical.length > 0 ? historical[historical.length - 1].count : forecast[0].predicted);
    
    forecastPath = `M ${startX} ${startY}`;
    for (let i = 0; i < forecast.length; i++) {
      forecastPath += ` L ${getX(historical.length + i)} ${getY(forecast[i].predicted)}`;
    }
  }

  const aiCards = [
    { label: 'Next Month Forecast', value: data.next_month_forecast_pct_change, desc: 'Projected waste growth rate', icon: 'trending_up', bg: 'bg-primary-container text-primary', glow: 'border-primary/20' },
    { label: 'Peak Season Alert', value: data.peak_month, desc: 'Highest disposal month expected', icon: 'calendar_month', bg: 'bg-amber-50 text-amber-600', glow: 'border-amber-200' },
    { label: 'Resource Recommendation', value: data.recommended_additional_collectors, desc: 'Additional collectors needed', icon: 'person_add', bg: 'bg-teal-50 text-teal-600', glow: 'border-teal-200' },
  ];

  return (
    <AdminPage title="Trend Forecasting" subtitle="AI Predictions">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {aiCards.map((s, i) => (
          <div key={i} className={`bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors"></div>
            <div className="flex items-center gap-4">
              <div className={`p-3 ${s.bg} rounded-xl shrink-0`}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">{s.label}</p>
                <h4 className="text-2xl font-black mt-0.5 tracking-tight text-slate-800">{s.value}</h4>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 border-t border-slate-50 pt-2 font-medium">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SVG Prediction Line Chart (Left 8 cols) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Waste Collection Curve</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Historical waste intakes mapped against AI forecast projections</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-primary inline-block"></span>
                <span>Historical</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
                <span>Predicted</span>
              </div>
            </div>
          </div>

          {combined.length === 0 ? (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-slate-400 text-sm">Insufficient data to construct forecast curves.</p>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#326669" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#326669" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                  const val = Math.round(maxVal * ratio);
                  const y = getY(val);
                  return (
                    <g key={idx}>
                      <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                      <text x={padLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-bold fill-slate-400">{val}</text>
                    </g>
                  );
                })}

                {/* Historical Area Fill */}
                {historicalAreaPath && (
                  <path d={historicalAreaPath} fill="url(#areaGrad)" />
                )}

                {/* Historical Line */}
                {historicalPath && (
                  <path d={historicalPath} fill="none" stroke="#326669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Forecast Line */}
                {forecastPath && (
                  <path d={forecastPath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" />
                )}

                {/* Data Points Circles & Tooltips */}
                {combined.map((pt, idx) => {
                  const x = getX(idx);
                  const y = getY(pt.val);
                  const color = pt.isForecast ? '#f59e0b' : '#326669';
                  return (
                    <g key={idx} className="group/point cursor-pointer">
                      <circle cx={x} cy={y} r="5" fill="#ffffff" stroke={color} strokeWidth="3" className="transition-all duration-300 group-hover/point:r-7" />
                      
                      {/* Floating Indicator Tooltip on hover */}
                      <g className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <rect x={x - 24} y={y - 28} width="48" height="18" rx="4" fill="#0f172a" />
                        <text x={x} y={y - 16} textAnchor="middle" fill="#ffffff" className="text-[9px] font-black">{pt.val} qty</text>
                      </g>
                    </g>
                  );
                })}

                {/* X-Axis labels */}
                {combined.map((pt, idx) => (
                  <text key={idx} x={getX(idx)} y={svgHeight - 15} textAnchor="middle" className="text-[9px] font-black fill-slate-400 uppercase tracking-wide">
                    {pt.label}
                  </text>
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* AI Recommendations Panel (Right 4 cols) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-xl">psychology</span>
              <div>
                <h3 className="text-base font-bold text-slate-900">AI Logistic Strategy</h3>
                <p className="text-[10px] text-slate-400">Actionable recommendations generated by predictor</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  title: 'Peak Volume Scheduling',
                  desc: `Heavy electronic disposal cycles peak around ${data.peak_month}. Arrange preventative collector shifts ahead of schedule.`,
                  icon: 'event_upcoming',
                  color: 'text-amber-600 bg-amber-50'
                },
                {
                  title: 'Collector Deployment',
                  desc: `Scale capacity by ${data.recommended_additional_collectors} active collectors to match next month's projected growth (${data.next_month_forecast_pct_change}).`,
                  icon: 'local_shipping',
                  color: 'text-primary bg-primary-container'
                },
                {
                  title: 'Recycling Allocation',
                  desc: 'Prepare partner recycler channels for increased intake rates to maintain zero-landfill diversion speed.',
                  icon: 'cached',
                  color: 'text-teal-650 bg-teal-50'
                }
              ].map((rec, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50 flex gap-3">
                  <div className={`p-2 rounded-xl h-fit shrink-0 ${rec.color}`}>
                    <span className="material-symbols-outlined text-[18px]">{rec.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-none mb-1">{rec.title}</h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{rec.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

export function PricingRules() {
  const [rules, setRules] = React.useState([]);
  const [showModal, setShowModal] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({
    category: '', description: '', base_price: '', per_kg_rate: '', premium_rate: '',
    condition_multiplier_working: 1.0, condition_multiplier_partial: 0.6, condition_multiplier_broken: 0.3,
    min_weight: '', unit: 'kg', active: true
  });

  const loadRules = () => {
    api.admin.getPricingRules().then(setRules).catch(console.error);
  };

  React.useEffect(() => {
    loadRules();
  }, []);

  const openForm = (rule = null) => {
    setEditingRule(rule);
    setForm(rule ? { ...rule } : {
      category: '', description: '', base_price: '', per_kg_rate: '', premium_rate: '',
      condition_multiplier_working: 1.0, condition_multiplier_partial: 0.6, condition_multiplier_broken: 0.3,
      min_weight: '', unit: 'kg', active: true
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await api.admin.updatePricingRule(editingRule.id, form);
      } else {
        await api.admin.createPricingRule(form);
      }
      setShowModal(false);
      loadRules();
    } catch (err) {
      customAlert("Error saving rule: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!await customConfirm("Delete this pricing rule? This might affect future AI price estimations.")) return;
    try {
      await api.admin.deletePricingRule(id);
      loadRules();
    } catch (err) {
      customAlert("Error deleting rule: " + err.message);
    }
  };

  const toggleActive = async (rule) => {
    try {
      await api.admin.updatePricingRule(rule.id, { active: !rule.active });
      loadRules();
    } catch (err) {
      customAlert("Error updating rule: " + err.message);
    }
  };

  const filteredRules = rules.filter(r => r.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminPage title="Pricing Engine" subtitle="Manage AI estimation rules">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-3xl border border-primary/20 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined">rule_settings</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-primary">{rules.length}</div>
            <div className="text-sm font-bold text-slate-500 mt-1">Total Pricing Rules</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-outline-variant flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">{rules.filter(r => r.active).length}</div>
            <div className="text-sm font-bold text-slate-500 mt-1">Active Rules</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-outline-variant flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">Dynamic</div>
            <div className="text-sm font-bold text-slate-500 mt-1">AI Estimation Mode</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden mb-8 relative">
        <div className="p-6 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              type="text" 
              placeholder="Search category..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
            />
          </div>
          <button onClick={() => openForm()} className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-sm">add</span> Add Rule
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface text-primary text-[10px] uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-4">Category & Desc</th>
                <th className="px-6 py-4">Base Rate (₹)</th>
                <th className="px-6 py-4">Per Kg Rate (₹)</th>
                <th className="px-6 py-4">Premium (₹)</th>
                <th className="px-6 py-4">Min Wt.</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredRules.map((r, i) => (
                <tr key={r.id || i} className="hover:bg-surface/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="font-bold text-on-surface text-sm">{r.category}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]" title={r.description}>{r.description || 'No description'}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-slate-700">₹{r.base_price.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-600">₹{r.per_kg_rate.toLocaleString()}</td>
                  <td className="px-6 py-5 text-sm font-bold text-primary">₹{r.premium_rate.toLocaleString()}</td>
                  <td className="px-6 py-5 text-sm text-slate-600">{r.min_weight} {r.unit}</td>
                  <td className="px-6 py-5">
                    <button 
                      onClick={() => toggleActive(r)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors ${r.active ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      <span className="material-symbols-outlined text-[12px]">{r.active ? 'check_circle' : 'cancel'}</span>
                      {r.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-5 text-right space-x-1">
                    <button onClick={() => openForm(r)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20 inline-flex">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-error/20 inline-flex">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRules.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl">search_off</span>
                    </div>
                    <p className="text-slate-500 font-bold">No pricing rules found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-20">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative my-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{editingRule ? 'Edit Pricing Rule' : 'New Pricing Rule'}</h3>
                <p className="text-slate-500 text-sm mt-1">Configure how AI calculates prices for this category.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-surface text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Category Name</label>
                  <input required type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-outline-variant bg-surface focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="e.g. Laptops & Computers" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Description</label>
                  <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-outline-variant bg-surface focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="e.g. Include all laptops, desktops, and servers" />
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1 md:col-span-3 mb-1">
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">payments</span>
                      Rate Structure (₹)
                    </h4>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-wider">Base Price</label>
                    <input required type="number" min="0" step="0.01" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})} className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-wider">Per Kg Rate</label>
                    <input required type="number" min="0" step="0.01" value={form.per_kg_rate} onChange={e => setForm({...form, per_kg_rate: e.target.value})} className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-wider">Premium Rate</label>
                    <input required type="number" min="0" step="0.01" value={form.premium_rate} onChange={e => setForm({...form, premium_rate: e.target.value})} className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="0.00" />
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-2xl border border-outline-variant md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1 md:col-span-3 mb-1">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">analytics</span>
                      Condition Multipliers (1.0 = 100%)
                    </h4>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-wider">Working</label>
                    <input required type="number" min="0" max="5" step="0.1" value={form.condition_multiplier_working} onChange={e => setForm({...form, condition_multiplier_working: e.target.value})} className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="1.0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-wider">Partial / Damaged</label>
                    <input required type="number" min="0" max="5" step="0.1" value={form.condition_multiplier_partial} onChange={e => setForm({...form, condition_multiplier_partial: e.target.value})} className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="0.6" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-wider">Broken / Dead</label>
                    <input required type="number" min="0" max="5" step="0.1" value={form.condition_multiplier_broken} onChange={e => setForm({...form, condition_multiplier_broken: e.target.value})} className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="0.3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Min Weight</label>
                  <div className="flex gap-2">
                    <input required type="number" min="0" step="0.1" value={form.min_weight} onChange={e => setForm({...form, min_weight: e.target.value})} className="flex-1 border border-outline-variant bg-surface rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. 0.5" />
                    <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-24 border border-outline-variant bg-surface rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="unit">unit</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-outline-variant">
                  <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" id="ruleActive" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-primary checked:right-0 transition-all z-10" />
                    <label htmlFor="ruleActive" className="toggle-label block overflow-hidden h-6 rounded-full bg-slate-300 cursor-pointer"></label>
                  </div>
                  <label htmlFor="ruleActive" className="text-sm font-bold text-slate-700 cursor-pointer">Active Rule</label>
                </div>
              </div>

              <div className="flex gap-4 pt-4 mt-6 border-t border-outline-variant">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-surface text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">save</span>
                  {editingRule ? 'Save Changes' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

export function Reports() {
  const [analytics, setAnalytics] = React.useState(null);
  const [revenue, setRevenue] = React.useState(null);
  const [overview, setOverview] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      api.admin.getAnalytics(),
      api.admin.getRevenue(),
      api.admin.getOverview(),
    ]).then(([a, r, o]) => { setAnalytics(a); setRevenue(r); setOverview(o); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const period = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const categories = analytics ? Object.entries(analytics.waste_by_category || {}) : [];
  const byStatus = analytics ? (analytics.pickups_by_status || {}) : {};

  const downloadPDF = () => {
    if (loading) return;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.text('RenewGrid - Admin Detailed Report', 14, 20);
    
    // Subtitle / Period
    doc.setFontSize(12);
    doc.text(`Reporting Period: ${period}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 37);

    // Summary Statistics
    doc.setFontSize(16);
    doc.text('Overview', 14, 50);
    
    const summaryData = [
      ['Total Pickups', overview?.total_pickups ?? '0'],
      ['Completed Pickups', overview?.completed_pickups ?? '0'],
      ['Total Waste (kg)', analytics ? `${analytics.total_waste_collected_kg?.toLocaleString()} kg` : '0 kg'],
      ['CO2 Saved (kg)', analytics ? `${analytics.total_co2_saved_kg?.toLocaleString()} kg` : '0 kg'],
      ['Total Revenue', revenue ? `INR ${revenue.total_revenue?.toLocaleString()}` : '0'],
      ['This Month Revenue', revenue ? `INR ${revenue.this_month_revenue?.toLocaleString()}` : '0'],
      ['Active Collectors', overview?.active_collectors ?? '0'],
      ['Active Recyclers', overview?.active_recyclers ?? '0']
    ];

    autoTable(doc, {
      startY: 55,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [50, 102, 105] }, // Primary color
    });

    let finalY = doc.lastAutoTable.finalY + 15;

    // Pickups by Status
    doc.setFontSize(16);
    doc.text('Pickups by Status', 14, finalY);
    
    const statusData = Object.entries(byStatus).map(([status, count]) => [status, count]);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Status', 'Count']],
      body: statusData,
      theme: 'grid',
      headStyles: { fillColor: [50, 102, 105] },
    });

    let finalY2 = doc.lastAutoTable.finalY + 15;

    // Waste by Category
    doc.setFontSize(16);
    doc.text('Waste by Category', 14, finalY2);
    
    const categoryData = categories.map(([cat, cnt]) => [cat, cnt]);
    
    autoTable(doc, {
      startY: finalY2 + 5,
      head: [['Category', 'Amount']],
      body: categoryData,
      theme: 'grid',
      headStyles: { fillColor: [50, 102, 105] },
    });

    // Save PDF
    doc.save(`RenewGrid_Admin_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const cards = [
    { title: 'Total Pickups', value: overview?.total_pickups ?? '—', icon: 'local_shipping', color: 'text-primary', bg: 'bg-primary-container', desc: 'Total pickup requests logged' },
    { title: 'Completed Pickups', value: overview?.completed_pickups ?? '—', icon: 'check_circle', color: 'text-teal-650', bg: 'bg-teal-50', desc: 'Successfully collected e-waste' },
    { title: 'Total Waste (kg)', value: analytics ? `${analytics.total_waste_collected_kg?.toLocaleString()} kg` : '—', icon: 'scale', color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Weight of materials reclaimed' },
    { title: 'CO₂ Saved (kg)', value: analytics ? `${analytics.total_co2_saved_kg?.toLocaleString()} kg` : '—', icon: 'eco', color: 'text-green-600', bg: 'bg-green-50', desc: 'Environmental offset index' },
    { title: 'Total Revenue', value: revenue ? `₹${revenue.total_revenue?.toLocaleString()}` : '—', icon: 'payments', color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Recycler partner transactions' },
    { title: 'This Month Revenue', value: revenue ? `₹${revenue.this_month_revenue?.toLocaleString()}` : '—', icon: 'calendar_today', color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Current calendar cycle revenue' },
    { title: 'Active Collectors', value: overview?.active_collectors ?? '—', icon: 'directions_bike', color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Logistics partners on service' },
    { title: 'Active Recyclers', value: overview?.active_recyclers ?? '—', icon: 'recycling', color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Affiliated facility operators' },
    { title: 'Total Categories', value: categories.length || '—', icon: 'category', color: 'text-slate-600', bg: 'bg-slate-100', desc: 'E-waste segments tracked' },
  ];

  if (loading) {
    return (
      <AdminPage title="Reports" subtitle="Documentation">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminPage>
    );
  }

  const statusGradients = {
    COMPLETED: 'from-teal-500 to-cyan-500',
    PROCESSING: 'from-blue-500 to-indigo-500',
    COLLECTED: 'from-purple-500 to-indigo-500',
    ASSIGNED: 'from-amber-500 to-yellow-500',
    PENDING: 'from-slate-400 to-slate-500',
    CANCELLED: 'from-red-500 to-rose-500',
  };

  const categoryGradients = [
    'from-primary to-primary-container',
    'from-teal-500 to-cyan-400',
    'from-indigo-500 to-purple-400',
    'from-amber-500 to-orange-400',
    'from-slate-500 to-slate-700'
  ];

  return (
    <AdminPage title="Reports" subtitle="Documentation">
      {/* Top Banner Control Bar */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-outline-variant shadow-sm">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-0.5">Active Period</span>
          <p className="text-sm text-slate-500 font-medium">Reporting cycle: <strong className="text-slate-900">{period}</strong></p>
        </div>
        <div className="flex gap-3 items-center w-full sm:w-auto">
          <button 
            onClick={downloadPDF}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-[#285255] text-white text-sm font-bold rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download PDF Report
          </button>
          <span className="px-3.5 py-2 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest border border-primary/10">Read-Only View</span>
        </div>
      </div>

      {/* Summary Data Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className={`p-3 ${c.bg} ${c.color} rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <span className="material-symbols-outlined">{c.icon}</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.title}</p>
              <p className={`text-2xl font-black mt-1 tracking-tight ${c.color}`}>{c.value}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-2 font-medium">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Status Breakdown and Waste Category lists */}
      {Object.keys(byStatus).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pickups by Status</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Summary breakdown of logistic volumes</p>
              </div>
              <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-xl">pie_chart</span>
            </div>
            <div className="space-y-4">
              {Object.entries(byStatus).map(([status, count], i) => {
                const total = Object.values(byStatus).reduce((s, v) => s + v, 0) || 1;
                const pct = Math.round((count / total) * 100);
                const activeGrad = statusGradients[status] || 'from-primary to-primary-container';
                return (
                  <div key={i} className="group">
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-700 group-hover:text-primary transition-colors uppercase text-[10px] tracking-wide">{status}</span>
                      <span className="text-slate-900">{count} ({pct}%)</span>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                      <div className={`h-full bg-gradient-to-r ${activeGrad} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-905">Waste by Category</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Categorical electronic segment distributions</p>
              </div>
              <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-xl">category</span>
            </div>
            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 text-sm">No e-waste categorizations recorded yet.</p>
                </div>
              ) : (
                categories.map(([cat, cnt], i) => {
                  const tot = categories.reduce((s, [, v]) => s + v, 0) || 1;
                  const pct = Math.round((cnt / tot) * 100);
                  const activeGrad = categoryGradients[i % categoryGradients.length] || 'from-primary to-primary-container';
                  return (
                    <div key={i} className="group">
                      <div className="flex justify-between text-xs mb-1.5 font-bold">
                        <span className="text-slate-700 group-hover:text-primary transition-colors text-[10px] tracking-wide">{cat}</span>
                        <span className="text-slate-900">{cnt} ({pct}%)</span>
                      </div>
                      <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                        <div className={`h-full bg-gradient-to-r ${activeGrad} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}




export function AdminProfile() {
  const [profile, setProfile] = React.useState({ full_name: '', email: '', role: '', profile_image_url: '' });
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [imgError, setImgError] = React.useState(''); // eslint-disable-line no-unused-vars
  const fileRef = React.useRef(null); // eslint-disable-line no-unused-vars

  React.useEffect(() => {
    authAPI.me().then(u => setProfile(u)).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile({ full_name: profile.full_name, email: profile.email });
      setSuccess(true);
      
      // Update local storage so the sidebar reflects changes
      const adminData = JSON.parse(localStorage.getItem('admin') || '{}');
      adminData.full_name = profile.full_name;
      adminData.email = profile.email;
      localStorage.setItem('admin', JSON.stringify(adminData));

      setTimeout(() => {
        setSuccess(false);
        window.location.reload(); // Force reload to update sidebar globally
      }, 1000);
    } catch (err) { customAlert(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const initials = profile.full_name ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'A'; // eslint-disable-line no-unused-vars

  return (
    <AdminPage title="Profile" subtitle="Account Settings">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-6">Admin Information</h3>
            {success && (
              <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-700 text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Profile updated successfully!
              </div>
            )}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-semibold text-slate-700 mb-2">Name</label><input type="text" value={profile.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-primary/20 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-2">Email</label><input type="email" value={profile.email || ''} disabled className="w-full px-4 py-3 rounded-xl border border-primary/20 bg-surface text-slate-400 cursor-not-allowed" /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-2">Role</label><input type="text" value={profile.role || 'Admin'} disabled className="w-full px-4 py-3 rounded-xl border border-primary/20 bg-surface text-slate-400" /></div>
              <div className="flex items-end">
                <button type="submit" disabled={saving} className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary rounded-2xl p-6 text-white text-center shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="mb-4">
                <ProfileImageCropper 
                  currentImage={profile.profile_image ? (profile.profile_image.startsWith('http') ? profile.profile_image : `${BASE_URL}${profile.profile_image}`) : ''} 
                  onImageUpdated={(url) => setProfile(p => ({ ...p, profile_image: url }))}
                  size="w-24 h-24"
                  role="admin"
                />
              </div>
              <h3 className="text-xl font-black">{profile.full_name || 'Admin'}</h3>
              <p className="text-white/60 text-sm">Superuser Access</p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full"></div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-2">Security</h3>
            <p className="text-sm text-slate-500 mb-4">Manage your password and security settings.</p>
            <a href="/admin/change-password" className="w-full block text-center py-3 border-2 border-primary/20 text-primary rounded-xl font-bold hover:bg-primary/5 transition-all">Change Password</a>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}


// ─── Admin Change Password ──────────────────────────────────────────
export function AdminChangePassword() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPass !== form.confirm) return;
    try {
      await authAPI.changePassword({ current_password: form.current, new_password: form.newPass });
      setSuccess(true);
      setForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setSuccess(false), 4000);
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
    <AdminPage title="Change Password" subtitle="Security Center">
      <div className="max-w-7xl mx-auto pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-primary/5 border border-primary/10 relative overflow-hidden">
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
                  label="Current Password"
                  placeholder="Enter your current password"
                  value={form.current}
                  onChange={(e) => setForm({ ...form, current: e.target.value })}
                  show={showCurrent}
                  onToggle={() => setShowCurrent(!showCurrent)}
                />

                <div className="pt-2">
                  <PasswordField
                    label="New Password"
                    placeholder="Create a strong password"
                    value={form.newPass}
                    onChange={(e) => setForm({ ...form, newPass: e.target.value })}
                    show={showNew}
                    onToggle={() => setShowNew(!showNew)}
                  />

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
                          className={`flex-1 rounded-full transition-all duration-500 ease-out ${form.newPass.length > 0 && i <= strength ? strengthColor : 'bg-slate-100'
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 pb-4">
                  <PasswordField
                    label="Confirm New Password"
                    placeholder="Re-enter your new password"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    show={showConfirm}
                    onToggle={() => setShowConfirm(!showConfirm)}
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
    </AdminPage>
  );
}

// ─── Waste Uploads (All Uploads) ──────────────────────────────────────────
export function WasteUploads() {
  const [uploads, setUploads] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const loadUploads = React.useCallback(async () => {
    try {
      const data = await api.admin.wasteUploads(
        currentPage,
        ITEMS_PER_PAGE
      );

      setUploads(data.items || []);
      setTotalPages(
        Math.ceil((data.total || 1) / ITEMS_PER_PAGE)
      );
    } catch (error) {
      console.error('Failed to load waste uploads', error);
    }
  }, [currentPage]);

  React.useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  return (
    <AdminPage title="Waste Uploads" subtitle="Operations">
      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface">All Waste Uploads</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-surface text-primary text-[10px] uppercase tracking-widest font-black">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Title / Category</th>
              <th className="px-6 py-4">Estimated Weight</th>
              <th className="px-6 py-4">Estimated Price</th>
              <th className="px-6 py-4">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {uploads.map((w) => (
              <tr key={w.id} className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5 font-bold text-on-surface">#{w.id}</td>
                <td className="px-6 py-5">
                  <p className="font-bold text-on-surface text-sm">{w.title}</p>
                  <p className="text-xs text-slate-400">{w.category}</p>
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">{w.estimated_weight_kg ? `${w.estimated_weight_kg} kg` : 'N/A'}</td>
                <td className="px-6 py-5 text-sm font-bold text-primary">{w.estimated_price ? `₹${w.estimated_price.toLocaleString()}` : <span className="text-slate-400 italic font-normal text-xs">Pending AI Assessment</span>}</td>
                <td className="px-6 py-5 text-sm text-slate-400">{new Date(w.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              </tr>
            ))}
            {uploads.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-6 text-slate-400 font-bold">No waste uploads found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination current={currentPage} total={totalPages} onChange={setCurrentPage} />
      </div>
    </AdminPage>
  );
}

// ─── Notification Broadcast ───────────────────────────────────────────
export function NotificationBroadcast() {
  const [message, setMessage] = React.useState('');
  const [level, setLevel] = React.useState('info');
  const [loading, setLoading] = React.useState(false);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      // Create a temporary axios/fetch call to /admin/broadcast
      const token = getToken();
      const res = await fetch(`${BASE_URL}/admin/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message, level })
      });
      if (!res.ok) throw new Error('Broadcast failed');
      customAlert('Broadcast sent successfully!');
      setMessage('');
    } catch (error) {
      customAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPage title="Notification Broadcast" subtitle="System Comm">
      <div className="max-w-3xl bg-white rounded-3xl shadow-sm border border-outline-variant p-8">
        <h3 className="text-xl font-black text-on-surface mb-6">Send Global Notification</h3>
        <form onSubmit={handleBroadcast} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Message Content</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message to broadcast to all users..."
              className="w-full px-5 py-4 rounded-2xl border-2 border-primary/10 bg-surface-bright focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Priority Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border-2 border-primary/10 bg-surface-bright focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="w-full py-4 bg-primary text-white text-lg rounded-2xl font-black shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">campaign</span>
            {loading ? 'Broadcasting...' : 'Send Broadcast'}
          </button>
        </form>
      </div>
    </AdminPage>
  );
}
