import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Grid,
  Tag,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  RefreshCw,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { posApi } from './api';
import LoginView from './components/LoginView';
import ProductsView from './components/ProductsView';
import OrdersView from './components/OrdersView';
import CustomersView from './components/CustomersView';
import SettingsView from './components/SettingsView';

function App() {
  // Session Authentication State (Cashier, Store Manager, Administrator)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('POS');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);

  // Role classification
  const userRole = currentUser?.role || 'Cashier';
  const isCashier = userRole === 'Cashier';

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('pos_current_user', JSON.stringify(user));
    } catch {}
  };

  const handleLogout = () => {
    if (window.confirm(`Sign out of ${currentUser?.fullName || 'POS'} session?`)) {
      setCurrentUser(null);
      try {
        localStorage.removeItem('pos_current_user');
      } catch {}
      setActiveTab('POS');
      setCart([]);
    }
  };

  // Real Database State (no static/mock data)
  const [products, setProducts] = useState([]);
  const [categoryObjects, setCategoryObjects] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);
  const [users, setUsers] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [dbError, setDbError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  // Checkout Modals & Options
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [combinedModalOpen, setCombinedModalOpen] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedDiscountCode, setSelectedDiscountCode] = useState('');
  const [cashReceived, setCashReceived] = useState('');

  const loadDatabaseData = useCallback(async () => {
    setLoadingData(true);
    setDbError('');
    try {
      const data = await posApi.bootstrap();
      setProducts(data.products || []);
      setCategoryObjects(data.categories || []);
      setOrders(data.orders || []);
      setCustomers(data.customers || []);
      setDiscounts(data.discounts || []);
      setStoreSettings(data.settings || null);
      setUsers(data.users || []);
    } catch (err) {
      setDbError(
        err.message ||
          'Unable to load data from backend API. Make sure the ASP.NET Core backend is running and backend/dbconfig.json points to your SQL Server PosManagementDb.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  // Enforce role-based access for Cashier
  useEffect(() => {
    if (isCashier && ['Products', 'Customers', 'Settings'].includes(activeTab)) {
      setActiveTab('POS');
    }
  }, [isCashier, activeTab]);

  const categories = useMemo(() => {
    const names = categoryObjects.map((c) => c.name);
    for (const p of products) {
      if (p.category && !names.includes(p.category)) {
        names.push(p.category);
      }
    }
    return ['All', ...names];
  }, [categoryObjects, products]);

  // Filter products based on category and search query (name, barcode, SKU)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        (product.barcode && product.barcode.toLowerCase().includes(q)) ||
        (product.sku && product.sku.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // Cart operations (enforces available stock from DB)
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert(`"${product.name}" is out of stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Only ${product.stock} unit(s) of "${product.name}" available in stock.`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const dbProduct = products.find((p) => p.id === productId);
            const maxStock = dbProduct ? dbProduct.stock : item.stock;
            const newQuantity = item.quantity + delta;
            if (newQuantity > maxStock) {
              alert(`Cannot exceed available stock (${maxStock}).`);
              return item;
            }
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const clearCart = () => {
    if (window.confirm('Are you sure you want to clear the cart?')) {
      setCart([]);
      setSelectedDiscountCode('');
    }
  };

  // Dynamic Calculations (Tax Rate & Discounts from SQL Database)
  const taxRatePercent = Number(storeSettings?.defaultTaxRate ?? 8.0);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const activeDiscount = discounts.find((d) => d.code === selectedDiscountCode);
  const discountAmount = useMemo(() => {
    if (!activeDiscount || subtotal < Number(activeDiscount.minOrderAmount || 0)) {
      return 0;
    }
    if (String(activeDiscount.discountType).toLowerCase() === 'percentage') {
      return Math.round(subtotal * (Number(activeDiscount.value) / 100) * 100) / 100;
    }
    return Math.min(subtotal, Number(activeDiscount.value));
  }, [activeDiscount, subtotal]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(taxableAmount * (taxRatePercent / 100) * 100) / 100;
  const total = Math.round((taxableAmount + tax) * 100) / 100;
  const totalCents = Math.round(total * 100);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);

  const printReceiptPdf = async (order) => {
    const receiptWindow = window.open('', '_blank');
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 16;
    let y = 18;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(storeSettings?.storeName || 'POS MANAGEMENT SYSTEM', pageWidth / 2, y, {
      align: 'center',
    });
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    if (storeSettings?.storeAddress) {
      pdf.text(storeSettings.storeAddress, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('PAYMENT RECEIPT', pageWidth / 2, y + 2, { align: 'center' });
    y += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Order: ${order.id}`, margin, y);
    pdf.text(`Date: ${new Date(order.date).toLocaleString()}`, margin, y + 6);
    pdf.text(`Customer: ${order.customer}`, margin, y + 12);
    pdf.text(`Cashier: ${currentUser?.fullName || 'Staff'} (${currentUser?.role || 'Cashier'})`, margin, y + 18);
    y += 26;

    pdf.setFont('helvetica', 'bold');
    pdf.text('Item', margin, y);
    pdf.text('Qty', pageWidth - 76, y, { align: 'right' });
    pdf.text('Price', pageWidth - 48, y, { align: 'right' });
    pdf.text('Amount', pageWidth - margin, y, { align: 'right' });
    y += 3;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 7;

    pdf.setFont('helvetica', 'normal');
    for (const item of order.cartItems || []) {
      if (y > 265) {
        pdf.addPage();
        y = 20;
      }
      const itemName = pdf.splitTextToSize(item.name, pageWidth - 104);
      pdf.text(itemName, margin, y);
      pdf.text(String(item.quantity), pageWidth - 76, y, { align: 'right' });
      pdf.text(`Rs. ${Number(item.price).toFixed(2)}`, pageWidth - 48, y, { align: 'right' });
      pdf.text(`Rs. ${(Number(item.price) * item.quantity).toFixed(2)}`, pageWidth - margin, y, {
        align: 'right',
      });
      y += Math.max(7, itemName.length * 5);
    }

    y += 2;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;
    pdf.text(`Subtotal: Rs. ${Number(order.subtotal ?? order.total).toFixed(2)}`, pageWidth - margin, y, {
      align: 'right',
    });
    if (Number(order.discountAmount) > 0) {
      y += 6;
      pdf.text(`Discount: -Rs. ${Number(order.discountAmount).toFixed(2)}`, pageWidth - margin, y, {
        align: 'right',
      });
    }
    y += 6;
    pdf.text(`Tax (${taxRatePercent}%): Rs. ${Number(order.tax ?? 0).toFixed(2)}`, pageWidth - margin, y, {
      align: 'right',
    });
    y += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total: Rs. ${Number(order.total).toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 10;
    pdf.text('Payments', margin, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    for (const payment of order.payments || []) {
      pdf.text(`${payment.method}: Rs. ${Number(payment.amount).toFixed(2)}`, margin, y);
      y += 6;
    }
    if (order.cashTendered !== null && order.cashTendered !== undefined) {
      pdf.text(`Cash received: Rs. ${Number(order.cashTendered).toFixed(2)}`, margin, y);
      y += 6;
      pdf.text(`Change: Rs. ${Number(order.change ?? 0).toFixed(2)}`, margin, y);
      y += 6;
    }
    y += 8;
    pdf.text(
      storeSettings?.receiptFooterText || 'Thank you for your purchase!',
      pageWidth / 2,
      y,
      { align: 'center' }
    );

    pdf.autoPrint({ variant: 'non-conform' });
    const receiptUrl = URL.createObjectURL(pdf.output('blob'));
    if (!receiptWindow) {
      pdf.save(`${order.id}-receipt.pdf`);
      URL.revokeObjectURL(receiptUrl);
      return;
    }
    receiptWindow.location.href = receiptUrl;
    window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 60000);
  };

  const handleCheckout = async (
    method,
    payments = [{ method, amount: total }],
    cashDetails = null
  ) => {
    if (cart.length === 0 || checkingOut) return;
    setCheckingOut(true);
    try {
      const savedOrder = await posApi.createOrder({
        customerCode: selectedCustomerId || null,
        discountCode: selectedDiscountCode || null,
        method,
        cashierUserId: currentUser?.id ?? 3,
        cashTendered: cashDetails?.tendered ?? null,
        change: cashDetails?.change ?? 0,
        cartItems: cart.map(({ id, name, price, quantity }) => ({
          id,
          name,
          price,
          quantity,
        })),
        payments,
      });

      setCart([]);
      setSelectedDiscountCode('');
      await loadDatabaseData();
      await printReceiptPdf(savedOrder);
    } catch (err) {
      alert(err.message || 'Checkout failed.');
    } finally {
      setCheckingOut(false);
    }
  };

  const openCashModal = () => {
    setCashReceived(total.toFixed(2));
    setCashModalOpen(true);
  };

  const completeCashPayment = async () => {
    if (Number(cashReceived) < total) return;
    setCashModalOpen(false);
    await handleCheckout('Cash', [{ method: 'Cash', amount: total }], {
      tendered: Number(cashReceived),
      change: Number(cashReceived) - total,
    });
  };

  const openCombinedModal = () => {
    setPaymentSplits([
      { id: 1, method: 'Cash', amount: '' },
      { id: 2, method: 'Card', amount: '' },
    ]);
    setCombinedModalOpen(true);
  };

  const splitTotalCents = paymentSplits.reduce(
    (sum, split) => sum + Math.round((Number(split.amount) || 0) * 100),
    0
  );
  const positiveSplits = paymentSplits.filter((split) => Number(split.amount) > 0);
  const splitMethodsAreUnique =
    new Set(positiveSplits.map((split) => split.method)).size === positiveSplits.length;
  const splitPaymentIsValid =
    positiveSplits.length >= 2 && splitMethodsAreUnique && splitTotalCents === totalCents;

  const completeCombinedPayment = async () => {
    if (!splitPaymentIsValid || cart.length === 0) return;
    const payments = positiveSplits.map((split) => ({
      method: split.method,
      amount: Math.round(Number(split.amount) * 100) / 100,
    }));
    const methodSummary = payments.map((payment) => payment.method).join(' + ');
    setCombinedModalOpen(false);
    await handleCheckout(methodSummary, payments);
  };

  // Database CRUD handlers passed to child views
  const handleCreateProduct = async (payload) => {
    await posApi.createProduct(payload);
    await loadDatabaseData();
  };

  const handleUpdateProduct = async (id, payload) => {
    await posApi.updateProduct(id, payload);
    await loadDatabaseData();
  };

  const handleDeleteProduct = async (id) => {
    await posApi.deleteProduct(id);
    await loadDatabaseData();
  };

  const handleCreateCategory = async (payload) => {
    await posApi.createCategory(payload);
    await loadDatabaseData();
  };

  const handleCreateCustomer = async (payload) => {
    await posApi.createCustomer(payload);
    await loadDatabaseData();
  };

  const handleUpdateCustomer = async (code, payload) => {
    await posApi.updateCustomer(code, payload);
    await loadDatabaseData();
  };

  const handleDeleteCustomer = async (code) => {
    await posApi.deleteCustomer(code);
    await loadDatabaseData();
  };

  const handleRefundOrder = async (orderNumber, payload) => {
    const updated = await posApi.refundOrder(orderNumber, payload);
    await loadDatabaseData();
    return updated;
  };

  const handleSaveSettings = async (payload) => {
    const updated = await posApi.updateSettings(payload);
    setStoreSettings(updated);
  };

  const handleCreateUser = async (payload) => {
    await posApi.createUser(payload);
    await loadDatabaseData();
  };

  const handleToggleUserStatus = async (id) => {
    await posApi.toggleUserStatus(id);
    await loadDatabaseData();
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-24 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-8 z-10 shadow-sm shrink-0">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
          P.
        </div>

        <nav className="flex flex-col gap-4 flex-1">
          <NavItem
            icon={<Grid />}
            active={activeTab === 'POS'}
            onClick={() => setActiveTab('POS')}
            label="POS"
          />
          <NavItem
            icon={<Tag />}
            active={activeTab === 'Products'}
            onClick={() => setActiveTab('Products')}
            label="Products"
            restricted={isCashier}
          />
          <NavItem
            icon={<ShoppingCart />}
            active={activeTab === 'Orders'}
            onClick={() => setActiveTab('Orders')}
            label="Orders"
          />
          <NavItem
            icon={<Users />}
            active={activeTab === 'Customers'}
            onClick={() => setActiveTab('Customers')}
            label="Customers"
            restricted={isCashier}
          />
          <NavItem
            icon={<Settings />}
            active={activeTab === 'Settings'}
            onClick={() => setActiveTab('Settings')}
            label="Settings"
            restricted={isCashier}
          />
        </nav>

        <button
          type="button"
          onClick={loadDatabaseData}
          title="Sync with SQL Database"
          className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
        >
          <RefreshCw size={22} className={loadingData ? 'animate-spin text-indigo-600' : ''} />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          title={`Sign out (${currentUser?.fullName})`}
          className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut size={24} />
        </button>
      </aside>

      {/* Tab Switching Logic */}
      {activeTab === 'Products' ? (
        <ProductsView
          products={products}
          categories={categories}
          onCreateProduct={handleCreateProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onCreateCategory={handleCreateCategory}
        />
      ) : activeTab === 'Orders' ? (
        <OrdersView
          orders={orders}
          onRefundOrder={handleRefundOrder}
          onPrintReceipt={printReceiptPdf}
        />
      ) : activeTab === 'Customers' ? (
        <CustomersView
          customers={customers}
          onCreateCustomer={handleCreateCustomer}
          onUpdateCustomer={handleUpdateCustomer}
          onDeleteCustomer={handleDeleteCustomer}
        />
      ) : activeTab === 'Settings' ? (
        <SettingsView
          settings={storeSettings}
          users={users}
          currentUser={currentUser}
          onSaveSettings={handleSaveSettings}
          onCreateUser={handleCreateUser}
          onToggleUserStatus={handleToggleUserStatus}
        />
      ) : (
        <>
          {/* Main Content Area (POS) */}
          <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
            {/* Header */}
            <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {storeSettings?.storeName || 'Point of Sale'}
                </h1>
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Database size={14} className="text-indigo-600" />
                  <span>
                    Live SQL Database ({products.length} products, {customers.length} customers)
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-5">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search products by name, SKU, or barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                  />
                </div>

                {/* Staff Profile Chip */}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                      currentUser?.role === 'Administrator'
                        ? 'bg-purple-100 text-purple-700'
                        : currentUser?.role === 'Store Manager' || currentUser?.role === 'Manager'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {currentUser?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser?.fullName}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {currentUser?.role}
                    </span>
                  </div>
                </div>
              </div>
            </header>

            {dbError && (
              <div className="mx-8 mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between gap-4 text-amber-800">
                <div className="flex items-center gap-3 text-sm">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <span>{dbError}</span>
                </div>
                <button
                  type="button"
                  onClick={loadDatabaseData}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shrink-0"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* Product Catalog */}
            <div className="flex-1 p-8 overflow-y-auto">
              {/* Categories */}
              <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all flex flex-col items-center text-center group active:scale-95 ${
                      product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform ${product.color}`}
                    >
                      {product.icon}
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">{product.name}</h3>
                    <p className="text-indigo-600 font-bold">Rs. {Number(product.price).toFixed(2)}</p>
                    <p
                      className={`text-xs mt-2 font-medium ${
                        product.stock <= (product.reorderLevel ?? 15)
                          ? 'text-orange-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </p>
                  </div>
                ))}
                {!loadingData && filteredProducts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500">
                    No products found in the database. Run <code className="font-mono text-indigo-600">02_Insert_Demo_Data.sql</code> or add products in the Products tab.
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Current Order (Cart) Sidebar */}
          <aside className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-lg z-10 shrink-0">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Current Order</h2>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="text-slate-400 hover:text-red-500 disabled:opacity-50 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <Trash2 size={16} />
                Clear
              </button>
            </div>

            {/* Customer & Promo Selection */}
            <div className="px-6 pt-4 pb-2 border-b border-slate-100 grid grid-cols-2 gap-2">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.points} pts)
                  </option>
                ))}
              </select>

              <select
                value={selectedDiscountCode}
                onChange={(e) => setSelectedDiscountCode(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No Promo Code</option>
                {discounts.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} ({d.discountType === 'Percentage' ? `${d.value}%` : `Rs.${d.value}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                  <ShoppingCart size={48} className="opacity-20" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center group">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${item.color}`}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 truncate">{item.name}</h4>
                      <p className="text-indigo-600 font-medium">Rs. {Number(item.price).toFixed(2)}</p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1 border border-slate-200">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 bg-white rounded flex items-center justify-center text-slate-600 hover:text-indigo-600 shadow-sm"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-semibold text-slate-800 w-4 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 bg-white rounded flex items-center justify-center text-slate-600 hover:text-indigo-600 shadow-sm"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary & Checkout */}
            <div className="p-6 bg-slate-50 border-t border-slate-200">
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-800">Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax ({taxRatePercent}%)</span>
                  <span className="font-medium text-slate-800">Rs. {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Discount</span>
                  <span className="font-medium text-emerald-600">-Rs. {discountAmount.toFixed(2)}</span>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-800">Total</span>
                  <span className="text-3xl font-black text-indigo-600">Rs. {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <PaymentButton
                  icon={<Banknote size={20} />}
                  label="Cash"
                  onClick={openCashModal}
                  disabled={cart.length === 0 || checkingOut}
                />
                <PaymentButton
                  icon={<CreditCard size={20} />}
                  label="Card"
                  onClick={() => handleCheckout('Card')}
                  disabled={cart.length === 0 || checkingOut}
                />
                <PaymentButton
                  icon={<Receipt size={20} />}
                  label="E-Wallet"
                  onClick={() => handleCheckout('E-Wallet')}
                  disabled={cart.length === 0 || checkingOut}
                />
              </div>
              <button
                onClick={openCombinedModal}
                disabled={cart.length === 0 || checkingOut}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                {checkingOut ? 'Processing Sale...' : 'Combine Payment'}
              </button>
            </div>
          </aside>
        </>
      )}

      {cashModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCashModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cash-payment-title"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5">
              <h2 id="cash-payment-title" className="text-xl font-bold text-slate-800">
                Cash payment
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review the customer balance and enter the cash received.
              </p>
            </div>

            <label htmlFor="cash-customer" className="mb-2 block text-sm font-semibold text-slate-700">
              Customer
            </label>
            <select
              id="cash-customer"
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Walk-in customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>

            <div className="mb-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">Customer balance</span>
              <span className="font-semibold text-slate-800">
                Rs. {Number(selectedCustomer?.balance ?? 0).toFixed(2)}
              </span>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <label htmlFor="cash-received" className="text-sm font-semibold text-slate-700">
                Cash received
              </label>
              <span className="text-sm font-bold text-indigo-600">
                Amount due: Rs. {total.toFixed(2)}
              </span>
            </div>
            <input
              id="cash-received"
              type="number"
              min={total}
              step="0.01"
              value={cashReceived}
              onChange={(event) => setCashReceived(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-slate-500">Change</span>
              <span className="font-semibold text-slate-800">
                Rs. {Math.max(0, Number(cashReceived || 0) - total).toFixed(2)}
              </span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCashModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={completeCashPayment}
                disabled={Number(cashReceived) < total || checkingOut}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Complete payment
              </button>
            </div>
          </section>
        </div>
      )}

      {combinedModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCombinedModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="combined-payment-title"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5">
              <h2 id="combined-payment-title" className="text-xl font-bold text-slate-800">
                Combine payment methods
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Split this order across two or more payment methods.
              </p>
            </div>

            <label
              htmlFor="combined-customer"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Customer
            </label>
            <select
              id="combined-customer"
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              className="mb-5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Walk-in customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>

            <div className="mb-3 grid grid-cols-[1fr_9rem_2.5rem] gap-2 text-xs font-semibold uppercase text-slate-500">
              <span>Payment method</span>
              <span>Amount (Rs.)</span>
              <span className="sr-only">Remove</span>
            </div>
            <div className="flex flex-col gap-3">
              {paymentSplits.map((split) => {
                const availableMethods = ['Cash', 'Card', 'E-Wallet'].filter(
                  (method) =>
                    method === split.method ||
                    !paymentSplits.some(
                      (other) => other.id !== split.id && other.method === method
                    )
                );
                return (
                  <div
                    key={split.id}
                    className="grid grid-cols-[1fr_9rem_2.5rem] items-center gap-2"
                  >
                    <select
                      aria-label={`Payment method ${split.id}`}
                      value={split.method}
                      onChange={(event) =>
                        setPaymentSplits((previous) =>
                          previous.map((item) =>
                            item.id === split.id ? { ...item, method: event.target.value } : item
                          )
                        )
                      }
                      className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {availableMethods.map((method) => (
                        <option key={method}>{method}</option>
                      ))}
                    </select>
                    <input
                      aria-label={`${split.method} amount`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={split.amount}
                      onChange={(event) =>
                        setPaymentSplits((previous) =>
                          previous.map((item) =>
                            item.id === split.id ? { ...item, amount: event.target.value } : item
                          )
                        )
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-right text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${split.method}`}
                      title={`Remove ${split.method}`}
                      disabled={paymentSplits.length <= 2}
                      onClick={() =>
                        setPaymentSplits((previous) =>
                          previous.filter((item) => item.id !== split.id)
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            {paymentSplits.length < 3 && (
              <button
                type="button"
                onClick={() => {
                  const nextMethod = ['Cash', 'Card', 'E-Wallet'].find(
                    (method) => !paymentSplits.some((split) => split.method === method)
                  );
                  if (nextMethod) {
                    setPaymentSplits((previous) => [
                      ...previous,
                      {
                        id: Math.max(...previous.map((split) => split.id), 0) + 1,
                        method: nextMethod,
                        amount: '',
                      },
                    ]);
                  }
                }}
                className="mt-3 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={16} /> Add payment method
              </button>
            )}

            <div className="mt-5 rounded-lg bg-slate-50 p-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Order total</span>
                <span className="font-semibold text-slate-800">Rs. {total.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-600">Allocated</span>
                <span className="font-semibold text-slate-800">
                  Rs. {(splitTotalCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-600">Remaining</span>
                <span
                  className={`font-bold ${
                    splitTotalCents === totalCents ? 'text-green-700' : 'text-amber-700'
                  }`}
                >
                  Rs. {((totalCents - splitTotalCents) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCombinedModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={completeCombinedPayment}
                disabled={!splitPaymentIsValid || checkingOut}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Complete payment
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, active, label, onClick, restricted = false }) {
  return (
    <button
      onClick={
        restricted
          ? () => alert(`Access Restricted: "${label}" requires Store Manager or Administrator credentials.`)
          : onClick
      }
      className={`p-3 rounded-xl transition-all relative group ${
        restricted
          ? 'text-slate-300 hover:text-slate-400 opacity-40 cursor-not-allowed'
          : active
          ? 'bg-indigo-50 text-indigo-600 shadow-sm'
          : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-500'
      }`}
    >
      {icon}
      <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-medium py-1.5 px-3 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
        {restricted ? `${label} (Manager/Admin Only)` : label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></div>
      </div>
    </button>
  );
}

function PaymentButton({ icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white transition-all text-slate-600 hover:text-indigo-600"
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

export default App;
