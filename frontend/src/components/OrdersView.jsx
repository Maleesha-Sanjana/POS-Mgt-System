import React, { useState } from 'react';
import { Search, Eye, Filter, Calendar } from 'lucide-react';

export default function OrdersView({ orders }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    order.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Order History</h1>
          <p className="text-sm text-slate-500">View and manage past transactions</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Order ID or Customer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
            />
          </div>
          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm">
            <Filter size={18} />
            Filter
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-500">
                <th className="py-4 px-6">Order ID</th>
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Items</th>
                <th className="py-4 px-6">Total</th>
                <th className="py-4 px-6">Payment</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const dateObj = new Date(order.date);
                const timeString = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const dateString = dateObj.toLocaleDateString();

                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-bold text-indigo-600">{order.id}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{dateString} <span className="text-slate-400">at</span> {timeString}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {order.customer}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {order.items} {order.items === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-800">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-slate-600">
                        {order.method}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === 'Completed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No orders found matching your search.
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
