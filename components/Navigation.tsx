
import React from 'react';
import { Battery, Users, Zap, ChevronRight, Barcode, ShieldCheck, Sliders, Search, History, UserCircle, Scale, BarChart3, Layers } from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative ${active
      ? 'bg-blue-50 text-blue-700'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
  >
    <div className={`${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
      {icon}
    </div>
    <span className={`flex-1 text-left text-[13px] font-semibold tracking-tight ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
    {(badge && badge > 0) ? (
      <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm -mr-2 z-10">
        {badge}
      </span>
    ) : null}
    {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-l-full" />}
  </button>
);

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: string;
}

import { Database } from '../db'; // Add Database import

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, userRole }) => {
  const isAdmin = userRole === 'ADMIN';
  const [counts, setCounts] = React.useState({ batches: 0, settlements: 0 });

  React.useEffect(() => {
    if (!isAdmin) return;

    const fetchCounts = async () => {
      try {
        const { batches, settlements } = await Database.getNotificationCounts();
        setCounts({ batches, settlements });
        console.log('Fetched counts:', { batches, settlements });
      } catch (e) {
        console.error('Failed to fetch notification counts', e);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000); // 15s refresh
    window.addEventListener('app-notify', fetchCounts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app-notify', fetchCounts);
    };
  }, [isAdmin]);

  const menuItems = [
    { id: 'scanner', label: 'Hub Trace', icon: <Barcode size={18} strokeWidth={activeTab === 'scanner' ? 2.5 : 2} />, roles: ['ADMIN', 'FACTORY_WORKER'] },
    { id: 'dealers', label: 'Dealers', icon: <Users size={18} strokeWidth={activeTab === 'dealers' ? 2.5 : 2} />, roles: ['ADMIN'] },
    { id: 'settlements', label: 'Settlements', icon: <Scale size={18} strokeWidth={activeTab === 'settlements' ? 2.5 : 2} />, roles: ['ADMIN'], badge: counts.settlements },
    { id: 'batches', label: 'Batches', icon: <Layers size={18} strokeWidth={activeTab === 'batches' ? 2.5 : 2} />, roles: ['ADMIN'], badge: counts.batches },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} strokeWidth={activeTab === 'analytics' ? 2.5 : 2} />, roles: ['ADMIN'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole || ''));

  return (
    <div className="w-60 bg-white h-screen flex flex-col shrink-0 z-50 border-r border-slate-200 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] no-print">
      <div className="p-6">
        <div className="flex items-center space-x-2.5 mb-8">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-500/30">
            <Zap size={20} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-none uppercase">Starline</h1>
            <p className="text-[9px] font-bold text-slate-400 tracking-widest mt-0.5 uppercase">Enterprise OS</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">Core Registry</p>
          {visibleMenuItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              badge={item.badge}
            />
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="mt-auto border-t border-slate-100 p-4 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('controls')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'controls' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
          >
            <Sliders size={18} />
            <span className="text-[13px] font-semibold">Controls</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Navigation;
