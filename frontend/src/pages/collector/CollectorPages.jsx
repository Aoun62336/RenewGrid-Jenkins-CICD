import { customConfirm } from '../../components/common/popupService';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CollectorSidebar from '../../components/layout/CollectorSidebar';
import { collectorAPI, authAPI, BASE_URL } from '../../services/api';
import toast from 'react-hot-toast';
import ProfileImageCropper from '../../components/common/ProfileImageCropper';

// Reusable Collector page shell
function CollectorPage({ title, subtitle, children }) {
  return (
    <DashboardLayout sidebar={CollectorSidebar} title={title}>
      <div className="mb-8">
        <p className="text-primary font-bold tracking-widest text-xs uppercase mb-1">{subtitle}</p>
        <h2 className="text-3xl font-black text-on-surface -tracking-tight">{title}</h2>
      </div>
      {children}
    </DashboardLayout>
  );
}

// ─── Assigned Pickups ────────────────────────────────────────────────
export function AssignedPickups() {
  const navigate = useNavigate();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  const loadPickups = React.useCallback(() => {
    setLoading(true);

    collectorAPI.myPickups(page, PAGE_SIZE)
      .then((data) => {
        const raw = data.items || data || [];
        const filtered = raw.filter(
          (pickup) => pickup.status !== 'CANCELLED'
        );

        setPickups(filtered);
        setTotal(data.total || filtered.length);
      })
      .catch((err) => {
        console.error('Failed to load pickups', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPickups();
  }, [loadPickups]);

  const handleAccept = async (id) => {
    try {
      await collectorAPI.accept(id);
      toast.success(`Pickup #${id} accepted!`);
      loadPickups();
    } catch (err) {
      toast.error(err.message || 'Failed to accept');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    try {
      await collectorAPI.reject(id, reason);
      toast.success(`Pickup #${id} rejected.`);
      loadPickups();
    } catch (err) {
      toast.error(err.message || 'Failed to reject');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  if (loading && page === 1) return (
    <CollectorPage title="Assigned Pickups" subtitle="Today's Assignments">
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </CollectorPage>
  );

  return (
    <CollectorPage title="Assigned Pickups" subtitle="Today's Assignments">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Assigned', value: pickups.length, icon: 'assignment' },
          { label: 'Unaccepted', value: pickups.filter(p => p.status === 'ASSIGNED').length, icon: 'priority_high' },
          { label: 'Active', value: pickups.filter(p => ['IN_PROGRESS', 'PROOF_UPLOADED', 'COLLECTED'].includes(p.status)).length, icon: 'local_shipping' },
          { label: 'Completed', value: pickups.filter(p => ['DELIVERED', 'PROCESSING', 'RECYCLED', 'COMPLETED'].includes(p.status)).length, icon: 'check_circle' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-lg transition-all">
            <div className="p-3 bg-primary-container rounded-xl text-primary w-fit mb-4">
              <span className="material-symbols-outlined">{s.icon}</span>
            </div>
            <p className="text-sm text-slate-500 font-semibold uppercase">{s.label}</p>
            <p className="text-3xl font-black text-on-surface mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {pickups.length === 0 && <p className="text-slate-400 text-center py-8 font-medium">No pickups assigned yet.</p>}
        {pickups.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant hover:shadow-xl transition-all">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5 flex-1">
                <div className="flex flex-col items-center justify-center bg-surface-container rounded-xl w-20 py-3">
                  <span className="text-xs font-bold text-primary uppercase tracking-tighter">ID</span>
                  <span className="text-sm font-black text-primary">#{p.id}</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-lg">{p.address || 'N/A'}</h4>
                  <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {p.pickup_date ? new Date(p.pickup_date).toLocaleString() : 'No date set'}
                  </p>
                  {p.recycler && (
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">factory</span>
                      Deliver to: {p.recycler.full_name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  p.status === 'ASSIGNED' ? 'bg-amber-100 text-amber-700' :
                  p.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                  p.status === 'PROOF_UPLOADED' ? 'bg-purple-100 text-purple-700' :
                  p.status === 'COLLECTED' ? 'bg-teal-100 text-teal-700' :
                  p.status === 'DELIVERED' ? 'bg-indigo-100 text-indigo-700' :
                  ['PROCESSING', 'COMPLETED'].includes(p.status) ? 'bg-slate-100 text-slate-700' :
                  'bg-surface-container-high text-on-surface-variant'
                }`}>{p.status === 'IN_PROGRESS' ? 'START PROCESSING' : 
                    ['PROCESSING', 'RECYCLED', 'COMPLETED'].includes(p.status) ? 'DELIVERED' : p.status}</span>
                
                {p.status === 'ASSIGNED' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAccept(p.id)}
                      className="px-4 py-2 bg-teal-600 text-white text-xs font-black rounded-lg hover:bg-teal-700 transition-all shadow-sm flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">check</span> Accept
                    </button>
                    <button 
                      onClick={() => handleReject(p.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 text-xs font-black rounded-lg hover:bg-red-100 transition-all border border-red-200"
                    >
                      Reject
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => navigate('/collector/update-status')}
                  className="p-2 rounded-full hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {pickups.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 bg-white rounded-2xl shadow-sm border border-outline-variant flex items-center justify-between text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-4">
            <span>Showing {pickups.length} of {total} items</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface transition-all disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface transition-all disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </CollectorPage>
  );
}

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ─── Route Optimization ──────────────────────────────────────────────
export function RouteOptimization() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    collectorAPI.myPickups()
      .then(data => {
        const items = (data.items || data || []).map((p) => ({
          ...p,
          lat: p.latitude || (28.5355 + (Math.random() * 0.1 - 0.05)),
          lng: p.longitude || (77.3910 + (Math.random() * 0.1 - 0.05))
        }));
        setPickups(items.filter(p => !['COMPLETED', 'CANCELLED'].includes(p.status)));
      })
      .catch(err => console.error('Failed to load pickups', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <CollectorPage title="Route Optimization" subtitle="AI-Powered Navigation">
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </CollectorPage>
  );

  const center = pickups.length > 0 ? [pickups[0].lat, pickups[0].lng] : [28.5355, 77.3910];
  const positions = pickups.map(p => [p.lat, p.lng]);

  return (
    <CollectorPage title="Route Optimization" subtitle="AI-Powered Navigation">
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-outline-variant h-96 mb-8 overflow-hidden z-0">
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', borderRadius: '1rem', zIndex: 0 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {pickups.map((p, i) => (
            <Marker key={p.id} position={[p.lat, p.lng]}>
              <Popup>
                <strong>#{p.id}</strong><br />
                {p.address || 'No address'}<br />
                Stop {i + 1}
              </Popup>
            </Marker>
          ))}
          {positions.length > 1 && <Polyline positions={positions} color="#326669" weight={3} dashArray="5, 10" />}
        </MapContainer>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
        <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="w-2 h-6 bg-primary rounded-full"></span> Optimized Stop Sequence
        </h3>
        <div className="relative pl-8 space-y-6">
          {pickups.length === 0 && <p className="text-slate-400">No active pickups for route.</p>}
          {pickups.map((s, i) => (
            <div key={s.id} className="relative flex items-center gap-4">
              <div className={`absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center z-10 text-xs font-black ${i === 0 ? 'bg-primary text-white' : 'bg-white border-2 border-primary text-primary'}`}>
                {i + 1}
              </div>
              {i < pickups.length - 1 && <div className="absolute -left-5 top-6 w-0.5 h-full bg-primary/20 z-0"></div>}
              <div className="flex-1 flex items-center justify-between p-4 rounded-xl bg-surface hover:bg-primary-container/20 transition-all ml-4">
                <div>
                  <p className="font-bold text-on-surface">{s.address || 'Unknown Address'}</p>
                  <p className="text-xs text-slate-400">Pickup #{s.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">{s.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CollectorPage>
  );
}

// ─── Scan QR Code ────────────────────────────────────────────────────
export function ScanQRCode() {
  const [scans, setScans] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef(null);

  const handleStartPickup = async (rawCode) => {
    setScanError('');
    try {
      // Always verify the signed handoff credential on the server.
      const pickup = await collectorAPI.verifyQr(rawCode.trim());
      toast.success(`Verified pickup #${pickup.id}`);
      setScanResult(pickup);
      setScans(prev => [{ id: pickup.id, pickup, time: new Date().toLocaleTimeString() }, ...prev]);
    } catch (err) {
      setScanError(err.message || 'Pickup handoff verification failed');
    }
  };

  useEffect(() => {
    let scanner;
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scanner.render(
        async (decodedText) => {
          scanner.clear().catch(() => {});
          await handleStartPickup(decodedText);
        },
        (err) => console.warn('QR scan error:', err)
      );
      scannerRef.current = scanner;
    });
    return () => { scannerRef.current?.clear().catch(() => {}); };
  }, []);

  return (
    <CollectorPage title="Scan QR Code" subtitle="Verify Pickup">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <div className="bg-slate-900 rounded-3xl overflow-hidden relative p-4">
            <div id="qr-reader" className="w-full" />
          </div>
          {scanError && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">{scanError}</div>}
          {scanResult && (
            <div className="mt-4 p-6 bg-teal-50 border border-teal-200 rounded-2xl">
              <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-2">Scan Verified</p>
              <p className="font-bold text-on-surface">Pickup #{scanResult.id}</p>
              <p className="text-sm text-slate-500">{scanResult.address || 'No address'}</p>
              <p className="text-sm text-slate-500">Status: {scanResult.status}</p>
            </div>
          )}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant mt-6">
            <h3 className="text-lg font-bold text-on-surface mb-4">Or Enter Code Manually</h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter manual code (RG-...)"
                className="flex-1 px-4 py-3 rounded-xl border border-primary-light focus:ring-2 focus:ring-primary transition-all"
              />
              <button
                onClick={() => { if (manualCode.trim()) handleStartPickup(manualCode.trim()); }}
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              >Verify</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-4">Session Scans</h3>
            {scans.length === 0 ? <p className="text-sm text-slate-400 font-medium">No scans yet this session.</p> : (
              <div className="space-y-3">
                {scans.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{s.id}</p>
                        <p className="text-xs text-slate-400">{s.pickup?.address || 'N/A'} • {s.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </CollectorPage>
  );
}

// ─── Upload Proof ────────────────────────────────────────────────────
export function UploadProof() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [selectedPickupId, setSelectedPickupId] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    collectorAPI.myPickups()
      .then(data => setPickups((data.items || data || []).filter(p => !['DELIVERED', 'PROCESSING', 'RECYCLED', 'COMPLETED', 'CANCELLED'].includes(p.status))))
      .catch(err => console.error('Failed to load pickups', err));
  }, []);

  const handleFiles = (files) => {
    const newFiles = Array.from(files);
    setPreviews(prev => [...prev, ...newFiles].slice(0, 5));
  };
  const onDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const onDragLeave = () => setDragActive(false);
  const onDrop = (e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); };
  const onFileChange = (e) => { if (e.target.files?.length) handleFiles(e.target.files); };
  const removeFile = (index) => setPreviews(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!selectedPickupId) return toast.error('Please select a pickup.');
    if (!previews.length) return toast.error('Please add at least one photo.');
    setSubmitting(true);
    try {
      if (weight) {
        await collectorAPI.updateWeight(selectedPickupId, { final_collected_weight: parseFloat(weight) });
      }
      const formData = new FormData();
      formData.append('image', previews[0]);
      if (notes) formData.append('notes', notes);
      await collectorAPI.uploadProof(selectedPickupId, formData);
      toast.success('Proof uploaded! Please update the status now.');
      setPreviews([]);
      setSelectedPickupId('');
      setWeight('');
      setNotes('');
      // Redirect to Update Status as requested
      navigate('/collector/update-status');
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── step helpers ── */
  const step1Done = !!selectedPickupId;
  const step2Done = previews.length > 0;
  const selectedPickup = pickups.find(p => String(p.id) === String(selectedPickupId));

  const StepBadge = ({ n, done, active }) => (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-all ${done ? 'bg-[#326669] text-white' : active ? 'bg-[#326669]/15 text-[#326669] border-2 border-[#326669]' : 'bg-slate-100 text-slate-400'}`}>
      {done ? <span className="material-symbols-outlined text-base">check</span> : n}
    </div>
  );

  return (
    <CollectorPage title="Upload Proof" subtitle="Collection Evidence">

      {/* Progress strip */}
      <div className="flex items-center gap-0 mb-8 bg-white rounded-2xl px-8 py-5 shadow-sm border border-outline-variant overflow-hidden">
        {[
          { n: 1, label: 'Select Pickup',   done: step1Done,              active: !step1Done },
          { n: 2, label: 'Upload Photos',   done: step2Done,              active: step1Done && !step2Done },
          { n: 3, label: 'Add Details',     done: !!(weight || notes),    active: step2Done && !(weight || notes) },
          { n: 4, label: 'Submit',          done: false,                  active: step2Done },
        ].map((s, i, arr) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <StepBadge n={s.n} done={s.done} active={s.active} />
              <span className={`text-xs font-bold whitespace-nowrap ${s.done ? 'text-[#326669]' : s.active ? 'text-slate-700' : 'text-slate-400'}`}>{s.label}</span>
            </div>
            {i < arr.length - 1 && <div className={`flex-1 h-0.5 mx-3 rounded-full ${s.done ? 'bg-[#326669]' : 'bg-slate-100'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ── Left: Steps ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Step 1 – Select Pickup */}
          <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="flex items-center gap-4 px-8 py-5 border-b border-slate-50" style={{background:'linear-gradient(90deg,#f8fcfc,#fff)'}}>
              <StepBadge n={1} done={step1Done} active={!step1Done} />
              <div>
                <p className="font-black text-on-surface">Select Pickup</p>
                <p className="text-xs text-slate-400">Choose which job this proof belongs to</p>
              </div>
              {step1Done && <span className="ml-auto text-xs font-bold text-[#326669] bg-[#e8f2f2] px-3 py-1 rounded-full">Selected</span>}
            </div>
            <div className="p-8">
              {pickups.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#e8f2f2] flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-[#326669] text-2xl">local_shipping</span>
                  </div>
                  <p className="text-slate-500 font-semibold text-sm">No eligible pickups found.</p>
                  <p className="text-slate-400 text-xs mt-1">Only In-Progress pickups can accept proof uploads.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pickups.map(p => (
                    <label key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${String(selectedPickupId) === String(p.id) ? 'border-[#326669] bg-[#f0fafa]' : 'border-slate-100 hover:border-[#326669]/30 hover:bg-slate-50'}`}>
                      <input type="radio" name="pickup" value={p.id} checked={String(selectedPickupId) === String(p.id)} onChange={e => setSelectedPickupId(e.target.value)} className="accent-[#326669]" />
                      <div className="w-10 h-10 rounded-xl bg-[#e8f2f2] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#326669] text-lg">local_shipping</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-on-surface">Pickup #{p.id}</p>
                        <p className="text-xs text-slate-500 truncate">{p.address || 'No address'}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">{p.status?.replace('_',' ')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 2 – Upload Photos */}
          <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="flex items-center gap-4 px-8 py-5 border-b border-slate-50" style={{background:'linear-gradient(90deg,#f8fcfc,#fff)'}}>
              <StepBadge n={2} done={step2Done} active={step1Done && !step2Done} />
              <div>
                <p className="font-black text-on-surface">Upload Photos</p>
                <p className="text-xs text-slate-400">Drag &amp; drop or click to browse (max 5)</p>
              </div>
              {step2Done && <span className="ml-auto text-xs font-bold text-[#326669] bg-[#e8f2f2] px-3 py-1 rounded-full">{previews.length} photo{previews.length > 1 ? 's' : ''} added</span>}
            </div>
            <div className="p-8">
              <div
                className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 py-14 px-8 text-center cursor-pointer transition-all duration-300 ${dragActive ? 'border-[#326669] bg-[#f0fafa] scale-[1.01]' : 'border-slate-200 hover:border-[#326669]/50 hover:bg-slate-50'}`}
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" multiple className="hidden" />
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${dragActive ? 'bg-[#326669] scale-110' : 'bg-[#e8f2f2]'}`}>
                  <span className={`material-symbols-outlined text-4xl transition-colors ${dragActive ? 'text-white' : 'text-[#326669]'}`}>add_a_photo</span>
                </div>
                <div>
                  <p className="font-bold text-slate-700">{dragActive ? 'Drop to upload!' : 'Drag photos here'}</p>
                  <p className="text-sm text-slate-400 mt-1">or <span className="text-[#326669] font-bold underline underline-offset-2">browse files</span> · JPG, PNG, WEBP</p>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Uploaded ({previews.length}/5)</p>
                  <div className="flex flex-wrap gap-3">
                    {previews.map((file, idx) => (
                      <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm hover:border-[#326669]/40 transition-all">
                        <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                        <button onClick={e => { e.stopPropagation(); removeFile(idx); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-sm text-red-500">close</span>
                        </button>
                        {idx === 0 && <span className="absolute bottom-1 left-1 bg-[#326669] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Primary</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 3 – Details */}
          <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="flex items-center gap-4 px-8 py-5 border-b border-slate-50" style={{background:'linear-gradient(90deg,#f8fcfc,#fff)'}}>
              <StepBadge n={3} done={!!(weight || notes)} active={step2Done} />
              <div>
                <p className="font-black text-on-surface">Confirm Details</p>
                <p className="text-xs text-slate-400">Add weight &amp; optional notes</p>
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Actual Weight (kg)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">scale</span>
                  <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
                    placeholder="e.g. 12.5"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-[#326669] focus:ring-2 focus:ring-[#326669]/20 outline-none transition-all font-semibold text-on-surface" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Notes <span className="text-slate-300 font-normal normal-case tracking-normal">(optional)</span></label>
                <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any observations about the pickup condition, item types, etc."
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-[#326669] focus:ring-2 focus:ring-[#326669]/20 outline-none transition-all resize-none text-sm text-on-surface" />
              </div>
            </div>
          </div>

        </div>

        {/* ── Right: Summary + Submit ── */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-4">

            {/* Summary card */}
            <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50" style={{background:'linear-gradient(135deg,#326669,#1a4a4c)'}}>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Submission Summary</p>
                <h4 className="text-white font-black text-lg mt-0.5">Review &amp; Submit</h4>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${step1Done ? 'bg-[#e8f2f2]' : 'bg-slate-100'}`}>
                    <span className={`material-symbols-outlined text-base ${step1Done ? 'text-[#326669]' : 'text-slate-300'}`}>local_shipping</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Pickup</p>
                    {step1Done
                      ? <p className="text-sm font-bold text-on-surface truncate">#{selectedPickup?.id} — {selectedPickup?.address || 'N/A'}</p>
                      : <p className="text-sm text-slate-300">Not selected</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${step2Done ? 'bg-[#e8f2f2]' : 'bg-slate-100'}`}>
                    <span className={`material-symbols-outlined text-base ${step2Done ? 'text-[#326669]' : 'text-slate-300'}`}>photo_library</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Photos</p>
                    <p className={`text-sm font-bold ${step2Done ? 'text-on-surface' : 'text-slate-300'}`}>{step2Done ? `${previews.length} photo${previews.length > 1 ? 's' : ''} ready` : 'None added'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${weight ? 'bg-[#e8f2f2]' : 'bg-slate-100'}`}>
                    <span className={`material-symbols-outlined text-base ${weight ? 'text-[#326669]' : 'text-slate-300'}`}>scale</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Weight</p>
                    <p className={`text-sm font-bold ${weight ? 'text-on-surface' : 'text-slate-300'}`}>{weight ? `${weight} kg` : 'Not entered'}</p>
                  </div>
                </div>

                {/* Primary photo preview */}
                {previews.length > 0 && (
                  <div className="rounded-xl overflow-hidden border border-slate-100 mt-2">
                    <img src={URL.createObjectURL(previews[0])} alt="Primary" className="w-full h-36 object-cover" />
                    <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-2">Primary Photo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !step1Done || !step2Done}
              className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-300 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{background: (step1Done && step2Done) ? 'linear-gradient(135deg,#326669,#1a4a4c)' : undefined, color: 'white'}}
            >
              {submitting
                ? <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span> Submitting...</span>
                : <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined">upload</span> Submit Proof</span>}
            </button>
            {(!step1Done || !step2Done) && (
              <p className="text-center text-xs text-slate-400 font-medium">
                {!step1Done ? '① Select a pickup first' : '② Add at least one photo'}
              </p>
            )}

          </div>
        </div>

      </div>
    </CollectorPage>
  );
}

// ─── Update Status ───────────────────────────────────────────────────
export function UpdateStatus() {
  const navigate = useNavigate();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPickups = () => {
    setLoading(true);
    collectorAPI.myPickups()
      .then(data => setPickups((data.items || data || []).filter(p => !['DELIVERED', 'PROCESSING', 'RECYCLED', 'COMPLETED', 'CANCELLED'].includes(p.status))))
      .catch(err => console.error('Failed to load pickups', err))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadPickups(); }, []);

  const triggerTransition = async (pickup, nextState) => {
    try {
      if (nextState === 'ACCEPTED') await collectorAPI.accept(pickup.id);
      else if (nextState === 'COLLECTED') await collectorAPI.collect(pickup.id);
      else if (nextState === 'DELIVERED') await collectorAPI.handover(pickup.id);
      
      toast.success(`Transition successful!`);
      loadPickups();
    } catch (err) {
      toast.error(err.message || 'Transition failed');
    }
  };

  return (
    <CollectorPage title="Update Status" subtitle="Pickup Progress">
      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden mb-8">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface">Active Workflow</h3>
          <span className="text-xs font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">Enforce State Machine</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {pickups.length === 0 && <p className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No active pickups found.</p>}
            {pickups.map((p) => (
              <div key={p.id} className="p-8 hover:bg-surface/50 transition-all border-b border-outline-variant last:border-0">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left: Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black text-xl border border-primary/20 shadow-sm">#{p.id}</div>
                      <div>
                        <p className="text-sm font-black text-primary uppercase tracking-widest mb-0.5">Current Status</p>
                        <p className="text-xl font-black text-on-surface -tracking-tight">
                          {p.status === 'IN_PROGRESS' ? 'START PROCESSING' : p.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-surface p-4 rounded-2xl border border-outline-variant">
                      <div className="flex items-center gap-2 text-on-surface-variant mb-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        <span className="text-xs font-bold uppercase tracking-tight">Pickup Address</span>
                      </div>
                      <p className="text-sm font-semibold text-on-surface">{p.address || 'N/A'}</p>
                    </div>

                    {p.collector_proof && (
                      <div className="space-y-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uploaded Proof</p>
                         <div className="relative group w-32 h-32 rounded-xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-md transition-all">
                            <img 
                              src={p.collector_proof.image_url.startsWith('http') ? p.collector_proof.image_url : `${BASE_URL}${p.collector_proof.image_url}`} 
                              alt="Proof" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                         </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right: Actions */}
                  <div className="flex flex-col justify-center items-center lg:items-end gap-4 min-w-[200px]">
                    {p.status === 'ASSIGNED' && (
                        <button onClick={() => triggerTransition(p, 'ACCEPTED')} className="w-full py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-700 hover:-translate-y-1 transition-all">Accept Job</button>
                    )}
                    {p.status === 'IN_PROGRESS' && (
                        <div className="text-center lg:text-right space-y-3">
                            <p className="text-xs font-bold text-amber-600 flex items-center gap-1 justify-center lg:justify-end">
                                <span className="material-symbols-outlined text-sm">info</span>
                                Proof upload required
                            </p>
                            <button onClick={() => navigate('/collector/upload-proof')} className="px-8 py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-primary/40 transition-all flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">upload</span>
                                Upload Proof Now
                            </button>
                        </div>
                    )}
                    {p.status === 'PROOF_UPLOADED' && (
                        <button onClick={() => triggerTransition(p, 'COLLECTED')} className="w-full py-4 bg-teal-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-teal-700 hover:-translate-y-1 transition-all">Mark as Collected</button>
                    )}
                    {p.status === 'COLLECTED' && (
                        <button onClick={() => triggerTransition(p, 'DELIVERED')} className="w-full py-4 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-700 hover:-translate-y-1 transition-all">Hand Over to Recycler</button>
                    )}
                    {['DELIVERED', 'PROCESSING', 'RECYCLED', 'COMPLETED'].includes(p.status) && (
                        <div className="flex flex-col items-center lg:items-end gap-2">
                            <div className="flex items-center gap-2 text-teal-600 bg-teal-50 px-4 py-2 rounded-full border border-teal-100">
                                <span className="material-symbols-outlined text-sm">verified</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Workflow Finished</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Visible on Recycler Portal</p>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollectorPage>
  );
}

// ─── Collector Settings ──────────────────────────────────────────────
export function CollectorSettings() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone_number: '', vehicle_number: '' });
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    authAPI.me()
      .then(user => {
        setForm({
          full_name: user.full_name || '',
          email: user.email || '',
          phone_number: user.phone_number || '',
          vehicle_number: user.vehicle_number || '',
        });
        if (user.profile_image) {
          setImagePreview(user.profile_image.startsWith('http') ? user.profile_image : `${BASE_URL}${user.profile_image}`);
        }
      })
      .catch(err => console.error('Failed to load profile', err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile(form);
      toast.success('Profile saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (await customConfirm('CRITICAL: Are you sure you want to delete your account? This action is permanent and cannot be undone.')) {
      try {
        await authAPI.deleteAccount();
        toast.success('Account deleted successfully. Logging out...');
        setTimeout(() => {
          localStorage.clear();
          window.location.replace('/login');
        }, 2000);
      } catch (err) {
        toast.error(err.message || 'Failed to delete account');
      }
    }
  };

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <CollectorPage title="Settings" subtitle="Account &amp; Preferences">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span> Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                <input type="text" value={form.full_name} onChange={set('full_name')} className="w-full px-4 py-3 rounded-xl border border-primary-light" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input type="email" value={form.email} disabled className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                <input type="tel" value={form.phone_number} onChange={set('phone_number')} className="w-full px-4 py-3 rounded-xl border border-primary-light" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Vehicle Number</label>
                <input type="text" value={form.vehicle_number} onChange={set('vehicle_number')} className="w-full px-4 py-3 rounded-xl border border-primary-light" />
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="mt-6 px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="bg-red-50 rounded-3xl p-8 border border-red-100">
            <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">warning</span> Danger Zone
            </h3>
            <p className="text-sm text-red-600/80 mb-6 font-medium leading-relaxed">
                Deleting your account will permanently remove your profile, collection history, and outstanding earnings. This action cannot be reversed.
            </p>
            <button 
                onClick={handleDeleteAccount}
                className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all"
            >
                Permanently Delete Account
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary rounded-2xl p-6 text-white text-center shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="mb-4">
                <ProfileImageCropper 
                  currentImage={imagePreview?.startsWith('http') ? imagePreview : (imagePreview ? `${BASE_URL}/${imagePreview}` : '')} 
                  onImageUpdated={(url) => setImagePreview(url)}
                  size="w-24 h-24"
                  role="collector"
                />
              </div>
              <h4 className="font-bold">{form.full_name || 'Collector'}</h4>
              <p className="text-xs text-white/70 mt-1 uppercase tracking-widest font-black">Verified Collector</p>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface mb-4">Security</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/collector/change-password')}
                className="w-full p-4 rounded-xl border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-primary">lock</span>
                <span className="text-sm font-bold text-on-surface">Change Password</span>
                <span className="material-symbols-outlined text-slate-400 ml-auto text-sm">arrow_forward_ios</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </CollectorPage>
  );
}
