import React, { useState, useMemo } from 'react';
import { 
  Search, Grid, Tag, ShoppingCart, Users, Settings, 
  LogOut, Plus, Minus, Trash2, CreditCard, Banknote, Receipt 
} from 'lucide-react';
import { mockProducts, mockCategories, mockOrders, mockCustomers } from './data';
import ProductsView from './components/ProductsView';
import OrdersView from './components/OrdersView';
import CustomersView from './components/CustomersView';
import SettingsView from './components/SettingsView';

function App() {
  const [activeTab, setActiveTab] = useState('POS');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);

  // Filter products based on category and search query for POS view
  const filteredProducts = useMemo(() => {
    return mockProducts.filter(product => {
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Cart operations
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }));
  };

  const clearCart = () => {
    if (window.confirm("Are you sure you want to clear the cart?")) {
      setCart([]);
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  const handleCheckout = (method) => {
    if (cart.length === 0) return;
    alert(`Payment of $${total.toFixed(2)} processed via ${method} successfully!\nReceipt printing...`);
    setCart([]);
  };

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
          />
          <NavItem 
            icon={<Settings />} 
            active={activeTab === 'Settings'} 
            onClick={() => setActiveTab('Settings')} 
            label="Settings" 
          />
        </nav>

        <button className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
          <LogOut size={24} />
        </button>
      </aside>

      {/* Tab Switching Logic */}
      {activeTab === 'Products' ? (
        <ProductsView products={mockProducts} />
      ) : activeTab === 'Orders' ? (
        <OrdersView orders={mockOrders} />
      ) : activeTab === 'Customers' ? (
        <CustomersView customers={mockCustomers} />
      ) : activeTab === 'Settings' ? (
        <SettingsView />
      ) : (
        <>
          {/* Main Content Area (POS) */}
          <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
            {/* Header */}
            <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Point of Sale</h1>
                <p className="text-sm text-slate-500">Welcome back, Cashier</p>
              </div>
              
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search products by name or barcode..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </header>

            {/* Product Catalog */}
            <div className="flex-1 p-8 overflow-y-auto">
              {/* Categories */}
              <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {mockCategories.map(cat => (
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
                {filteredProducts.map(product => (
                  <div 
                    key={product.id} 
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all flex flex-col items-center text-center group active:scale-95"
                  >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform ${product.color}`}>
                      {product.icon}
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">{product.name}</h3>
                    <p className="text-indigo-600 font-bold">${product.price.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-2">{product.stock} in stock</p>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500">
                    No products found matching your search.
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

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                  <ShoppingCart size={48} className="opacity-20" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 items-center group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${item.color}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 truncate">{item.name}</h4>
                      <p className="text-indigo-600 font-medium">${item.price.toFixed(2)}</p>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1 border border-slate-200">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 bg-white rounded flex items-center justify-center text-slate-600 hover:text-indigo-600 shadow-sm"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-semibold text-slate-800 w-4 text-center text-sm">{item.quantity}</span>
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
                  <span className="font-medium text-slate-800">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax (8%)</span>
                  <span className="font-medium text-slate-800">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Discount</span>
                  <span className="font-medium text-slate-800">-$0.00</span>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-800">Total</span>
                  <span className="text-3xl font-black text-indigo-600">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <PaymentButton 
                  icon={<Banknote size={20} />} 
                  label="Cash" 
                  onClick={() => handleCheckout('Cash')}
                  disabled={cart.length === 0}
                />
                <PaymentButton 
                  icon={<CreditCard size={20} />} 
                  label="Card" 
                  onClick={() => handleCheckout('Card')}
                  disabled={cart.length === 0}
                />
                <PaymentButton 
                  icon={<Receipt size={20} />} 
                  label="E-Wallet" 
                  onClick={() => handleCheckout('E-Wallet')}
                  disabled={cart.length === 0}
                />
              </div>
              <button 
                onClick={() => handleCheckout('Card')}
                disabled={cart.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                Pay Now
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function NavItem({ icon, active, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl transition-all relative group ${
        active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-500'
      }`}
    >
      {icon}
      {/* Tooltip */}
      <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-medium py-1.5 px-3 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
        {label}
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
