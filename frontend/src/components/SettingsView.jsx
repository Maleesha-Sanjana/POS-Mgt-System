import React, { useState } from 'react';
import { Store, User, Printer, Palette, Save, Bell, Shield, Smartphone, Globe } from 'lucide-react';

export default function SettingsView() {
  const [activeCategory, setActiveCategory] = useState('General');

  const categories = [
    { id: 'General', icon: <Store size={18} />, label: 'Store Details' },
    { id: 'Account', icon: <User size={18} />, label: 'Account & Roles' },
    { id: 'Hardware', icon: <Printer size={18} />, label: 'Peripherals' },
    { id: 'Appearance', icon: <Palette size={18} />, label: 'Appearance' },
    { id: 'Notifications', icon: <Bell size={18} />, label: 'Notifications' },
    { id: 'Security', icon: <Shield size={18} />, label: 'Security' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500">Configure your point of sale system</p>
        </div>
        
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm">
          <Save size={18} />
          Save Changes
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0">
          <nav className="flex flex-col gap-2">
            {categories.map(category => (
              <button
                key={category.id}
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
          <div className="max-w-3xl">
            {activeCategory === 'General' && <GeneralSettings />}
            {activeCategory === 'Hardware' && <HardwareSettings />}
            {/* Fallback for other categories to keep it simple */}
            {activeCategory !== 'General' && activeCategory !== 'Hardware' && (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                  {categories.find(c => c.id === activeCategory)?.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{activeCategory} Settings</h3>
                <p className="text-slate-500 max-w-md">
                  This section is available in the full version. You can configure {activeCategory.toLowerCase()} preferences and rules here.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-8">
      {/* Store Information */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Store Information</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Store Name</label>
            <input type="text" defaultValue="FreshMart Supermarket" className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 transition-all" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Branch Code</label>
            <input type="text" defaultValue="BR-001" className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 transition-all" />
          </div>
          <div className="flex flex-col gap-2 col-span-2">
            <label className="text-sm font-semibold text-slate-700">Store Address</label>
            <input type="text" defaultValue="123 Retail Ave, Commerce City" className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 transition-all" />
          </div>
        </div>
      </div>

      {/* Regional & Financial */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Regional & Financial</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Currency</label>
            <select className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 transition-all">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Default Tax Rate (%)</label>
            <input type="number" defaultValue="8.0" className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HardwareSettings() {
  return (
    <div className="space-y-6">
      {/* Printer */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Printer size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Receipt Printer</h4>
            <p className="text-sm text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 block"></span>
              Connected: EPSON TM-T88VI
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors">
          Configure
        </button>
      </div>

      {/* Barcode Scanner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Barcode Scanner</h4>
            <p className="text-sm text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 block"></span>
              Connected: Symbol LS2208
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors">
          Configure
        </button>
      </div>
      
      {/* Card Terminal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center shrink-0">
            <Globe size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Payment Terminal</h4>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
              Not Connected
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-sm font-semibold transition-colors">
          Pair Device
        </button>
      </div>
    </div>
  );
}
