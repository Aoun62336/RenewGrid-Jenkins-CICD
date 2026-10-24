import { customAlert } from '../../components/common/popupService';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RecyclerSidebar from '../../components/layout/RecyclerSidebar';
import { pickupAPI, recyclerAPI } from '../../services/api';

export default function WasteReceipt() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      pickupAPI.getById(id)
        .then(setPickup)
        .catch(err => customAlert("Error loading receipt: " + err.message))
        .finally(() => setLoading(false));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
  }, [id]);

  const handleConfirm = async () => {
    try {
      await recyclerAPI.startProcessing(id, { decision: 'pending_ai', processing_notes: 'Receipt Confirmed' });
      navigate(`/ai-recommendation/${id}`);
    } catch (err) {
      customAlert("Error starting processing: " + err.message);
    }
  };

  const handleDownloadManifest = () => {
    if (!pickup) return;
    const manifest = {
      pickup_id: pickup.id,
      address: pickup.address,
      status: pickup.status,
      weight: pickup.actual_weight || pickup.estimated_weight || 0,
      category: pickup.waste_upload?.category || 'Mixed Electronics',
      created_at: pickup.created_at,
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifest-RG-${pickup.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  if (loading) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center">
        <p className="text-primary font-bold text-lg">Loading Receipt...</p>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="bg-surface text-on-surface min-h-screen relative">
        <RecyclerSidebar />
        <main className="ml-64 pt-24 pb-12 px-12 min-h-screen">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-700 font-bold">
            No pickup selected. <a href="/collected-waste-listing" className="underline">Go to Waste Listing</a> to select a batch.
          </div>
        </main>
      </div>
    );
  }

  if (!pickup) return null;

  return (
    <div className="bg-surface text-on-surface min-h-screen relative">
      <RecyclerSidebar />

      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-white/85 backdrop-blur-md shadow-sm z-40 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-['Inter'] font-extrabold text-[#326669]">Waste Receipt</h1>
        </div>
      </header>

      <main className="ml-64 pt-24 pb-12 px-12 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-primary font-bold tracking-widest text-[10px] uppercase block mb-1">RECYCLER MODULE</span>
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Confirm Batch Receipt</h2>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDownloadManifest} className="px-6 py-2 rounded-xl border-2 border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-all active:scale-95">
                Download Manifest
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
              <div className="bg-surface-bright rounded-2xl p-8 shadow-sm outline_variant border border-primary/5 relative overflow-hidden group transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 p-4">
                  <span className="material-symbols-outlined text-primary/10 text-6xl group-hover:scale-110 transition-transform">qr_code_2</span>
                </div>
                <div className="relative z-10">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-container text-primary mb-4 uppercase tracking-wider">
                    {pickup.status}
                  </span>
                  <h3 className="text-slate-500 text-sm font-semibold mb-1">Request ID</h3>
                  <p className="text-2xl font-black tracking-tight text-[#326669] mb-6">RG-{pickup.id}</p>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">Address Details</h4>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary">location_on</span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm max-w-[250px] truncate">{pickup.address}</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Created Date</h4>
                        <p className="font-semibold text-sm">{new Date(pickup.created_at || new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="bg-surface-bright rounded-2xl shadow-sm border border-primary/5 flex flex-col h-full overflow-hidden">
                <div className="bg-primary p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-white">inventory_2</span>
                    <h3 className="text-white font-bold text-lg">Batch Waste Details</h3>
                  </div>
                </div>
                <div className="p-8 flex-1">
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="bg-surface-container/50 p-5 rounded-2xl border border-primary/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type Summary</span>
                        <span className="material-symbols-outlined text-primary text-sm">info</span>
                      </div>
                      <p className="text-xl font-black text-on-surface">{pickup.waste_upload?.category || 'Mixed Electronics'}</p>
                    </div>
                    <div className="bg-surface-container/50 p-5 rounded-2xl border border-primary/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Weight</span>
                        <span className="material-symbols-outlined text-primary text-sm">monitor_weight</span>
                      </div>
                      <p className="text-xl font-black text-on-surface">{pickup.final_collected_weight || pickup.waste_upload?.estimated_weight || 'N/A'} <span className="text-sm font-medium">kg</span></p>
                    </div>
                    <div className="bg-surface-container/50 p-5 rounded-2xl border border-primary/5 col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expected Valuation</span>
                        <span className="material-symbols-outlined text-primary text-sm">payments</span>
                      </div>
                      <p className="text-xl font-black text-on-surface">
                        {pickup.final_price || pickup.waste_upload?.estimated_price 
                          ? `₹${(pickup.final_price || pickup.waste_upload.estimated_price).toLocaleString()}` 
                          : <span className="text-slate-400 italic text-sm font-normal">Pending AI Assessment</span>}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-primary">
                        <span className="material-symbols-outlined text-4xl">eco</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">Estimated Impact Yield</p>
                        <p className="text-xs text-slate-500">Predicted material recovery from this batch</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-primary tracking-tight">
                        {Math.min(99.9, 70 + ((pickup.actual_weight || pickup.estimated_weight || 10) * 0.5)).toFixed(1)}%
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Circular Score</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 pt-0 mt-auto">
                  <button onClick={handleConfirm} className="w-full bg-[#326669] text-white py-5 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-[#2a5558] transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">verified</span>
                    Confirm Receipt & Start Sorting
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-4 leading-relaxed">
                    By clicking confirm, you acknowledge the physical custody of RG-{pickup.id} and verify that all manifest weights align with incoming scale readings. This action will trigger the AI Processing Decision module.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
