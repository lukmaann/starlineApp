
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Scanner from './pages/Scanner';
import SessionLock from './components/SessionLock';
import Dealers from './pages/Dealers';
import Settlements from './pages/Settlements';
import Controls from './pages/Controls';
import Login from './pages/Login';
import Backup from './pages/Backup';
import DatabaseSelector from './pages/DatabaseSelector';
import DatabaseManagement from './pages/DatabaseManagement';
import GlobalAnalytics from './components/GlobalAnalytics';
import { Database } from './db';
import { Zap, Download, LogOut, Database as DatabaseIcon } from 'lucide-react';
import UnlockPage from './pages/UnlockPage';
import { Toaster } from './components/ui/sonner';
import { toast } from "sonner";
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
  const [pendingSearch, setPendingSearch] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  const triggerHubSearch = (serial: string) => {
    setPendingSearch(serial);
    navigate('scanner');
  };

  useEffect(() => {
    const init = async () => {
      // Check for stored DB config
      const storedConfig = localStorage.getItem('dbConfig');
      if (storedConfig) {
        try {
          const config = JSON.parse(storedConfig);
          const res = await Database.switchDatabase(config.type, config.path);
          if (res.success) {
            setIsDbReady(true);
            const auth = localStorage.getItem('starline_auth');
            if (auth === 'true') setIsLoggedIn(true);
            await Database.init();
            AuthSession.initialize();
          } else {
            // Config invalid or drive missing - show selector
            setIsDbReady(false);
          }
        } catch (e) {
          console.error("DB Init Failed", e);
          setIsDbReady(false);
        }
      } else {
        // No config - show selector
        setIsDbReady(false);
      }
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
      case 'backup':
        return <Backup />;
      case 'analytics':
        return <GlobalAnalytics />;

      case 'database-management':
        return <DatabaseManagement />;
      case 'session-lock':
        return (
          <UnlockPage
            onUnlock={() => navigate(history[historyIndex - 1] || 'scanner')}
            onBack={goBack}
          />
        );
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

  if (!isDbReady) return <DatabaseSelector onComplete={() => {
    setIsDbReady(true);
    // Determine if we need to log in (if we just switched DBs, maybe we stay logged out or check persistence)
    // For now, let's assume switching DB requires re-login or check
    const auth = localStorage.getItem('starline_auth');
    if (auth === 'true') setIsLoggedIn(true);
  }} />;

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="flex h-screen bg-white text-slate-900 antialiased overflow-hidden">
      <Navigation activeTab={activeTab} setActiveTab={navigate} />

      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/50">
        <Toaster />

        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 no-print">
          <div className="flex items-center space-x-3 text-slate-400 text-sm font-medium">
            <NavigationControls
              history={history}
              historyIndex={historyIndex}
              onBack={goBack}
              onForward={goForward}
              onClear={clearHistory}
            />
            <span className="hover:text-slate-600 transition-colors cursor-default">Starline</span>
            <span>/</span>
            <span className="text-slate-900 font-bold capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center space-x-2">

            {/* Database Source Indicator & Switch */}
            <div className="flex items-center mr-2 bg-slate-50 border border-slate-200 rounded-full p-1 h-9">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${localStorage.getItem('dbConfig') && JSON.parse(localStorage.getItem('dbConfig') || '{}').type === 'EXTERNAL'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
                }`}>
                {localStorage.getItem('dbConfig') && JSON.parse(localStorage.getItem('dbConfig') || '{}').type === 'EXTERNAL' ? 'SSD' : 'Internal'}
              </span>
              <button
                title="Manage Database"
                onClick={() => navigate('database-management')}
                className={`ml-1 p-1.5 rounded-full transition-all ${activeTab === 'database-management'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                  }`}
              >
                <DatabaseIcon size={16} />
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
              onClick={() => navigate('backup')}
              className={`p-2 rounded-full transition-all flex items-center justify-center ${activeTab === 'backup'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
              title="Backup to SSD"
            >
              <Download size={18} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <SessionLock onUnlockRequest={() => navigate('session-lock')} />
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div className="flex items-center space-x-3">
              {/* <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                <div className="bg-blue-600 w-full h-full flex items-center justify-center text-white text-[10px] font-bold">AD</div>
              </div> */}
              <button onClick={handleLogoutClick} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all active:bg-rose-100">
                <LogOut size={20} strokeWidth={2} />
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
