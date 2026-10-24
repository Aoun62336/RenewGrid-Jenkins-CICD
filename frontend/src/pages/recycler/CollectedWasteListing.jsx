import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RecyclerSidebar from '../../components/layout/RecyclerSidebar';
import { recyclerAPI } from '../../services/api';

const ITEMS_PER_PAGE = 10;

export default function CollectedWasteListing() {
  const navigate = useNavigate();
  const [waste, setWaste] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [processing, setProcessing] = useState(null); // eslint-disable-line no-unused-vars

  const loadWaste = async (page = 1) => {
    setLoading(true);
    try {
      const data = await recyclerAPI.assignedWaste(page, ITEMS_PER_PAGE);
      setWaste(data.items || data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load waste:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWaste(currentPage); }, [currentPage]);

  const handleProcess = (item) => {
    navigate(`/waste-receipt/${item.id}`);
  };

  const statusColor = (s = '') => {
    const v = s.toUpperCase();
    if (v === 'RECYCLED' || v === 'COMPLETED') return 'bg-teal-100 text-teal-700';
    if (v === 'PROCESSING') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <DashboardLayout sidebar={RecyclerSidebar} title="Collected Waste Listing">
      <div className="mb-8">
        <p className="text-primary font-bold tracking-widest text-xs uppercase mb-1">Incoming Waste</p>
        <h2 className="text-3xl font-black text-on-surface -tracking-tight">Collected Waste Listing</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Batches', value: total, icon: 'inventory_2' },
          { label: 'Awaiting Processing', value: waste.filter(w => w.status === 'DELIVERED').length, icon: 'pending' },
          { label: 'In Processing', value: waste.filter(w => w.status === 'PROCESSING').length, icon: 'autorenew' },
          { label: 'Processed', value: waste.filter(w => ['RECYCLED','COMPLETED'].includes(w.status)).length, icon: 'check_circle' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-lg transition-all">
            <div className="p-3 bg-primary-container rounded-xl text-primary w-fit mb-4">
              <span className="material-symbols-outlined">{s.icon}</span>
            </div>
            <p className="text-3xl font-black text-on-surface">{s.value}</p>
            <p className="text-sm text-slate-500 font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface">All Collected Waste Entries</h3>
          <span className="text-xs text-slate-400">{total} total entries</span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">Loading...</div>
        ) : waste.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">No collected waste assigned yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface text-primary text-[10px] uppercase tracking-widest font-black">
                <tr>
                  <th className="px-6 py-4">Pickup ID</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4">Weight (kg)</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {waste.map((w, i) => (
                  <tr key={i} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-primary text-sm">#{w.id}</td>
                    <td className="px-6 py-5 text-sm font-semibold text-on-surface">{w.address || '—'}</td>
                    <td className="px-6 py-5 text-sm text-slate-600">{w.final_collected_weight ?? '—'}</td>
                    <td className="px-6 py-5 text-sm text-slate-500">
                      {w.pickup_date ? new Date(w.pickup_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : w.created_at ? new Date(w.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusColor(w.status)}`}>{w.status}</span>
                    </td>
                    <td className="px-6 py-5">
                      {w.status === 'DELIVERED' ? (
                        <button
                          onClick={() => handleProcess(w)}
                          disabled={processing === w.id}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          {processing === w.id ? 'Starting...' : 'Start Processing'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-outline-variant">
            <p className="text-xs text-slate-500">Page {currentPage} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface transition-all disabled:opacity-40">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${p === currentPage ? 'bg-primary text-white' : 'hover:bg-surface border border-outline-variant'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface transition-all disabled:opacity-40">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
