import React, { useState } from 'react';
import { Search, Eye, Filter, Calendar, RotateCcw, Printer, X } from 'lucide-react';

export default function OrdersView({ orders, onRefundOrder, onPrintReceipt }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefund = async () => {
    if (!selectedOrder) return;
    setProcessingRefund(true);
    try {
      const updated = await onRefundOrder(selectedOrder.id, {
        reason: refundReason || 'Customer requested refund against receipt',
        restockItems: true,
      });
      setSelectedOrder(updated);
      setRefundReason('');
    } catch (err) {
      alert(err.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Order History & Refunds</h1>
          <p className="text-sm text-slate-500">View database transactions, reprint receipts, and process refunds</p>
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
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <Filter size={16} className="text-slate-400 ml-2" />
            {['All', 'Completed', 'Refunded'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
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
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const dateObj = new Date(order.date);
                const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateString = dateObj.toLocaleDateString();

                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-bold text-indigo-600">{order.id}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span>
                          {dateString} <span className="text-slate-400">at</span> {timeString}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">{order.customer}</td>
                    <td className="py-4 px-6 text-slate-600">
                      {order.items} {order.items === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-800">
                      Rs. {Number(order.total).toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-slate-600">{order.method}</div>
                      {order.payments?.length > 1 && (
                        <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                          {order.payments.map((payment, idx) => (
                            <span key={`${payment.method}-${idx}`}>
                              {payment.method}: Rs. {Number(payment.amount).toFixed(2)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Inspect order & refund"
                        >
                          <Eye size={18} />
                        </button>
                        {onPrintReceipt && (
                          <button
                            type="button"
                            onClick={() => onPrintReceipt(order)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Print Thermal Receipt (Low-Power)"
                          >
                            <Printer size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No orders found in the database matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Refund Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Order {selectedOrder.id}</h2>
                <p className="text-xs text-slate-500">
                  {new Date(selectedOrder.date).toLocaleString()} • Customer: {selectedOrder.customer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl p-3">
              {(selectedOrder.cartItems || []).map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      {item.quantity} × Rs. {Number(item.price).toFixed(2)}
                    </div>
                  </div>
                  <div className="font-bold text-slate-800">
                    Rs. {(Number(item.price) * Number(item.quantity)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>Rs. {Number(selectedOrder.subtotal ?? selectedOrder.total).toFixed(2)}</span>
              </div>
              {Number(selectedOrder.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-Rs. {Number(selectedOrder.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span>Rs. {Number(selectedOrder.tax ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Grand Total ({selectedOrder.method})</span>
                <span>Rs. {Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>

            {selectedOrder.status === 'Completed' && onRefundOrder && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-600">
                  Manager Refund Approval & Reason (Restocks Inventory Automatically)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Reason for refund / exchange..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={processingRefund}
                    onClick={handleRefund}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw size={16} />
                    {processingRefund ? 'Refunding...' : 'Process Refund'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              {onPrintReceipt && (
                <button
                  type="button"
                  onClick={() => onPrintReceipt(selectedOrder)}
                  className="rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 text-sm font-semibold flex items-center gap-2"
                >
                  <Printer size={16} />
                  Print Receipt
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
