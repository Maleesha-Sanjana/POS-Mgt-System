import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ShieldCheck, ShoppingCart, Package, Users, LogIn, AlertCircle } from 'lucide-react';
import { posApi } from '../api';

// Internal fallback mapping (only utilized when backend is offline for local sessions)
const INTERNAL_CREDENTIALS = [
  { username: 'cashier1', password: 'Demo@123', fullName: 'Nimali Silva', role: 'Cashier', id: 3 },
  { username: 'manager', password: 'Demo@123', fullName: 'Kasun Perera', role: 'Store Manager', id: 2 },
  { username: 'admin', password: 'Demo@123', fullName: 'Denuka Jayasundara', role: 'Administrator', id: 1 },
];

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const loginUsername = username.trim();
    const loginPassword = password;

    if (!loginUsername || !loginPassword) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Authenticate against ASP.NET Core & SQL Server API
      const result = await posApi.login(loginUsername, loginPassword);
      onLoginSuccess({
        id: result.id,
        username: result.username,
        fullName: result.fullName,
        email: result.email,
        role: result.role,
        roleId: result.roleId,
      });
    } catch (apiErr) {
      // 2. Fallback check for standard authorized accounts if API is offline
      const match = INTERNAL_CREDENTIALS.find(
        (acc) =>
          acc.username.toLowerCase() === loginUsername.toLowerCase() &&
          acc.password === loginPassword
      );

      if (match) {
        onLoginSuccess({
          id: match.id,
          username: match.username,
          fullName: match.fullName,
          email: `${match.username}@freshmart.lk`,
          role: match.role,
          roleId: match.id,
          isOfflineDemo: true,
        });
      } else {
        setError(
          apiErr.message?.includes('status') || apiErr.message?.includes('Failed to fetch')
            ? 'Invalid username or password. Please check your credentials.'
            : (apiErr.message || 'Invalid credentials. Please verify your username and password.')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-4xl grid md:grid-cols-5 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Left Side: Brand & System Features */}
        <div className="md:col-span-2 bg-gradient-to-b from-indigo-600 to-indigo-800 p-8 sm:p-10 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">
                P.
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">FreshMart POS</h1>
                <p className="text-xs text-indigo-200">Point of Sale & Retail Management</p>
              </div>
            </div>

            <p className="text-sm text-indigo-100 leading-relaxed mb-8">
              Welcome to the retail terminal. Please authenticate with your authorized staff credentials to open your work session.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <ShoppingCart size={16} className="text-indigo-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Fast POS Terminal</h4>
                  <p className="text-[11px] text-indigo-200">Barcode lookup, instant cart calculations & multi-tender checkout.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Package size={16} className="text-indigo-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Inventory & Reorder Levels</h4>
                  <p className="text-[11px] text-indigo-200">Live stock tracking, threshold warnings & automated replenishment alerts.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Users size={16} className="text-indigo-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Customer Loyalty Program</h4>
                  <p className="text-[11px] text-indigo-200">Dynamic tier rewards from Bronze to Platinum with per-sale point accrual.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={16} className="text-indigo-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Role-Based Access Control</h4>
                  <p className="text-[11px] text-indigo-200">Structured permissions for Cashiers, Store Managers, and Administrators.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-indigo-300 pt-8 border-t border-white/10 mt-8 flex justify-between items-center">
            <span>Microsoft SQL Server Edition</span>
            <span className="font-mono">PosManagementDb</span>
          </div>
        </div>

        {/* Right Side: Professional Staff Login Form */}
        <div className="md:col-span-3 p-8 sm:p-12 flex flex-col justify-center bg-slate-50">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Terminal Sign In</h2>
            <p className="text-sm text-slate-500 mt-1">
              Sign in with your staff account to access your assigned workstation.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Authorized personnel only</span>
              <span className="font-medium text-slate-400">Shift Session</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <LogIn size={18} />
              {loading ? 'Authenticating...' : 'Sign In to Session'}
            </button>
          </form>

          {/* Role access reference pills */}
          <div className="mt-8 pt-6 border-t border-slate-200/80">
            <span className="text-xs text-slate-400 block mb-2 font-medium">Access Tier Privileges</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
              <div className="p-2 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                <span className="block font-bold text-slate-800">Cashier</span>
                <span className="text-[10px] text-slate-400">Terminal & Orders</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                <span className="block font-bold text-slate-800">Store Manager</span>
                <span className="text-[10px] text-slate-400">Inventory & Refunds</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                <span className="block font-bold text-slate-800">Administrator</span>
                <span className="text-[10px] text-slate-400">Full System & Users</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
