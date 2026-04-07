import React, { useState } from 'react';
import { Battery, Users, Zap, ChevronLeft, ChevronRight, Barcode, ShieldCheck, Sliders, Search, History, UserCircle, Scale, BarChart3, Layers, Calculator, Factory } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Database } from '../db';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  isCollapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, badge, isCollapsed }) => {
  const content = (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${active
        ? 'bg-blue-50/60 text-blue-700'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        } ${isCollapsed ? 'justify-center py-3' : 'space-x-2.5'}`}
    >
      <div className={`transition-colors duration-200 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </div>

      {!isCollapsed && (
        <>
          <span className={`flex-1 text-left text-[13px] font-medium tracking-tight transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-80'}`}>
            {label}
          </span>
          {(badge && badge > 0) ? (
            <span className="bg-rose-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full min-w-[14px] leading-none flex items-center justify-center shadow-sm">
              {badge}
            </span>
          ) : null}
        </>
      )}

      {isCollapsed && typeof badge === 'number' && badge > 0 ? (
        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border border-white rounded-full" />
      ) : null}

      {active && !isCollapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
      )}
      {active && isCollapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            {content}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 px-2.5 py-1.5 bg-slate-800 text-white text-[11px] font-medium rounded-md shadow-lg animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
              side="right"
              sideOffset={12}
            >
              {label} {badge && badge > 0 ? `(${badge})` : ''}
              <Tooltip.Arrow className="fill-slate-800" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return content;
};

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: string;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, userRole }) => {
  const isAdmin = userRole === 'ADMIN';
  const [counts, setCounts] = React.useState({ batches: 0, settlements: 0 });
  const [isCollapsed, setIsCollapsed] = useState(true);

  React.useEffect(() => {
    if (!isAdmin) return;

    const fetchCounts = async () => {
      try {
        const { batches, settlements } = await Database.getNotificationCounts();
        setCounts({ batches, settlements });
      } catch (e) {
        console.error('Failed to fetch notification counts', e);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    window.addEventListener('app-notify', fetchCounts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app-notify', fetchCounts);
    };
  }, [isAdmin]);

  const menuItems = [
    { id: 'scanner', label: 'Hub Trace', icon: <Barcode size={17} strokeWidth={activeTab === 'scanner' ? 2 : 1.75} />, roles: ['ADMIN', 'FACTORY_WORKER'] },
    { id: 'dealers', label: 'Dealers', icon: <Users size={17} strokeWidth={activeTab === 'dealers' ? 2 : 1.75} />, roles: ['ADMIN'] },
    { id: 'settlements', label: 'Settlements', icon: <Scale size={17} strokeWidth={activeTab === 'settlements' ? 2 : 1.75} />, roles: ['ADMIN'], badge: counts.settlements },
    { id: 'batches', label: 'Batches', icon: <Layers size={17} strokeWidth={activeTab === 'batches' ? 2 : 1.75} />, roles: ['ADMIN'], badge: counts.batches },
    { id: 'manufacturing', label: 'Factory Operations', icon: <Factory size={17} strokeWidth={activeTab === 'manufacturing' ? 2 : 1.75} />, roles: ['ADMIN'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole || ''));

  return (
    <div
      className={`bg-[#fcfdfd] h-screen flex flex-col shrink-0 z-50 border-r border-slate-200/60 no-print transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-[72px]' : 'w-56'}`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-7 bg-white border border-slate-200 p-1 text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm transition-all z-50 rounded"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={12} strokeWidth={2.5} /> : <ChevronLeft size={12} strokeWidth={2.5} />}
      </button>

        <div className={`pt-7 pb-2 transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-5'}`}>
        <button
          onClick={() => setActiveTab('release-notes')}
          className={`flex items-center mb-7 h-8 w-full rounded-xl transition-all duration-300 hover:bg-slate-50 ${isCollapsed ? 'justify-center px-0' : 'space-x-2.5 px-2'}`}
          title="Open Release Notes"
        >
          <div className="bg-slate-900 p-1.5 rounded-md text-white shadow-sm shrink-0 flex items-center justify-center">
            <Zap size={16} fill="currentColor" className={isCollapsed ? "opacity-90" : ""} />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-left-2 whitespace-nowrap text-left">
              <h1 className="text-[14px] font-bold text-slate-900 tracking-tight leading-none">Starline</h1>
              <p className="text-[9px] font-medium text-slate-500 tracking-wider mt-0.5 uppercase">Enterprise</p>
            </div>
          )}
        </button>

        <div className="space-y-0.5 mt-4">
          {!isCollapsed && (
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-3 mb-3 select-none shrink-0 whitespace-nowrap overflow-hidden text-ellipsis transition-opacity duration-300">
              Menu
            </p>
          )}
          {visibleMenuItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              badge={item.badge}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className={`mt-auto border-t border-slate-100/60 transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-4'}`}>
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  onClick={() => setActiveTab('controls')}
                  className={`w-full flex items-center rounded-lg transition-all duration-200 ${activeTab === 'controls'
                    ? 'bg-slate-100/80 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    } ${isCollapsed ? 'justify-center py-2.5' : 'space-x-2.5 px-3 py-2.5'}`}
                >
                  <Sliders size={17} strokeWidth={activeTab === 'controls' ? 2 : 1.75} className={`transition-colors duration-200 ${activeTab === 'controls' ? 'text-slate-700' : ''}`} />
                  {!isCollapsed && (
                    <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200">Settings</span>
                  )}
                </button>
              </Tooltip.Trigger>
              {isCollapsed && (
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="z-50 px-2.5 py-1.5 bg-slate-800 text-white text-[11px] font-medium rounded-md shadow-lg"
                    side="right"
                    sideOffset={12}
                  >
                    Settings
                    <Tooltip.Arrow className="fill-slate-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      )}
    </div>
  );
};

export default Navigation;
