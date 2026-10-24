import { customAlert } from '../../components/common/popupService';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserSidebar from '../../components/layout/UserSidebar';
import { wasteAPI, pickupAPI } from '../../services/api';

export default function SchedulePickup() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  
  const [address, setAddress] = useState({ street: '', city: '', pincode: '', latitude: null, longitude: null });
  const [myUploads, setMyUploads] = useState([]);
  const [selectedWasteId, setSelectedWasteId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const timeSlots = ['09:00 AM', '10:30 AM', '12:00 PM', '01:30 PM', '03:00 PM', '04:30 PM'];

  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const res = await wasteAPI.myUploads(1, 50);
        setMyUploads(res.items || []);
        if (res.items && res.items.length > 0) {
          setSelectedWasteId(res.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load uploads:', err);
      }
    };
    fetchUploads();
  }, []);

  const handleSchedule = async () => {
    setError('');
    setSuccessMsg('');
    
    if (!selectedWasteId) {
      setError('Please select an item for pickup.');
      return;
    }
    if (!address.street || !address.city || !address.pincode) {
      setError('Please fill in the complete address.');
      return;
    }
    
    // Combine date and time slot into a valid ISO string or just send the date if backend allows
    // Backend schema allows pickup_date as datetime. We'll combine selectedDate and selectedSlot.
    let pickupDateTime = null;
    if (selectedDate && selectedSlot) {
      // Very basic parsing for 12hr format
      const isPM = selectedSlot.includes('PM');
      let [hours, mins] = selectedSlot.replace(/ AM| PM/, '').split(':');
      hours = parseInt(hours, 10);
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      
      const d = new Date(selectedDate);
      d.setHours(hours, parseInt(mins, 10), 0);
      pickupDateTime = d.toISOString();
    }

    const fullAddress = `${address.street}, ${address.city}, ${address.pincode}`;

    setLoading(true);
    try {
      const res = await pickupAPI.create({
        waste_id: parseInt(selectedWasteId, 10),
        pickup_date: pickupDateTime,
        address: fullAddress,
        latitude: address.latitude,
        longitude: address.longitude,
      });
      setSuccessMsg('Pickup scheduled successfully! Redirecting...');
      setTimeout(() => {
        navigate(`/pickup/${res.id}/track`);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to schedule pickup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout sidebar={UserSidebar} title="Schedule Pickup">
      <div className="mb-8">
        <p className="text-primary font-bold tracking-widest text-xs uppercase mb-1">Book Collection</p>
        <h2 className="text-3xl font-black text-on-surface -tracking-tight">Schedule a Pickup</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-semibold border border-red-200">{error}</div>}
          {successMsg && <div className="p-4 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold border border-teal-200">{successMsg}</div>}

          {/* Address */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="w-2 h-6 bg-primary rounded-full"></span> Pickup Address</span>
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => setAddress({ ...address, latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                      () => customAlert('Location access denied.')
                    );
                  }
                }}
                className="text-sm font-bold text-primary flex items-center gap-1 hover:underline"
              >
                <span className="material-symbols-outlined text-sm">my_location</span>
                {address.latitude ? 'Location Detected' : 'Detect Location'}
              </button>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Street Address</label>
                <input type="text" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} placeholder="Enter your street address" className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                <input type="text" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} placeholder="City" className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pincode</label>
                <input type="text" value={address.pincode} onChange={(e) => setAddress({...address, pincode: e.target.value})} placeholder="Pincode" className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span> Select Date & Time
            </h3>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Date</label>
              <input type="date" min={new Date().toISOString().split("T")[0]} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full md:w-64 px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Available Time Slots</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${
                      selectedSlot === slot
                        ? 'border-primary bg-primary text-white shadow-lg'
                        : 'border-primary/10 hover:border-primary/30 text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">schedule</span> {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Item Summary */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span> Item for Pickup
              </h3>
              <button onClick={() => navigate('/user/upload-ewaste')} className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">add</span> Upload New
              </button>
            </div>
            
            <div className="mb-6">
              {myUploads.length === 0 ? (
                <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold border border-amber-200">
                  You haven't uploaded any e-waste yet. Please upload an item first.
                </div>
              ) : (
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  value={selectedWasteId}
                  onChange={(e) => setSelectedWasteId(e.target.value)}
                >
                  <option value="" disabled>Select an uploaded item</option>
                  {myUploads.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title} — {item.estimated_weight}kg ({item.category})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button 
              onClick={handleSchedule} 
              disabled={loading || myUploads.length === 0}
              className="mt-6 w-full py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><span className="material-symbols-outlined animate-spin">progress_activity</span> Scheduling...</>
              ) : (
                <><span className="material-symbols-outlined">event_available</span> Confirm Pickup Schedule</>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
            <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">info</span> Pickup Info
            </h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>Free pickups for items over 5 kg</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>Collector arrives within 30-min window</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>Real-time tracking available</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>Earn reward points per pickup</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-4">Estimated Rewards</h3>
            <div className="text-center py-6">
              <p className="text-5xl font-black text-primary">+250</p>
              <p className="text-sm text-slate-500 mt-2 font-medium">Green Points for this pickup</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
