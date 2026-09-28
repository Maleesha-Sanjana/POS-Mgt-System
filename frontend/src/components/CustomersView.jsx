import React, { useState } from 'react';
import { Search, UserPlus, Mail, Phone, Edit2, Trash2, Award } from 'lucide-react';

export default function CustomersView({ customers }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Platinum': return 'bg-slate-800 text-slate-100 border-slate-700';
      case 'Gold': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Silver': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Bronze': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers & Loyalty</h1>
          <p className="text-sm text-slate-500">Manage your customer database and reward points</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
            />
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm">
            <UserPlus size={18} />
            Add Customer
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-500">
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Contact Info</th>
                <th className="py-4 px-6">Loyalty Status</th>
                <th className="py-4 px-6">Last Visit</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{customer.name}</div>
                        <div className="text-xs text-slate-400">{customer.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail size={14} className="text-slate-400" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        {customer.phone}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTierColor(customer.tier)} flex items-center gap-1`}>
                        <Award size={12} />
                        {customer.tier}
                      </span>
                      <span className="text-sm font-semibold text-indigo-600">{customer.points} pts</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-600 font-medium text-sm">
                    {new Date(customer.lastVisit).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500">
                    No customers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
