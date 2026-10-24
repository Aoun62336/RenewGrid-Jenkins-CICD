import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RecyclerSidebar from '../../components/layout/RecyclerSidebar';
import { recyclerAPI, getUser } from '../../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const user     = getUser();

  const [assignedWaste, setAssignedWaste] = useState([]);
  const [inventory,     setInventory]     = useState({ total: 0 });
  const [stats,         setStats]         = useState({ collected: 0, processing: 0, completed: 0 });
  const [loading,       setLoading]       = useState(true); // eslint-disable-line no-unused-vars

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wasteRes, invRes] = await Promise.all([
          recyclerAPI.assignedWaste(1, 20),
          recyclerAPI.inventory(1, 20),
        ]);
        const items = wasteRes.items || [];
        setAssignedWaste(items.slice(0, 5));
        setInventory({ total: invRes.total || 0 });
        setStats({
          collected:  wasteRes.total || 0,
          processing: items.filter(p => p.status === 'PROCESSING').length,
          completed:  invRes.total || 0,
        });
      } catch (err) { console.error('Dashboard load error:', err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const statusBadge = (s) => {
    const map = {
      COLLECTED:  'bg-blue-50 text-blue-700 border border-blue-200',
      DELIVERED:  'bg-indigo-50 text-indigo-700 border border-indigo-200',
      PROCESSING: 'bg-amber-50 text-amber-700 border border-amber-200',
      RECYCLED:   'bg-green-50 text-green-700 border border-green-200',
      COMPLETED:  'bg-teal-50 text-teal-700 border border-teal-200',
    };
    return map[s] ?? 'bg-slate-50 text-slate-600 border border-slate-200';
  };

  return (
    <div className="bg-[#f8fcfc] text-slate-900 min-h-screen relative">
      <RecyclerSidebar />

      <div className="ml-64 min-h-screen flex flex-col">
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-20 bg-white/90 backdrop-blur-xl z-40 flex items-center justify-between px-10 border-b border-[#326669]/10">
          <h1 className="text-2xl font-black text-[#326669]">Recycler Dashboard</h1>
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <button className="text-slate-400 hover:text-[#326669] transition-colors relative">
              <span className="material-symbols-outlined text-2xl">notifications</span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#326669] rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <main className="mt-24 p-10 flex-1">
          {/* Welcome Banner */}
          <div className="relative mb-10 p-10 rounded-3xl bg-gradient-to-r from-[#326669] to-[#4a8a8d] overflow-hidden shadow-lg">
            <div className="relative z-10">
              <p className="text-white/80 font-medium tracking-wider text-sm uppercase mb-2">Operational Hub</p>
              <h2 className="text-4xl font-black text-white">Welcome back, {user?.full_name ?? 'Recycler'}</h2>
              <p className="text-white/70 mt-2 max-w-lg">Manage your waste processing cycles and inventory with high precision. Your facility is currently active.</p>
            </div>
            <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-[200px] text-white/10 select-none">factory</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { label: 'Available Waste', val: stats.collected, unit: 'Items', icon: 'auto_delete', color: 'text-blue-600' },
              { label: 'In Processing', val: stats.processing, unit: 'Batches', icon: 'precision_manufacturing', color: 'text-amber-600' },
              { label: 'Processed Total', val: stats.completed, unit: 'Items', icon: 'inventory', color: 'text-teal-600' },
            ].map((m, i) => (
              <div key={i} className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-[#326669]/5 transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center ${m.color}`}>
                    <span className="material-symbols-outlined">{m.icon}</span>
                  </div>
                </div>
                <h3 className="text-4xl font-black text-slate-900">{m.val} <span className="text-sm text-slate-400 font-medium">{m.unit}</span></h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">{m.label}</p>
                <div className="mt-6 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#326669] w-[65%] rounded-full opacity-60"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Inventory & Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <div className="lg:col-span-1 bg-[#326669] rounded-3xl p-8 text-white shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">Inventory Levels</h3>
                <p className="text-white/60 text-sm">Total items currently held in facility.</p>
                <h2 className="text-6xl font-black mt-8">{inventory.total}</h2>
                <p className="text-white/80 font-medium mt-2">Active Stock Units</p>
              </div>
              <button onClick={() => navigate('/inventory-management')}
                className="mt-8 bg-white text-[#326669] font-bold py-3 rounded-2xl hover:bg-slate-100 transition-colors">
                Manage Inventory
              </button>
            </div>

            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              {[
                { label: 'Process Waste', icon: 'recycling', path: '/collected-waste-listing' },
                { label: 'History Logs', icon: 'history', path: '/processing-history' },
                { label: 'Account Settings', icon: 'manage_accounts', path: '/recycler/profile' },
                { label: 'Facility Map', icon: 'map', path: '#' },
              ].map((a, i) => (
                <button key={i} onClick={() => navigate(a.path)}
                  className="flex items-center gap-4 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:translate-y-[-4px] hover:shadow-md transition-all">
                  <div className="w-14 h-14 bg-[#f0fafa] rounded-2xl flex items-center justify-center text-[#326669]">
                    <span className="material-symbols-outlined">{a.icon}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-800">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Recent Waste Assignments</h3>
              <button onClick={() => navigate('/collected-waste-listing')} className="text-[#326669] font-bold text-sm hover:underline">View All</button>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {['ID', 'Source Address', 'Weight', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assignedWaste.map(p => (
                  <tr key={p.id} className="hover:bg-[#f8fcfc] transition-colors">
                    <td className="px-8 py-5 font-black text-[#326669]">#{p.id}</td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-600 truncate max-w-[200px]">{p.address}</td>
                    <td className="px-8 py-5 font-bold text-slate-900">{p.final_collected_weight}kg</td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase ${statusBadge(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="px-8 py-5">
                      <button onClick={() => navigate(`/waste-receipt/${p.id}`)}
                        className="text-[#326669] bg-[#326669]/10 px-5 py-2 rounded-xl font-bold text-sm hover:bg-[#326669] hover:text-white transition-all">
                        Process
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
