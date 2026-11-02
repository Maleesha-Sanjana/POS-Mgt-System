import React, { useState, useEffect } from 'react';
import {
  Store,
  User,
  Printer,
  Save,
  Shield,
  Smartphone,
  Globe,
  BarChart3,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { posApi } from '../api';

export default function SettingsView({
  settings,
  users,
  onSaveSettings,
  onCreateUser,
  onToggleUserStatus,
}) {
  const [activeCategory, setActiveCategory] = useState('General');
  const [form, setForm] = useState({
    storeName: '',
    branchCode: '',
    storeAddress: '',
    phone: '',
    email: '',
    currency: 'LKR',
    defaultTaxRate: 8.0,
    lowStockThreshold: 20,
    loyaltyPointsPerHundredRs: 1,
    receiptFooterText: '',
    receiptPrinterName: 'EPSON TM-T88VI',
    receiptPrinterConnected: true,
    barcodeScannerName: 'Symbol LS2208',
    barcodeScannerConnected: true,
    paymentTerminalName: 'Verifone VX520',
    paymentTerminalConnected: false,
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [reports, setReports] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'Cashier',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        storeName: settings.storeName ?? '',
        branchCode: settings.branchCode ?? '',
        storeAddress: settings.storeAddress ?? '',
        phone: settings.phone ?? '',
        email: settings.email ?? '',
        currency: settings.currency ?? 'LKR',
        defaultTaxRate: settings.defaultTaxRate ?? 8.0,
        lowStockThreshold: settings.lowStockThreshold ?? 20,
        loyaltyPointsPerHundredRs: settings.loyaltyPointsPerHundredRs ?? 1,
        receiptFooterText: settings.receiptFooterText ?? '',
        receiptPrinterName: settings.receiptPrinterName ?? 'EPSON TM-T88VI',
        receiptPrinterConnected: settings.receiptPrinterConnected ?? true,
        barcodeScannerName: settings.barcodeScannerName ?? 'Symbol LS2208',
        barcodeScannerConnected: settings.barcodeScannerConnected ?? true,
        paymentTerminalName: settings.paymentTerminalName ?? 'Verifone VX520',
        paymentTerminalConnected: settings.paymentTerminalConnected ?? false,
      });
    }
  }, [settings]);

  useEffect(() => {
    if (activeCategory === 'Reports') {
      posApi.getReportsSummary().then(setReports).catch(() => {});
    } else if (activeCategory === 'Security') {
      posApi.getAuditLogs().then(setAuditLogs).catch(() => {});
    }
  }, [activeCategory]);

  const handleSave = async () => {
    if (!onSaveSettings) return;
    setSaving(true);
    setSaveMessage('');
    try {
      await onSaveSettings({
        ...form,
        defaultTaxRate: Number(form.defaultTaxRate),
        lowStockThreshold: Number(form.lowStockThreshold),
        loyaltyPointsPerHundredRs: Number(form.loyaltyPointsPerHundredRs),
      });
      setSaveMessage('Settings saved to SQL database!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!onCreateUser) return;
    try {
      await onCreateUser(newUser);
      setNewUser({ username: '', fullName: '', email: '', password: '', role: 'Cashier' });
    } catch (err) {
      alert(err.message || 'Failed to create user');
    }
  };

  const categories = [
    { id: 'General', icon: <Store size={18} />, label: 'Store Details' },
    { id: 'Account', icon: <User size={18} />, label: 'Account & Roles' },
    { id: 'Hardware', icon: <Printer size={18} />, label: 'Peripherals' },
    { id: 'Reports', icon: <BarChart3 size={18} />, label: 'Sales & Profit Reports' },
    { id: 'Security', icon: <Shield size={18} />, label: 'Audit Trail & Logs' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings & Administration</h1>
          <p className="text-sm text-slate-500">Configure store branch, RBAC accounts, reports, and audit logs</p>
        </div>

        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={16} />
              {saveMessage}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0">
          <nav className="flex flex-col gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  activeCategory === category.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                }`}
              >
                {category.icon}
                {category.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Settings Detail Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl">
            {activeCategory === 'General' && (
              <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">
                    Store Information (Database Configured)
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Store Name</label>
                      <input
                        type="text"
                        value={form.storeName}
                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Branch Code</label>
                      <input
                        type="text"
                        value={form.branchCode}
                        onChange={(e) => setForm({ ...form, branchCode: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                    </div>
                    <div className="flex flex-col gap-2 col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Store Address</label>
                      <input
                        type="text"
                        value={form.storeAddress}
                        onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">
                    Regional, Tax & Loyalty Rules
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Currency</label>
                      <select
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      >
                        <option value="LKR">LKR (Rs.)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Default Tax Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.defaultTaxRate}
                        onChange={(e) => setForm({ ...form, defaultTaxRate: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Default Low-Stock Threshold</label>
                      <input
                        type="number"
                        value={form.lowStockThreshold}
                        onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Loyalty Points per Rs. 100</label>
                      <input
                        type="number"
                        min="1"
                        value={form.loyaltyPointsPerHundredRs}
                        onChange={(e) => setForm({ ...form, loyaltyPointsPerHundredRs: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'Account' && (
              <div className="space-y-8">
                <form
                  onSubmit={handleCreateUser}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
                >
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <UserPlus size={18} className="text-indigo-600" />
                    Create Staff User Account (RBAC)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      required
                      type="text"
                      placeholder="Username (e.g. cashier3)"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      required
                      type="text"
                      placeholder="Full Name"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      required
                      type="email"
                      placeholder="Email Address"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      required
                      type="password"
                      placeholder="Initial Password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="Cashier">Cashier</option>
                      <option value="Manager">Manager</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-semibold"
                    >
                      Create Account
                    </button>
                  </div>
                </form>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                        <th className="py-3.5 px-6">Staff Member</th>
                        <th className="py-3.5 px-6">Role</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {(users || []).map((u) => (
                        <tr key={u.id}>
                          <td className="py-3.5 px-6">
                            <div className="font-semibold text-slate-800">{u.fullName}</div>
                            <div className="text-xs text-slate-400">
                              @{u.username} • {u.email}
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                u.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <button
                              type="button"
                              onClick={() => onToggleUserStatus && onToggleUserStatus(u.id)}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeCategory === 'Hardware' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <Printer size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Receipt Printer ({form.receiptPrinterName})</h4>
                      <p className="text-sm text-green-600 font-medium">
                        {form.receiptPrinterConnected ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, receiptPrinterConnected: !form.receiptPrinterConnected })
                    }
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold"
                  >
                    {form.receiptPrinterConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Barcode Scanner ({form.barcodeScannerName})</h4>
                      <p className="text-sm text-green-600 font-medium">
                        {form.barcodeScannerConnected ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, barcodeScannerConnected: !form.barcodeScannerConnected })
                    }
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold"
                  >
                    {form.barcodeScannerConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0">
                      <Globe size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Payment Terminal ({form.paymentTerminalName})</h4>
                      <p className="text-sm text-slate-500 font-medium">
                        {form.paymentTerminalConnected ? 'Connected' : 'Not Connected'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, paymentTerminalConnected: !form.paymentTerminalConnected })
                    }
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-sm font-semibold"
                  >
                    {form.paymentTerminalConnected ? 'Unpair' : 'Pair Device'}
                  </button>
                </div>
              </div>
            )}

            {activeCategory === 'Reports' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-slate-400">Total Revenue</div>
                    <div className="text-2xl font-black text-indigo-600 mt-1">
                      Rs. {Number(reports?.totalRevenue ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-slate-400">Gross Profit</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">
                      Rs. {Number(reports?.grossProfit ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-slate-400">Completed Sales</div>
                    <div className="text-2xl font-black text-slate-800 mt-1">
                      {reports?.totalOrders ?? 0}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-slate-400">Low-Stock Items</div>
                    <div className="text-2xl font-black text-orange-500 mt-1">
                      {reports?.lowStockCount ?? 0}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Low-Stock Reorder Alerts</h4>
                  <div className="divide-y divide-slate-100 text-sm">
                    {(reports?.lowStockProducts || []).map((p) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{p.name}</span>{' '}
                          <span className="text-xs text-slate-400">({p.sku})</span>
                        </div>
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                          {p.stock} left (Reorder at {p.reorderLevel})
                        </span>
                      </div>
                    ))}
                    {(!reports?.lowStockProducts || reports.lowStockProducts.length === 0) && (
                      <p className="text-slate-400 py-4">All products are above their reorder levels.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'Security' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">System Audit Trail (Database AuditLogs)</h3>
                  <p className="text-xs text-slate-500">
                    Immutable trace of sales, manager refunds, user changes, and inventory updates
                  </p>
                </div>
                <div className="divide-y divide-slate-100 max-h-[28rem] overflow-y-auto text-sm">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-800">
                          <span className="text-indigo-600 font-mono text-xs mr-2">[{log.action}]</span>
                          {log.details}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          User: {log.username} • Entity: {log.entityName} #{log.entityId}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="p-8 text-center text-slate-400">No audit logs found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
