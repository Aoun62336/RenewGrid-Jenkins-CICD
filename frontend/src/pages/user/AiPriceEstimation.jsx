import { customConfirm } from '../../components/common/popupService';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserSidebar from '../../components/layout/UserSidebar';
import { wasteAPI, systemAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AiPriceEstimation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [waste, setWaste] = useState(null);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = React.useCallback(async () => {
    try {
      const [wasteData, rulesData] = await Promise.all([
        wasteAPI.getById(id),
        systemAPI.pricingRates(),
      ]);

      setWaste(wasteData);
      setPricingRules(rulesData || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assessment data.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirm = () => {
    toast.success('Price confirmed! Proceeding to schedule pickup.');
    navigate('/user/schedule-pickup', { state: { wasteId: id } });
  };

  const handleReject = async () => {
    // RULE: Reject → reset entire flow, go back to upload page
    if (await customConfirm('Decline this estimate? You can re-upload your item to get a fresh assessment.')) {
      navigate('/user/upload-ewaste');
    }
  };

  // Find the specific rule applied to this item
  const appliedRule = waste ? pricingRules.find(r => r.category === waste.category) : null;

  // Compute display price range (±15% of estimated)
  const priceMin = waste?.estimated_price ? Math.round(waste.estimated_price * 0.85) : null;
  const priceMax = waste?.estimated_price ? Math.round(waste.estimated_price * 1.15) : null;

  if (loading) {
    return (
      <DashboardLayout sidebar={UserSidebar} title="AI Price Estimation">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!waste) {
    return (
      <DashboardLayout sidebar={UserSidebar} title="AI Price Estimation">
        <div className="text-center py-12">
          <p className="text-slate-500">Assessment not found.</p>
          <button onClick={() => navigate('/user/upload-ewaste')} className="mt-4 text-primary font-bold">Back to Upload</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={UserSidebar} title="AI Price Estimation">
      <div className="mb-8">
        <p className="text-primary font-bold tracking-widest text-xs uppercase mb-1">AI Assessment Complete</p>
        <h2 className="text-3xl font-black text-on-surface -tracking-tight">Estimated Value & Recovery Analysis</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main AI Result Card */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-outline-variant relative">
            {/* Header with Background Pattern */}
            <div className="bg-gradient-to-r from-primary/10 to-teal-500/10 p-8 border-b border-outline-variant relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <span className="material-symbols-outlined text-[120px]">psychology</span>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                            <span className="material-symbols-outlined">auto_awesome</span>
                        </div>
                        <span className="text-sm font-black text-primary uppercase tracking-widest">RenewGrid AI Engine v2.4</span>
                    </div>
                    <h3 className="text-2xl font-black text-on-surface">Analysis Results for "{waste.title}"</h3>
                </div>
            </div>

            <div className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Price Display */}
                <div className="space-y-6">
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">AI Estimated Price Range</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-primary">₹{priceMin?.toLocaleString() || '---'}</span>
                            <span className="text-slate-400 font-bold text-2xl">–</span>
                            <span className="text-4xl font-black text-primary">₹{priceMax?.toLocaleString() || '---'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Midpoint: ₹{waste.estimated_price?.toLocaleString() || '---'} INR</p>
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">info</span>
                            Based on current market rates for {waste.category}
                        </p>
                    </div>

                    <div className="pt-4 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-outline-variant">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">verified</span>
                                <span className="text-sm font-bold text-on-surface">AI Confidence</span>
                            </div>
                            <span className="text-lg font-black text-primary">{Math.round((waste.ai_confidence || 0.9) * 100)}%</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-outline-variant">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">category</span>
                                <span className="text-sm font-bold text-on-surface">Detected Category</span>
                            </div>
                            <span className="text-sm font-black text-on-surface">{waste.category}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Recovery Info */}
                <div className="space-y-6">
                    <div className="bg-teal-50 rounded-3xl p-6 border border-teal-100">
                        <h4 className="text-sm font-black text-teal-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">eco</span>
                            Environmental Impact
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-teal-700 font-bold">CO2 Savings</span>
                                <span className="text-xs font-black text-teal-900">{waste.estimated_co2_saved || Math.round(waste.estimated_weight * 1.8)} kg</span>
                            </div>
                            <div className="w-full bg-teal-200/50 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-teal-500 h-full rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <p className="text-[10px] text-teal-600/80 leading-relaxed font-medium">
                                Recycling this item prevents toxic materials from entering landfills and reduces the need for raw material mining.
                            </p>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
                        <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">military_tech</span>
                            Reward Points
                        </h4>
                        <p className="text-xs text-amber-700 font-medium mb-1">Potential Earnings</p>
                        <p className="text-2xl font-black text-amber-900">{waste.estimated_credit_points || Math.round(waste.estimated_price / 10)} Credits</p>
                    </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-12 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleConfirm}
                  className="flex-1 py-5 bg-primary text-white text-lg rounded-2xl font-black shadow-xl shadow-primary/20 hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">schedule_send</span>
                  Confirm & Schedule Pickup
                </button>
                <button 
                  onClick={handleReject}
                  className="px-10 py-5 bg-red-50 text-red-600 border-2 border-red-100 text-lg rounded-2xl font-black hover:bg-red-100 transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">restart_alt</span>
                  Reject &amp; Re-Upload
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-outline-variant shadow-sm">
                <h3 className="text-sm font-black text-on-surface uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                    Pricing Breakdown
                </h3>
                
                {appliedRule ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 mb-2">Values calculated dynamically using active <span className="font-bold text-primary">{appliedRule.category}</span> pricing rules.</p>
                    <div className="p-4 bg-surface rounded-2xl border border-outline-variant space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 font-bold">Base Price:</span>
                        <span className="text-slate-800 font-black">₹{appliedRule.base_price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 font-bold">Weight Value ({waste.estimated_weight}{appliedRule.unit}):</span>
                        <span className="text-slate-800 font-black">+ ₹{(appliedRule.per_kg_rate * waste.estimated_weight).toLocaleString()}</span>
                      </div>
                      <div className="border-t border-outline-variant pt-2 mt-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 font-bold">Subtotal:</span>
                          <span className="text-slate-800 font-black">₹{((appliedRule.base_price) + (appliedRule.per_kg_rate * waste.estimated_weight)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-surface rounded-2xl border border-outline-variant space-y-2">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Condition Adjustments</div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-primary">center_focus_strong</span>
                        <span className="text-sm font-bold text-slate-700">AI Assessment: </span>
                        <span className="text-sm text-slate-500">{waste.condition || 'Standard'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">Condition impacts the final estimated value based on repairability and parts recovery potential.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                      {[
                          { title: 'Visual Analysis', desc: 'Our AI scanned your uploaded photos to identify the item type and physical condition.', icon: 'center_focus_strong' },
                          { title: 'Market Integration', desc: 'We cross-referenced the item with live secondary market pricing for precious metal recovery.', icon: 'trending_up' },
                          { title: 'Weight Verification', desc: 'Your estimated weight of ' + waste.estimated_weight + 'kg was used to calculate bulk recovery value.', icon: 'scale' }
                      ].map((item, i) => (
                          <div key={i} className="flex gap-4">
                              <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-primary shrink-0">
                                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                              </div>
                              <div>
                                  <p className="text-xs font-black text-on-surface mb-0.5">{item.title}</p>
                                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                              </div>
                          </div>
                      ))}
                  </div>
                )}
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[100px] text-white/5 pointer-events-none rotate-12">security</span>
                <div className="relative z-10">
                    <h4 className="text-lg font-black mb-4">Why use AI?</h4>
                    <p className="text-sm text-white/70 leading-relaxed mb-6 font-medium">
                        Our AI assessment ensures fair pricing for your e-waste, eliminating the guesswork and manual appraisal delays.
                    </p>
                    <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/10">
                        <span className="material-symbols-outlined text-primary-light">verified_user</span>
                        <span className="text-[11px] font-bold">100% Secure Transaction</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
