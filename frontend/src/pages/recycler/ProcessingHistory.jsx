import React, { useState, useEffect } from 'react';
import RecyclerSidebar from '../../components/layout/RecyclerSidebar';
import { recyclerAPI } from '../../services/api';

export default function ProcessingHistory() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    recyclerAPI.myHistory(page, PAGE_SIZE)
      .then(data => {
        setRecords(data.items || data || []);
        setTotal(data.total || 0);
      })
      .catch(err => console.error('Failed to load history:', err))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const outcomeColor = (outcome = '') => {
    const v = (outcome || '').toUpperCase();
    if (v === 'RECYCLED') return 'bg-primary/10 text-primary border border-primary/20';
    if (v === 'COMPLETED') return 'bg-teal-100 text-teal-700 border border-teal-200';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen relative">
      <RecyclerSidebar />
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-white/85 backdrop-blur-md shadow-sm z-40 flex items-center justify-between px-8">
        <h1 className="text-xl font-extrabold text-[#326669]">Processing History</h1>
      </header>

      <main className="ml-64 pt-24 px-8 pb-12 min-h-screen">
        {/* Summary row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Records', value: total, icon: 'inventory' },
            { label: 'Recycled', value: records.filter(r => (r.decision || '').toLowerCase() === 'recycle').length, icon: 'recycling' },
            { label: 'Refurbished', value: records.filter(r => (r.decision || '').toLowerCase() === 'refurbish').length, icon: 'build' },
            { label: 'Completed', value: records.filter(r => r.outcome === 'COMPLETED' || r.outcome === 'RECYCLED').length, icon: 'check_circle' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-md border border-outline-variant">
              <span className="material-symbols-outlined text-primary mb-3 block">{s.icon}</span>
              <p className="text-3xl font-black text-primary tracking-tighter">{s.value}</p>
              <p className="text-sm text-slate-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-outline-variant">
          <div className="bg-surface-container px-6 py-4 flex items-center justify-between">
            <h3 className="text-base font-black text-on-surface">All Processing Records</h3>
            <span className="text-xs text-slate-400">{total} total</span>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No processing records yet.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container/50 border-b border-outline-variant">
                  {['Pickup ID', 'Decision', 'Outcome', 'Notes', 'Revenue', 'Date'].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {records.map((r, i) => (
                  <tr key={i} className="hover:bg-surface transition-colors group">
                    <td className="px-6 py-5 font-bold text-primary text-sm">#{r.pickup_id}</td>
                    <td className="px-6 py-5 text-sm font-semibold text-on-surface capitalize">{r.decision}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${outcomeColor(r.outcome)}`}>
                        {r.outcome || 'In Progress'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 max-w-[200px] truncate">{r.processing_notes || '—'}</td>
                    <td className="px-6 py-5 text-sm font-bold text-primary">{r.revenue_generated != null ? `₹${r.revenue_generated.toFixed(2)}` : '—'}</td>
                    <td className="px-6 py-5 text-sm text-slate-500">{new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-surface py-4 px-6 flex items-center justify-between border-t border-outline-variant">
              <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white transition-colors disabled:opacity-40">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${p === page ? 'bg-primary text-white' : 'hover:bg-white border border-outline-variant'}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white transition-colors disabled:opacity-40">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
