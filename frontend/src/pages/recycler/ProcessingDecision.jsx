import { customAlert } from '../../components/common/popupService';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RecyclerSidebar from '../../components/layout/RecyclerSidebar';
import { recyclerAPI } from '../../services/api';

export default function ProcessingDecision() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState('recycle');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    recyclerAPI.assignedWaste(1, 50)
      .then(data => {
        const item = (data.items || []).find(p => String(p.id) === String(id));
        setPickup(item || null);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await recyclerAPI.updateStatus(id, {
        outcome: decision === 'recycle' ? 'RECYCLED' : 'COMPLETED',
        decision,              // store "recycle" or "refurbish" separately
        processing_notes: notes,
      });
      navigate('/processing-history');
    } catch (err) {
      customAlert(err.message || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen relative">
      <RecyclerSidebar />
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-white/85 backdrop-blur-md shadow-sm z-40 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/collected-waste-listing')} className="flex items-center gap-2 text-primary hover:underline text-sm font-bold">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back
          </button>
          <h1 className="text-xl font-extrabold text-[#326669]">Processing Decision</h1>
        </div>
      </header>

      <main className="ml-64 pt-24 p-8 min-h-screen">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading pickup details...</p>
        ) : !id ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-700 font-bold">
            No pickup selected. <a href="/collected-waste-listing" className="underline">Go to Waste Listing</a> and click "Start Processing".
          </div>
        ) : !pickup ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 font-bold">Pickup #{id} not found or not available for processing.</div>
        ) : (
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Left panel: pickup info */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-outline-variant p-6">
                <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">Pickup #{pickup.id}</p>
                <h2 className="text-xl font-black text-on-surface mb-4">{pickup.address || 'No address'}</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-slate-500">Status</span>
                    <span className="font-bold text-primary">{pickup.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-slate-500">Weight</span>
                    <span className="font-bold">{pickup.final_collected_weight ? `${pickup.final_collected_weight} kg` : '—'}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-slate-500">Date</span>
                    <span className="font-bold">{pickup.pickup_date ? new Date(pickup.pickup_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel: decision form */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <section>
                <h3 className="text-lg font-black tracking-tight mb-6 text-on-surface">Select Processing Path</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    type="button"
                    onClick={() => setDecision('recycle')}
                    className={`group relative rounded-2xl p-8 text-left transition-all duration-300 shadow-md ${decision === 'recycle' ? 'border-2 border-primary ring-4 ring-primary/10 bg-primary/5' : 'border-2 border-transparent bg-white hover:border-primary/20 hover:shadow-xl'}`}
                  >
                    <div className="w-14 h-14 bg-primary-container rounded-xl flex items-center justify-center text-primary mb-4">
                      <span className="material-symbols-outlined text-3xl">recycling</span>
                    </div>
                    <h4 className="text-xl font-black text-on-surface mb-2">Recycle Materials</h4>
                    <p className="text-slate-500 text-sm">Dismantle for raw materials. Best for non-functional components.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('refurbish')}
                    className={`group relative rounded-2xl p-8 text-left transition-all duration-300 shadow-md ${decision === 'refurbish' ? 'border-2 border-primary ring-4 ring-primary/10 bg-primary/5' : 'border-2 border-transparent bg-white hover:border-primary/20 hover:shadow-xl'}`}
                  >
                    <div className="w-14 h-14 bg-primary text-white rounded-xl flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-3xl">restore</span>
                    </div>
                    <h4 className="text-xl font-black text-on-surface mb-2">Refurbish &amp; Resell</h4>
                    <p className="text-slate-500 text-sm">Restore and repair for the secondary market. Maximize value.</p>
                  </button>
                </div>
              </section>

              <section className="bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
                <h3 className="text-base font-bold text-on-surface mb-3">Processing Notes</h3>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add any relevant notes about condition, materials found, etc..."
                  className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary transition-all resize-none text-sm"
                />
              </section>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-outline-variant">
                <button onClick={() => navigate('/collected-waste-listing')} className="px-6 py-3 rounded-xl border border-outline-variant text-slate-600 font-bold hover:bg-surface transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-10 py-3 rounded-xl bg-primary text-white font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
