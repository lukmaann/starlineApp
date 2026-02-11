
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Scanner from './pages/Scanner';
import SessionLock from './components/SessionLock';
import Dealers from './pages/Dealers';
import Settlements from './pages/Settlements';
import Controls from './pages/Controls';
import Login from './pages/Login';
import { Database } from './db';
import { Zap, Download, AlertTriangle, CheckCircle2, X, Settings as SettingsIcon, LogOut, Bell } from 'lucide-react';
import { useNavigationHistory } from './hooks/useNavigationHistory';
import NavigationControls from './components/NavigationControls';
import { AuthSession } from './utils/AuthSession';

const App: React.FC = () => {
  const {
    activeTab,
    history,
    historyIndex,
    navigate,
    goBack,
    goForward,
    clearHistory,
    savePageState,
    getPageState,
    reset: resetNavigation
  } = useNavigationHistory('scanner');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [pendingSearch, setPendingSearch] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const triggerHubSearch = (serial: string) => {
    setPendingSearch(serial);
    navigate('scanner');
  };

  useEffect(() => {
    const init = async () => {
      await Database.init();
      const auth = localStorage.getItem('starline_auth');
      if (auth === 'true') setIsLoggedIn(true);
      // Initialize auto-lock timer
      AuthSession.initialize();
      setIsLoading(false);
    };
    init();

    const handleNotify = (e: any) => {
      const { message, type } = e.detail;
      showToast(message, type || 'success');
    };

    window.addEventListener('db-synced' as any, () => showToast('Database Synced'));
    window.addEventListener('app-notify' as any, handleNotify);

    const handleAppRefresh = () => {
      setIsRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000); // 20ms refresh effect as requested
    };
    window.addEventListener('app-refresh' as any, handleAppRefresh);

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

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    resetNavigation();
    setShowLogoutConfirm(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'scanner':
        return (
          <Scanner
            initialSearch={pendingSearch}
            onSearchHandled={() => setPendingSearch(null)}
            initialState={getPageState('scanner')}
            onStateChange={(s) => savePageState('scanner', s)}
            active={activeTab === 'scanner'}
          />
        );
      case 'dealers':
        return (
          <Dealers
            onNavigateToHub={(serial) => {
              setPendingSearch(serial);
              navigate('scanner');
            }}
            initialState={getPageState('dealers')}
            onStateChange={(s) => savePageState('dealers', s)}
            active={activeTab === 'dealers'}
          />
        );
      case 'settlements':
        return (
          <Settlements
            onNavigateToHub={(serial) => {
              setPendingSearch(serial);
              navigate('scanner');
            }}
          />
        );
      case 'controls':
        return <Controls active={activeTab === 'controls'} />;
      default:
        return null;
    }
  };

  if (isLoading || isRefreshing) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
      <div className="bg-blue-600 p-4 rounded-3xl shadow-2xl shadow-blue-500/40 animate-bounce">
        <Zap size={40} className="text-white" fill="currentColor" />
      </div>
      <div className="text-center">
        <h2 className="text-slate-900 font-bold text-lg">Starline Batteries</h2>
        <p className="text-slate-400 font-medium text-sm">{isRefreshing ? 'Refreshing registry...' : 'Synchronizing Registry...'}</p>
      </div>
    </div>
  );

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="flex h-screen bg-white text-slate-900 antialiased overflow-hidden">
      <Navigation activeTab={activeTab} setActiveTab={navigate} />

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
            <NavigationControls
              history={history}
              historyIndex={historyIndex}
              onBack={goBack}
              onForward={goForward}
              onClear={clearHistory}
              activeTab={activeTab}
            />
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
              {/* <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                <div className="bg-blue-600 w-full h-full flex items-center justify-center text-white text-[10px] font-bold">AD</div>
              </div> */}
              <button onClick={handleLogoutClick} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
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

      {showLogoutConfirm && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[2000] animate-in fade-in duration-200" onClick={() => setShowLogoutConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-[2100] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 border border-slate-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-2">
                <LogOut size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">End Session?</h3>
                <p className="text-xs text-slate-500 font-medium px-4">Return to the login screen.</p>
              </div>

              <div className="flex gap-3 w-full pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-200 active:scale-95"
                >
                  Confirm Exit
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
