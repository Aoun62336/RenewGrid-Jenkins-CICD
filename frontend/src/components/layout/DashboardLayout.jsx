import React, { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../../services/api';

export default function DashboardLayout({ sidebar: SidebarComponent, title, children }) {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const panelRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getMyNotifications();
      setNotifications(Array.isArray(data) ? data : (data.items || []));
    } catch {
      // silently fail — bell still renders
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();
    // Poll every 60s
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {/* ignore */}
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.allSettled(unread.map(n => notificationsAPI.markAsRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {React.createElement(SidebarComponent, {
        isOpen: isSidebarOpen,
        setIsOpen: setIsSidebarOpen,
      })}
      <div className="ml-0 md:ml-64 min-h-screen flex flex-col transition-all duration-300">
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-16 bg-white/85 backdrop-blur-md shadow-sm z-40 flex items-center justify-between px-4 md:px-8 transition-all duration-300">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              className="md:hidden p-2 text-slate-500 hover:text-primary rounded-lg focus:outline-none"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <h1 className="text-lg md:text-xl font-['Inter'] font-extrabold text-[#326669] truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-4 relative" ref={panelRef}>
            <button
              onClick={() => setShowPanel(p => !p)}
              className="text-slate-500 hover:text-[#326669] transition-colors relative p-2 rounded-full hover:bg-primary/10"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-white text-[9px] font-black leading-none px-0.5">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {showPanel && (
              <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-outline-variant overflow-hidden z-50">
                <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                  <h3 className="font-bold text-on-surface text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-primary font-bold hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">No notifications yet.</div>
                  ) : notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`p-4 cursor-pointer hover:bg-surface/60 transition-all ${!n.is_read ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                        <div>
                          <p className={`text-sm font-semibold ${!n.is_read ? 'text-on-surface' : 'text-slate-500'}`}>{n.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-300 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="mt-16 p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
