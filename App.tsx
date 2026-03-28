
import React, { useState, useEffect, useRef } from 'react';
import Navigation from './components/Navigation';
import Scanner from './pages/Scanner';
import Dealers from './pages/Dealers';
import Settlements from './pages/Settlements';
import Controls from './pages/Controls';
import Login from './pages/Login';
import Backup from './pages/Backup';
import DatabaseSelector from './pages/DatabaseSelector';
import DatabaseManagement from './pages/DatabaseManagement';
import Batches from './pages/Batches';
import ManufacturingHub from './factory_operations/ManufacturingHub';
import GlobalAnalytics from './components/GlobalAnalytics';
import { Database } from './db';
import { Download, Database as DatabaseIcon, Clock, Zap, Battery, BatteryCharging, Activity, Cpu, Wifi, LogOut, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { Dialog, DialogContent, DialogTitle } from './components/ui/dialog';
import { toast } from "sonner";
import { useNavigationHistory } from './hooks/useNavigationHistory';
import NavigationControls from './components/NavigationControls';
import { AuthSession } from './utils/AuthSession';
import NotificationBell from './components/NotificationBell';
import ShortcutsModal from './components/ShortcutsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import BackupReminderBanner from './components/BackupReminderBanner';
import { BatteryStatus } from './types';

type PendingDealerTarget = {
  dealerId: string;
  batteryId: string;
  status: BatteryStatus;
  isExpired: boolean;
};

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
  const [user, setUser] = useState<import('./types').User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<string | null>(null);
  const [pendingDealerTarget, setPendingDealerTarget] = useState<PendingDealerTarget | null>(null);
  const [pendingDealerProfileId, setPendingDealerProfileId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [sessionCountdown, setSessionCountdown] = useState<number | null>(null);
  const [showKeepAliveAuth, setShowKeepAliveAuth] = useState(false);
  const [keepAlivePassword, setKeepAlivePassword] = useState('');
  const [keepAliveError, setKeepAliveError] = useState('');
  const [isKeepAliveLoading, setIsKeepAliveLoading] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const [showDbNotification, setShowDbNotification] = useState(false);
  const [dbNotificationData, setDbNotificationData] = useState<{ isSSD: boolean, path: string } | null>(null);
  const storageNoticeRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'error') {
      toast.error(message);
      return;
    }

    if (type === 'info') {
      toast(message);
      return;
    }

    toast.success(message);
  };

  const triggerHubSearch = (serial: string) => {
    setPendingSearch(serial);
    navigate('scanner');
  };

  const openDealerDetail = (dealerId: string, batteryId: string, status: BatteryStatus, isExpired: boolean) => {
    setPendingDealerTarget({ dealerId, batteryId, status, isExpired });
    navigate('dealers');
  };

  const openDealerProfile = (dealerId: string) => {
    setPendingDealerProfileId(dealerId);
    navigate('dealers');
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
            const authUser = AuthSession.getCurrentUser();
            if (authUser) {
              setIsLoggedIn(true);
              setUser(authUser);
            }
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

    const handleDbSynced = () => showToast('Database Synced');
    window.addEventListener('app-notify' as any, handleNotify);
    window.addEventListener('db-synced' as any, handleDbSynced);

    const handleAppRefresh = () => {
      setIsRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000); // 20ms refresh effect as requested
    };
    window.addEventListener('app-refresh' as any, handleAppRefresh);

    // Countdown ticker — updates every second when session is near expiry
    const countdownTick = setInterval(() => {
      if (AuthSession.isValid()) {
        const secs = AuthSession.getSecondsUntilExpiry();
        const threshold = AuthSession.getWarningThresholdSeconds();
        setSessionCountdown(secs <= threshold ? secs : null);
      } else {
        setSessionCountdown(null);
      }
    }, 1000);

    return () => {
      window.removeEventListener('app-notify' as any, handleNotify);
      window.removeEventListener('db-synced' as any, handleDbSynced);
      window.removeEventListener('app-refresh' as any, handleAppRefresh);
      clearInterval(countdownTick);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!showDbNotification || !storageNoticeRef.current) return;
      const target = event.target as Node;
      if (!storageNoticeRef.current.contains(target)) {
        setShowDbNotification(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showDbNotification]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleKeepAliveAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsKeepAliveLoading(true);
    setKeepAliveError('');

    try {
      const adminPass = await Database.getConfig('starline_admin_pass') || 'starline@2025';

      if (keepAlivePassword === adminPass) {
        AuthSession.refreshSession();
        setSessionCountdown(null);
        setKeepAlivePassword('');
        setShowKeepAliveAuth(false);
        toast.success('Session Extended');
      } else {
        setKeepAliveError('Incorrect Password');
        setKeepAlivePassword('');
        toast.error('Incorrect Password');
      }
    } catch (err) {
      setKeepAliveError('Error');
      toast.error('Verification Failed');
    } finally {
      setIsKeepAliveLoading(false);
    }
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
            onOpenDealers={openDealerDetail}
            onOpenDealerProfile={openDealerProfile}
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
            pendingDealerTarget={pendingDealerTarget}
            onPendingDealerHandled={() => setPendingDealerTarget(null)}
            pendingDealerProfileId={pendingDealerProfileId}
            onPendingDealerProfileHandled={() => setPendingDealerProfileId(null)}
          />
        );
      case 'settlements':
        return isAdmin ? (
          <Settlements
            onNavigateToHub={(serial) => {
              setPendingSearch(serial);
              navigate('scanner');
            }}
          />
        ) : <Scanner initialSearch={null} onSearchHandled={() => { }} initialState={null} onStateChange={() => { }} active={true} onOpenDealers={openDealerDetail} onOpenDealerProfile={openDealerProfile} />;

      case 'controls':
        return isAdmin ? <Controls active={activeTab === 'controls'} /> : <Scanner initialSearch={null} onSearchHandled={() => { }} initialState={null} onStateChange={() => { }} active={true} onOpenDealers={openDealerDetail} onOpenDealerProfile={openDealerProfile} />;

      case 'analytics':
        return isAdmin ? <GlobalAnalytics /> : <Scanner initialSearch={null} onSearchHandled={() => { }} initialState={null} onStateChange={() => { }} active={true} onOpenDealers={openDealerDetail} onOpenDealerProfile={openDealerProfile} />;

      case 'batches':
        return <Batches
          onNavigateToHub={(serial) => {
            setPendingSearch(serial);
            navigate('scanner');
          }}
        />;

      case 'manufacturing':
        return isAdmin ? <ManufacturingHub active={activeTab === 'manufacturing'} userRole={user?.role} /> : <Scanner initialSearch={null} onSearchHandled={() => { }} initialState={null} onStateChange={() => { }} active={true} onOpenDealers={openDealerDetail} onOpenDealerProfile={openDealerProfile} />;

      case 'database-management':
        return isAdmin ? <DatabaseManagement /> : <Scanner initialSearch={null} onSearchHandled={() => { }} initialState={null} onStateChange={() => { }} active={true} onOpenDealers={openDealerDetail} onOpenDealerProfile={openDealerProfile} />;

      case 'backup':
        return isAdmin ? <Backup /> : <Scanner initialSearch={null} onSearchHandled={() => { }} initialState={null} onStateChange={() => { }} active={true} onOpenDealers={openDealerDetail} onOpenDealerProfile={openDealerProfile} />;

      default:
        return null;
    }
  };

  // Keyboard shortcuts — must be before any early returns (Rules of Hooks)
  const { showHelp, setShowHelp } = useKeyboardShortcuts(navigate, isLoggedIn);

  if (isLoading || isRefreshing) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-slate-100 border-t-slate-400 rounded-full animate-spin"></div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isRefreshing ? 'Refreshing' : 'Synchronizing'}</span>
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

  if (!isLoggedIn) return <Login onLogin={() => {
    const authUser = AuthSession.getCurrentUser();
    setIsLoggedIn(true);
    setUser(authUser);

    // Show database notification for Admin
    if (authUser?.role === 'ADMIN') {
      const dbConfigStr = localStorage.getItem('dbConfig');
      if (dbConfigStr) {
        try {
          const config = JSON.parse(dbConfigStr);
          const isSSD = config.type === 'EXTERNAL';

          setDbNotificationData({ isSSD, path: config.path || 'Internal Storage' });
          setShowDbNotification(true);
        } catch (e) {
          // ignore parsing error
        }
      }
    }
  }} />;

  return (
    <div className="flex h-screen bg-white text-slate-900 antialiased overflow-hidden">
      <Navigation activeTab={activeTab} setActiveTab={navigate} userRole={user?.role} />

      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/30">
        {/* Scattered background icons */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <Zap size={200} className="absolute text-blue-400 opacity-[0.04]" style={{ top: '-5%', left: '-2%', transform: 'rotate(-15deg)' }} />
          <Zap size={110} className="absolute text-slate-400 opacity-[0.04]" style={{ top: '20%', right: '4%', transform: 'rotate(20deg)' }} />
          <Zap size={75} className="absolute text-blue-500 opacity-[0.05]" style={{ bottom: '20%', left: '6%', transform: 'rotate(-8deg)' }} />
          <Zap size={55} className="absolute text-slate-500 opacity-[0.03]" style={{ top: '55%', right: '20%', transform: 'rotate(30deg)' }} />
          <BatteryCharging size={160} className="absolute text-blue-300 opacity-[0.04]" style={{ bottom: '-2%', right: '-2%', transform: 'rotate(12deg)' }} />
          <BatteryCharging size={90} className="absolute text-slate-400 opacity-[0.03]" style={{ top: '38%', left: '2%', transform: 'rotate(-20deg)' }} />
          <Battery size={100} className="absolute text-blue-400 opacity-[0.03]" style={{ top: '68%', right: '4%', transform: 'rotate(-10deg)' }} />
          <Battery size={60} className="absolute text-slate-400 opacity-[0.03]" style={{ top: '10%', left: '22%', transform: 'rotate(15deg)' }} />
          <Activity size={130} className="absolute text-blue-500 opacity-[0.03]" style={{ bottom: '10%', left: '-1%', transform: 'rotate(0deg)' }} />
          <Activity size={70} className="absolute text-slate-400 opacity-[0.03]" style={{ top: '28%', right: '2%', transform: 'rotate(-12deg)' }} />
          <Cpu size={120} className="absolute text-slate-400 opacity-[0.03]" style={{ top: '4%', right: '14%', transform: 'rotate(10deg)' }} />
          <Cpu size={65} className="absolute text-blue-400 opacity-[0.03]" style={{ bottom: '36%', right: '12%', transform: 'rotate(-25deg)' }} />
          <Wifi size={90} className="absolute text-blue-300 opacity-[0.04]" style={{ bottom: '4%', left: '28%', transform: 'rotate(0deg)' }} />
          <Wifi size={55} className="absolute text-slate-400 opacity-[0.03]" style={{ top: '46%', left: '16%', transform: 'rotate(8deg)' }} />
        </div>
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
            <span className="text-slate-900 font-bold capitalize">{activeTab === 'manufacturing' ? 'Factory Operations' : activeTab}</span>
          </div>

          <div className="flex items-center space-x-2">

            {isAdmin && (
              <>
                <div ref={storageNoticeRef} className="relative mr-2">
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full p-1 h-9">
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

                  {showDbNotification && dbNotificationData && (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 animate-in slide-in-from-top-2 fade-in duration-300">
                      <div className={`rounded-2xl border p-4 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.25)] ${dbNotificationData.isSSD ? 'border-purple-200 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50' : 'border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${dbNotificationData.isSSD ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'}`}>
                            <CheckCircle2 size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">Storage connected</p>
                            <p className={`mt-1 text-xs font-semibold ${dbNotificationData.isSSD ? 'text-purple-700' : 'text-blue-700'}`}>
                              {dbNotificationData.isSSD ? 'External SSD is currently active.' : 'Internal storage is currently active.'}
                            </p>
                            <p className="mt-2 truncate text-[11px] font-medium text-slate-500">
                              {dbNotificationData.path}
                            </p>
                          </div>
                          <button
                            onClick={() => setShowDbNotification(false)}
                            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Close storage notification"
                          >
                            <span className="block text-sm leading-none">x</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
              </>
            )}
            {/* Notification bell */}
            {isAdmin && <NotificationBell onNavigate={navigate} />}

            {/* Logged-in user badge */}
            {user && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-1 pr-3 h-9">
                <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-white uppercase">
                    {user.username?.slice(0, 2)}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-800 capitalize">{user.username}</span>
              </div>
            )}
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button
              onClick={handleLogoutClick}
              className="flex items-center justify-center p-2 rounded-full transition-all active:scale-95 text-rose-600 hover:bg-rose-50 active:bg-rose-100"
              title="Logout"
            >
              <LogOut size={20} strokeWidth={2} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Session expiry countdown banner */}
          {sessionCountdown !== null && (
            <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-rose-50 border-b border-rose-200 px-8 py-2 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-rose-700">
                <Clock size={14} className="shrink-0 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Session expiring in{' '}
                  <span className="font-black tabular-nums">
                    {String(Math.floor(sessionCountdown / 60)).padStart(2, '0')}:{String(sessionCountdown % 60).padStart(2, '0')}
                  </span>
                  {' '}— you will be logged out automatically
                </span>
              </div>
              <button
                onClick={() => setShowKeepAliveAuth(true)}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors active:scale-95 shrink-0"
              >
                Keep Session Alive
              </button>
            </div>
          )}
          {isAdmin && <BackupReminderBanner activeTab={activeTab} onOpenBackup={() => navigate('backup')} />}
          <div className="p-8 max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </main>
      </div >

      {showHelp && <ShortcutsModal onClose={() => setShowHelp(false)} />}

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-md p-6 border-0 bg-white rounded-2xl shadow-xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mb-2 shadow-sm">
              <LogOut size={32} />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">End Session</DialogTitle>
            <p className="text-sm text-slate-500 max-w-[280px]">
              Are you sure you want to log out? You will need to re-enter your credentials to access the system.
            </p>
            <div className="flex gap-3 w-full mt-6 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors tracking-wide"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  AuthSession.clearSession();
                  window.location.reload();
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200 transition-colors tracking-wide"
              >
                Log Out
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showKeepAliveAuth} onOpenChange={(open) => {
        setShowKeepAliveAuth(open);
        if (!open) {
          setKeepAlivePassword('');
          setKeepAliveError('');
        }
      }}>
        <DialogContent className="sm:max-w-md p-6 border-0 bg-white rounded-2xl shadow-xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mb-2 shadow-sm">
              <KeyRound size={32} className="text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Verify Access</DialogTitle>
            <p className="text-sm text-slate-500 max-w-[280px]">
              Please enter the administrator access key to extend your session.
            </p>

            <form onSubmit={handleKeepAliveAttempt} className="w-full mt-4 space-y-4">
              <div className="relative group text-left">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  autoFocus
                  placeholder="Access Key"
                  required
                  className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-xl text-sm font-bold outline-none transition-all placeholder:text-slate-300
                            ${keepAliveError
                      ? 'border-rose-300 bg-rose-50 text-rose-600 focus:border-rose-500 shadow-sm shadow-rose-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
                    }`}
                  value={keepAlivePassword}
                  onChange={e => { setKeepAlivePassword(e.target.value); setKeepAliveError(''); }}
                />
              </div>

              <div className="flex gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => { setShowKeepAliveAuth(false); setKeepAlivePassword(''); setKeepAliveError(''); }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors tracking-wide"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isKeepAliveLoading || !keepAlivePassword}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors tracking-wide disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isKeepAliveLoading ? <Loader2 size={16} className="animate-spin text-white/50" /> : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

    </div >
  );
};

export default App;
