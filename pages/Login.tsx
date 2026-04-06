
import React, { useState } from 'react';
import { Lock, User as UserIcon, ArrowRight, ShieldAlert, Loader2, Fingerprint, Eye, EyeOff, Zap, ChevronLeft, Battery, BatteryCharging, Activity, Cpu, Wifi } from 'lucide-react';
import { Database } from '../db';
import { AuthSession } from '../utils/AuthSession';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetAuthenticated, setIsResetAuthenticated] = useState(false);
  const [secretAnswer, setSecretAnswer] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');

  const handleChallengeVerify = () => {
    if (secretAnswer.trim().toLowerCase() === 'lukmaann') {
      setIsResetAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect answer. Access denied.');
    }
  };

  const handlePasswordResetConfirm = async () => {
    if (newResetPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    await Database.setConfig('starline_admin_pass', newResetPassword);
    setIsForgotPassword(false);
    setIsResetAuthenticated(false);
    setSecretAnswer('');
    setNewResetPassword('');
    setPassword('');
    setError('Password updated. Please sign in.');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setTimeout(async () => {
      try {
        const user = await Database.authenticateUser(username.trim(), password);
        if (user) {
          AuthSession.saveSession(user);
          onLogin();
        } else {
          setError('Invalid username or password.');
          setIsLoading(false);
        }
      } catch {
        setError('Could not connect to authentication service.');
        setIsLoading(false);
      }
    }, 1200);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 antialiased"
      style={{
        background: 'radial-gradient(ellipse at 60% 20%, #eff6ff 0%, #f8fafc 50%, #f1f5f9 100%)',
      }}
    >
      {/* Decorative background icons */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Scattered icons */}
        <Zap size={180} className="absolute text-blue-400 opacity-[0.07]" style={{ top: '-4%', left: '-3%', transform: 'rotate(-15deg)' }} />
        <Zap size={100} className="absolute text-slate-400 opacity-[0.06]" style={{ top: '18%', right: '6%', transform: 'rotate(20deg)' }} />
        <Zap size={70} className="absolute text-blue-500 opacity-[0.08]" style={{ bottom: '22%', left: '8%', transform: 'rotate(-8deg)' }} />
        <Zap size={50} className="absolute text-slate-500 opacity-[0.05]" style={{ top: '55%', right: '22%', transform: 'rotate(30deg)' }} />

        <BatteryCharging size={140} className="absolute text-blue-300 opacity-[0.06]" style={{ bottom: '-2%', right: '-2%', transform: 'rotate(12deg)' }} />
        <BatteryCharging size={80} className="absolute text-slate-400 opacity-[0.05]" style={{ top: '40%', left: '3%', transform: 'rotate(-20deg)' }} />
        <Battery size={90} className="absolute text-blue-400 opacity-[0.05]" style={{ top: '70%', right: '5%', transform: 'rotate(-10deg)' }} />
        <Battery size={55} className="absolute text-slate-400 opacity-[0.04]" style={{ top: '12%', left: '25%', transform: 'rotate(15deg)' }} />

        <Activity size={120} className="absolute text-blue-500 opacity-[0.05]" style={{ bottom: '12%', left: '-1%', transform: 'rotate(0deg)' }} />
        <Activity size={65} className="absolute text-slate-400 opacity-[0.05]" style={{ top: '30%', right: '3%', transform: 'rotate(-12deg)' }} />

        <Cpu size={110} className="absolute text-slate-400 opacity-[0.05]" style={{ top: '6%', right: '15%', transform: 'rotate(10deg)' }} />
        <Cpu size={60} className="absolute text-blue-400 opacity-[0.04]" style={{ bottom: '38%', right: '14%', transform: 'rotate(-25deg)' }} />

        <Wifi size={80} className="absolute text-blue-300 opacity-[0.06]" style={{ bottom: '5%', left: '30%', transform: 'rotate(0deg)' }} />
        <Wifi size={50} className="absolute text-slate-400 opacity-[0.04]" style={{ top: '48%', left: '18%', transform: 'rotate(8deg)' }} />
      </div>

      <div className="relative w-full max-w-[400px] animate-in zoom-in-95 fade-in duration-500">

        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-5 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
          >
            <Zap size={24} className="text-blue-400" fill="#60a5fa" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isForgotPassword ? 'Reset Password' : 'Welcome back'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            {isForgotPassword ? 'Answer to regain access' : 'Sign in to Starline Enterprise'}
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl p-8"
          style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -8px rgba(0,0,0,0.08)' }}
        >
          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
              <ShieldAlert size={14} className="text-rose-500 shrink-0" />
              <span className="text-xs text-rose-700 font-medium leading-snug">{error}</span>
            </div>
          )}

          {!isForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Username</label>
                <div className="relative">
                  <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    autoFocus
                    placeholder="Enter your username"
                    className="w-full pl-10 pr-4 py-3 bg-slate-100/80 rounded-xl text-sm text-slate-900 placeholder-slate-500 outline-none focus:bg-slate-100 focus:ring-2 focus:ring-blue-400/20 transition-all font-medium border-0"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-600">Password</label>
                  <button
                    type="button"
                    onClick={() => { setError(''); setIsForgotPassword(true); }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-100/80 rounded-xl text-sm text-slate-900 placeholder-slate-500 outline-none focus:bg-slate-100 focus:ring-2 focus:ring-blue-400/20 transition-all font-medium border-0"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group mt-1"
                style={{
                  background: isLoading
                    ? '#1e293b'
                    : 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)',
                  boxShadow: '0 4px 14px rgba(15,23,42,0.25)',
                }}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

          ) : (
            // Forgot Password flow
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">

              {/* Security riddle */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Security Question</p>
                <p className="text-sm text-slate-700 font-medium italic leading-relaxed">
                  "I forged the keys you lost.<br />
                  My signature lies at the foundation.<br />
                  <span className="not-italic font-bold text-slate-900">Who am I?</span>"
                </p>
              </div>

              {!isResetAuthenticated ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Your Answer</label>
                    <input
                      autoFocus
                      placeholder="Type the name..."
                      className="w-full px-4 py-3 bg-slate-100/80 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-500 outline-none focus:bg-slate-100 focus:ring-2 focus:ring-blue-400/20 transition-all uppercase tracking-wider border-0"
                      value={secretAnswer}
                      onChange={(e) => setSecretAnswer(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChallengeVerify(); } }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleChallengeVerify}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)', boxShadow: '0 4px 14px rgba(15,23,42,0.2)' }}
                  >
                    Verify Identity
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">New Password</label>
                    <div className="relative">
                      <Fingerprint size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                      <input
                        autoFocus
                        type="password"
                        placeholder="Enter new password"
                        className="w-full pl-10 pr-4 py-3 bg-emerald-100/60 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-500 outline-none focus:bg-emerald-100 focus:ring-2 focus:ring-emerald-400/20 transition-all border-0"
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePasswordResetConfirm(); } }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordResetConfirm}
                    className="w-full py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
                  >
                    Update Password
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setIsResetAuthenticated(false); setError(''); setSecretAnswer(''); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mx-auto pt-1"
              >
                <ChevronLeft size={14} />
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 font-medium mt-6">
          Developed by <span className="font-bold text-slate-500">Lukmaann</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
