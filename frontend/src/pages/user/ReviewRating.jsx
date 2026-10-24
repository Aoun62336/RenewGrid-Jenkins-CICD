import { customAlert } from '../../components/common/popupService';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserSidebar from '../../components/layout/UserSidebar';
import { pickupAPI } from '../../services/api';

export default function ReviewRating() {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [review, setReview] = useState('');
  const [selectedPickupId, setSelectedPickupId] = useState('');
  const [pickups, setPickups] = useState([]);
  const [pastReviews, setPastReviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Load completed pickups for the dropdown
    pickupAPI.myRequests({ status: 'COMPLETED', page_size: 50 })
      .then(data => setPickups(data.items || data || []))
      .catch(err => console.error('Failed to load pickups:', err));

    // Load past reviews
    pickupAPI.reviews?.()
      .then(data => setPastReviews(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPickupId || rating === 0) return;
    setSubmitting(true);
    try {
      await pickupAPI.submitReview(selectedPickupId, { rating, comment: review });
      setSubmitted(true);
      // Reload reviews after success
      pickupAPI.reviews?.()
        .then(data => setPastReviews(Array.isArray(data) ? data : []))
        .catch(() => {});
      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setReview('');
        setSelectedPickupId('');
      }, 3000);
    } catch (err) {
      customAlert(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPickup = pickups.find(p => String(p.id) === String(selectedPickupId));
  // Set of pickup IDs the current user has already reviewed
  const reviewedPickupIds = new Set(pastReviews.map(r => String(r.pickup_id)));
  const alreadyReviewed = selectedPickupId && reviewedPickupIds.has(String(selectedPickupId));


  return (
    <DashboardLayout sidebar={UserSidebar} title="Review & Rating">
      <div className="mb-8">
        <p className="text-primary font-bold tracking-widest text-xs uppercase mb-1">Feedback</p>
        <h2 className="text-3xl font-black text-on-surface -tracking-tight">Review &amp; Rating</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Review Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span> Submit a Review
            </h3>

            {submitted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-teal-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h4 className="text-xl font-black text-on-surface mb-2">Review Submitted!</h4>
                <p className="text-slate-500 text-sm">Thank you for your feedback. It helps improve our service.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Pickup Select */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Completed Pickup</label>
                  <select
                    value={selectedPickupId}
                    onChange={(e) => setSelectedPickupId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white text-on-surface"
                    required
                  >
                    <option value="">Choose a pickup to review...</option>
                    {pickups.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} — {p.address || 'No address'} ({p.pickup_date ? new Date(p.pickup_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'})
                        {reviewedPickupIds.has(String(p.id)) ? ' ✓ Reviewed' : ''}
                      </option>
                    ))}
                  </select>
                  {pickups.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">No completed pickups found.</p>
                  )}
                </div>

                {/* Pickup Preview */}
                {selectedPickup && (
                  <div className={`flex items-center gap-4 p-4 rounded-2xl border ${alreadyReviewed ? 'bg-amber-50 border-amber-200' : 'bg-primary-container/20 border-primary/10'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${alreadyReviewed ? 'bg-amber-100 text-amber-700' : 'bg-primary-container text-primary'}`}>
                      #{selectedPickup.id}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{selectedPickup.address || '—'}</p>
                      <p className="text-sm text-slate-500">{selectedPickup.status}</p>
                      {alreadyReviewed && (
                        <p className="text-xs font-bold text-amber-600 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">info</span>
                          You have already submitted a review for this pickup.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Star Rating */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Your Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <span
                          className={`material-symbols-outlined text-4xl transition-colors ${star <= (hovered || rating) ? 'text-amber-400' : 'text-slate-200'}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >star</span>
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-3 text-sm font-bold text-slate-600">
                        {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Your Review</label>
                  <textarea
                    rows={4}
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Share your experience — punctuality, handling, professionalism..."
                    className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">{review.length}/500 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={!selectedPickupId || rating === 0 || submitting || alreadyReviewed}
                  className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="material-symbols-outlined">star</span>
                  {submitting ? 'Submitting...' : alreadyReviewed ? 'Already Reviewed' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-5 flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span> Your Past Reviews
            </h3>
            {pastReviews.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No reviews submitted yet.</p>
            ) : (
              <div className="space-y-4">
                {pastReviews.map((r, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-surface border border-outline-variant">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-on-surface text-sm">Pickup #{r.pickup_id}</p>
                      <span className="text-xs text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={`material-symbols-outlined text-sm ${s <= r.rating ? 'text-amber-400' : 'text-slate-200'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                      <span className="text-xs text-slate-500 ml-1">{r.rating}.0</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{r.comment || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips Card */}
          <div className="bg-primary rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">tips_and_updates</span> Review Tips
              </h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">check_circle</span> Be honest and specific about your experience</li>
                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">check_circle</span> Mention punctuality, care, and professionalism</li>
                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">check_circle</span> Reviews help collectors improve their service</li>
              </ul>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-white/5">star</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
