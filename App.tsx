
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Scanner from './pages/Scanner';
import SessionLock from './components/SessionLock';
import Dealers from './pages/Dealers';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { Database } from './db';
import { Zap, Download, AlertTriangle, CheckCircle2, X, Settings as SettingsIcon, LogOut, Bell } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('scanner');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [pendingSearch, setPendingSearch] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const triggerHubSearch = (serial: string) => {
    setPendingSearch(serial);
    setActiveTab('scanner');
  };

  useEffect(() => {
    const init = async () => {
      await Database.init();
      const auth = localStorage.getItem('starline_auth');
      if (auth === 'true') setIsLoggedIn(true);
      setIsLoading(false);
    };
    init();

    const handleNotify = (e: any) => {
      const { message, type } = e.detail;
      showToast(message, type || 'success');
    };

    window.addEventListener('db-synced' as any, () => showToast('Database Synced'));
    window.addEventListener('app-notify' as any, handleNotify);

    // Backup Reminder Check
    const lastBackup = localStorage.getItem('lastBackupDate');
    if (lastBackup) {
      const days = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 3) {
        setTimeout(() => showToast('Backup Reminder: Less than 3 days since last backup. Please backup to SSD.', 'error'), 2000);
      }
    } else {
      setTimeout(() => showToast('Backup Reminder: No backup record found. please backup now.', 'error'), 2000);
    }

    return () => window.removeEventListener('app-notify' as any, handleNotify);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('starline_auth');
    setIsLoggedIn(false);
    setActiveTab('scanner');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'scanner': return <Scanner initialSearch={pendingSearch} onSearchHandled={() => setPendingSearch(null)} />;
      case 'dealers': return <Dealers onNavigateToHub={triggerHubSearch} />;
      case 'settings': return <Settings />;
      default: return <Scanner />;
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
      <div className="bg-blue-600 p-4 rounded-3xl shadow-2xl shadow-blue-500/40 animate-bounce">
        <Zap size={40} className="text-white" fill="currentColor" />
      </div>
      <div className="text-center">
        <h2 className="text-slate-900 font-bold text-lg">Starline Enterprise</h2>
        <p className="text-slate-400 font-medium text-sm">Synchronizing Registry...</p>
      </div>
    </div>
  );

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="flex h-screen bg-white text-slate-900 antialiased overflow-hidden">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/50">
        {toast && (
          <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-300">
            <div className={`px-5 py-4 rounded-xl shadow-2xl flex items-center space-x-4 border ${toast.type === 'success'
              ? 'bg-white border-emerald-100 text-emerald-800'
              : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}>
              {toast.type === 'success'
                ? <CheckCircle2 className="text-emerald-500" size={20} />
                : <AlertTriangle className="text-rose-500" size={20} />
              }
              <div className="flex flex-col text-left">
                <span className="font-bold text-[13px] tracking-tight">{toast.message}</span>
              </div>
              <button onClick={() => setToast(null)} className="ml-2 text-slate-300 hover:text-slate-500">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 no-print">
          <div className="flex items-center space-x-3 text-slate-400 text-sm font-medium">
            <span className="hover:text-slate-600 transition-colors cursor-default">Starline</span>
            <span>/</span>
            <span className="text-slate-900 font-bold capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={async () => {
                const folder = await Database.selectBackupFolder();
                if (folder) {
                  showToast('Starting Backup...', 'success');
                  const res = await Database.backupCustom(folder);
                  if (res.success) {
                    showToast(`Backup Saved: ${res.path}`, 'success');
                    localStorage.setItem('lastBackupDate', new Date().toISOString());
                  } else {
                    showToast(`Backup Failed: ${res.error}`, 'error');
                  }
                }
              }}
              className="flex items-center space-x-2 px-3 py-1.5 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-100 transition-all border border-slate-200"
            >
              <Download size={14} />
              <span>Backup to SSD</span>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <SessionLock />
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                <div className="bg-blue-600 w-full h-full flex items-center justify-center text-white text-[10px] font-bold">AD</div>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
