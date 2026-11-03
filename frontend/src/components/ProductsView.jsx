import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  FolderPlus,
  X,
  ClipboardPlus,
  PackagePlus,
  FileSpreadsheet,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const ICON_OPTIONS = [
  '🍎',
  '🍌',
  '🥑',
  '🍉',
  '🥛',
  '🧀',
  '🥚',
  '🧈',
  '🍞',
  '🥐',
  '🥖',
  '🍵',
  '☕',
  '🧃',
  '🌾',
  '🥥',
  '🍫',
  '🥔',
  '📦',
];
const COLOR_OPTIONS = [
  { label: 'Indigo', value: 'bg-indigo-100 text-indigo-600' },
  { label: 'Red', value: 'bg-red-100 text-red-600' },
  { label: 'Amber', value: 'bg-amber-100 text-amber-600' },
  { label: 'Green', value: 'bg-green-100 text-green-600' },
  { label: 'Blue', value: 'bg-blue-100 text-blue-600' },
  { label: 'Orange', value: 'bg-orange-100 text-orange-600' },
  { label: 'Pink', value: 'bg-pink-100 text-pink-600' },
  { label: 'Emerald', value: 'bg-emerald-100 text-emerald-600' },
];

export default function ProductsView({
  products,
  categories,
  stockAdjustments = [],
  currentUser,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onCreateCategory,
  onCreateStockAdjustment,
}) {
  const isAdmin =
    currentUser?.role === 'Administrator' ||
    currentUser?.role === 'Admin' ||
    currentUser?.username?.toLowerCase() === 'admin';

  const [activeSubTab, setActiveSubTab] = useState('master'); // 'master' | 'grn'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Product Master Modal (No Stock Input - Only Master Data & Reorder Level)
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Goods Received from Production (GRN) / Stock Adjustment Note Modal (Admin Exclusive)
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [grnError, setGrnError] = useState('');
  const [grnForm, setGrnForm] = useState({
    noteType: 'Goods Received from Production (GRN)',
    batchReference: '',
    remarks: '',
    items: [{ id: 1, productId: '', quantity: '10' }],
  });

  const nonAllCategories = categories.filter((c) => c !== 'All');

  const [form, setForm] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: nonAllCategories[0] || '',
    price: '',
    costPrice: '',
    reorderLevel: '15',
    icon: '📦',
    color: 'bg-indigo-100 text-indigo-600',
  });

  const [newCategoryName, setNewCategoryName] = useState('');

  const filteredProducts = products.filter(
    (product) =>
      (activeCategory === 'All' || product.category === activeCategory) &&
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const filteredAdjustments = stockAdjustments.filter(
    (note) =>
      !searchQuery.trim() ||
      note.noteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.noteType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.batchReference && note.batchReference.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const requireAdmin = (actionName) => {
    if (!isAdmin) {
      alert(`Access Restricted: "${actionName}" is exclusive to Administrator login.`);
      return false;
    }
    return true;
  };

  const openAddModal = () => {
    if (!requireAdmin('Add Product to Inventory Master')) return;
    setEditingProduct(null);
    setError('');
    setForm({
      sku: '',
      barcode: '',
      name: '',
      category: nonAllCategories[0] || '',
      price: '',
      costPrice: '',
      reorderLevel: '15',
      icon: '📦',
      color: 'bg-indigo-100 text-indigo-600',
    });
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    if (!requireAdmin('Edit Inventory Master')) return;
    setEditingProduct(product);
    setError('');
    setForm({
      sku: product.sku || '',
      barcode: product.barcode || '',
      name: product.name || '',
      category: product.category || nonAllCategories[0] || '',
      price: String(product.price ?? ''),
      costPrice: String(product.costPrice ?? ''),
      reorderLevel: String(product.reorderLevel ?? 15),
      icon: product.icon || '📦',
      color: product.color || 'bg-indigo-100 text-indigo-600',
    });
    setModalOpen(true);
  };

  const openGrnModal = (preselectedProductId = null) => {
    if (!requireAdmin('Goods Received from Production (GRN) & Stock Adjustment Note')) return;
    setGrnError('');
    const defaultProdId = preselectedProductId
      ? String(preselectedProductId)
      : products[0]
      ? String(products[0].id)
      : '';
    setGrnForm({
      noteType: 'Goods Received from Production (GRN)',
      batchReference: `PROD-${new Date().toISOString().slice(0, 10)}`,
      remarks: 'Goods received from production into store inventory',
      items: [{ id: 1, productId: defaultProdId, quantity: '20' }],
    });
    setGrnModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        sku: form.sku,
        barcode: form.barcode,
        name: form.name,
        category: form.category,
        price: Number(form.price),
        costPrice: Number(form.costPrice || 0),
        // Stock is intentionally omitted from Inventory Master creation/edit (defaults to 0 on creation)
        reorderLevel: Number(form.reorderLevel || 15),
        icon: form.icon,
        color: form.color,
      };
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, payload);
      } else {
        await onCreateProduct(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleGrnSubmit = async (e) => {
    e.preventDefault();
    if (!onCreateStockAdjustment) return;
    setGrnError('');

    const validItems = grnForm.items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      }));

    if (validItems.length === 0) {
      setGrnError('Please select at least one product and enter a quantity greater than 0.');
      return;
    }

    setSaving(true);
    try {
      await onCreateStockAdjustment({
        noteType: grnForm.noteType,
        batchReference: grnForm.batchReference,
        remarks: grnForm.remarks,
        userId: currentUser?.id ?? 1,
        username: currentUser?.username ?? 'admin',
        userRole: currentUser?.role ?? 'Administrator',
        items: validItems,
      });
      setGrnModalOpen(false);
    } catch (err) {
      setGrnError(err.message || 'Failed to post Goods Received / Stock Adjustment Note');
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSaving(true);
    try {
      await onCreateCategory({ name: newCategoryName.trim() });
      setNewCategoryName('');
      setCategoryModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const isNegativeAdjustment = grnForm.noteType.includes('(-)');

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory & Production Receiving</h1>
          <p className="text-sm text-slate-500">
            Inventory Master (Reorder Levels) & Goods Received from Production (GRN) / Adjustment Notes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search SKU, barcode, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (!requireAdmin('Add Product Category')) return;
              setCategoryModalOpen(true);
            }}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <FolderPlus size={17} />
            Add Category
          </button>

          <button
            type="button"
            onClick={() => openGrnModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm"
            title="Admin Exclusive: Receive stock from production or post a stock adjustment note"
          >
            <ClipboardPlus size={18} />
            <span>GRN / Stock Adjustment Note</span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-100">
              Admin
            </span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </header>

      {/* Sub-Navigation Bar: Inventory Master vs GRN & Stock Adjustment Notes */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSubTab('master')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'master'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet size={16} />
            Inventory Master ({products.length})
          </button>

          <button
            type="button"
            onClick={() => {
              if (!requireAdmin('Goods Received from Production (GRN) & Stock Adjustment Notes')) {
                return;
              }
              setActiveSubTab('grn');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'grn'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <PackagePlus size={16} />
            <span>Goods Received from Production & Adjustment Notes ({stockAdjustments.length})</span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              Admin
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <ShieldAlert size={14} className="text-indigo-600" />
          <span>
            New products start at <strong>0 stock</strong> in Inventory Master. Stock is added via{' '}
            <strong>Goods Received from Production (GRN)</strong> & reduced by <strong>Sales Invoices</strong>.
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeSubTab === 'master' ? (
          <>
            <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                    activeCategory === category
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-500">
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-6">SKU / Barcode</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Price</th>
                    <th className="py-4 px-6">Reorder Level</th>
                    <th className="py-4 px-6">Current Stock Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const reorderLevel = product.reorderLevel ?? 20;
                    return (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${product.color}`}
                            >
                              {product.icon}
                            </div>
                            <span className="font-semibold text-slate-800">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                          <div className="font-semibold text-slate-700">{product.sku}</div>
                          <div>{product.barcode}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium border border-slate-200">
                            {product.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-700">
                          Rs. {Number(product.price).toFixed(2)}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                            Min {reorderLevel} units
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {product.stock > reorderLevel ? (
                            <span className="text-green-600 text-sm font-medium flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              {product.stock} in stock
                            </span>
                          ) : product.stock > 0 ? (
                            <span className="text-orange-500 text-sm font-medium flex items-center gap-1.5">
                              <AlertCircle size={14} />
                              Low Stock ({product.stock} / min {reorderLevel})
                            </span>
                          ) : (
                            <span className="text-red-500 text-sm font-medium flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              Out of stock (0)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openGrnModal(product.id)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Admin Exclusive: Receive stock from production (GRN) or adjust stock"
                            >
                              <PackagePlus size={14} />
                              + GRN / Adjust
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit product master details & reorder level"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!requireAdmin('Delete / Deactivate Product')) return;
                                if (window.confirm(`Delete or deactivate "${product.name}"?`)) {
                                  onDeleteProduct(product.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete product"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500">
                        No products found in the database matching your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* GRN & Stock Adjustment Notes Ledger Table */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  Goods Received from Production (GRN) & Stock Adjustment Notes
                </h3>
                <p className="text-xs text-slate-500">
                  Complete audit ledger of all production stock receipts and inventory adjustments
                </p>
              </div>
              <button
                type="button"
                onClick={() => openGrnModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-sm"
              >
                <ClipboardPlus size={16} />
                New GRN / Adjustment Note
              </button>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="py-3.5 px-6">Note No.</th>
                  <th className="py-3.5 px-6">Date & Time</th>
                  <th className="py-3.5 px-6">Note Type</th>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Batch / Ref</th>
                  <th className="py-3.5 px-6">Prev Stock</th>
                  <th className="py-3.5 px-6">Qty Adjusted</th>
                  <th className="py-3.5 px-6">New Stock</th>
                  <th className="py-3.5 px-6">Posted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAdjustments.map((note) => {
                  const isPositive = note.quantityChange >= 0;
                  return (
                    <tr key={note.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-6 font-bold text-indigo-600 font-mono">
                        {note.noteNumber}
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 text-xs">
                        {new Date(note.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            note.noteType.includes('Production') || note.noteType.includes('GRN')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPositive
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {note.noteType}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-800">{note.productName}</div>
                        <div className="text-xs text-slate-400 font-mono">{note.sku}</div>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-slate-600">
                        <div>{note.batchReference || '—'}</div>
                        {note.remarks && (
                          <div className="text-slate-400 truncate max-w-xs" title={note.remarks}>
                            {note.remarks}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 font-medium">{note.previousStock}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isPositive ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {isPositive ? `+${note.quantityChange}` : note.quantityChange}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-bold text-slate-800">{note.newStock}</td>
                      <td className="py-3.5 px-6 text-xs font-semibold text-slate-600">
                        @{note.createdByUsername}
                      </td>
                    </tr>
                  );
                })}
                {filteredAdjustments.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      No Goods Received from Production (GRN) or Stock Adjustment Notes posted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Master Modal (Stock Addition Removed - Kept Reorder Level) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingProduct ? 'Edit Product Master' : 'Add Product to Inventory Master'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defines item master data & reorder alert threshold (Initial Stock = 0)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-800 flex items-center justify-between">
              <span>
                {editingProduct ? (
                  <>
                    Current Stock: <strong>{editingProduct.stock} units</strong> (Managed via GRN / Adjustment Note)
                  </>
                ) : (
                  <>
                    Initial stock is set to <strong>0 units</strong>. Receive stock via{' '}
                    <strong>GRN / Stock Adjustment Note</strong>.
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                <input
                  required
                  list="category-options"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Select or type category"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="category-options">
                  {nonAllCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Barcode</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Auto-generated if blank"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Selling Price (Rs.) *
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Cost Price (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Low-Stock Reorder Level *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.reorderLevel}
                  onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Icon</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ICON_OPTIONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Badge Theme</label>
                <select
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
              >
                {saving ? 'Saving...' : editingProduct ? 'Update Product Master' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goods Received from Production (GRN) / Stock Adjustment Note Modal (Admin Exclusive) */}
      {grnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleGrnSubmit}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-800">
                    Goods Received from Production / Stock Adjustment Note
                  </h2>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    Admin Exclusive
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receive finished goods from production or post an inventory stock adjustment
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGrnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {grnError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                {grnError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 shrink-0">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Note Type *</label>
                <select
                  value={grnForm.noteType}
                  onChange={(e) => setGrnForm({ ...grnForm, noteType: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Goods Received from Production (GRN)">
                    Goods Received from Production (GRN) (+ Stock)
                  </option>
                  <option value="Stock Adjustment (+)">
                    Stock Adjustment (+) (Add Stock)
                  </option>
                  <option value="Stock Adjustment (-)">
                    Stock Adjustment (-) (Damage / Wastage Deduction)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Production Batch / Reference No.
                </label>
                <input
                  type="text"
                  value={grnForm.batchReference}
                  onChange={(e) => setGrnForm({ ...grnForm, batchReference: e.target.value })}
                  placeholder="e.g., PROD-BATCH-001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Note Remarks / Production Description
                </label>
                <input
                  type="text"
                  value={grnForm.remarks}
                  onChange={(e) => setGrnForm({ ...grnForm, remarks: e.target.value })}
                  placeholder="Enter production batch details or adjustment reason..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <div className="grid grid-cols-[1fr_7rem_9rem_2rem] gap-2 text-xs font-semibold uppercase text-slate-500">
                <span>Product</span>
                <span>Qty {isNegativeAdjustment ? '(-)' : '(+)'}</span>
                <span>Stock Preview</span>
                <span></span>
              </div>

              {grnForm.items.map((line) => {
                const selectedProd = products.find((p) => String(p.id) === String(line.productId));
                const currentStock = selectedProd ? selectedProd.stock : 0;
                const qtyNum = Math.max(0, Number(line.quantity || 0));
                const projectedStock = isNegativeAdjustment
                  ? currentStock - qtyNum
                  : currentStock + qtyNum;

                return (
                  <div
                    key={line.id}
                    className="grid grid-cols-[1fr_7rem_9rem_2rem] items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200"
                  >
                    <select
                      required
                      value={line.productId}
                      onChange={(e) =>
                        setGrnForm((prev) => ({
                          ...prev,
                          items: prev.items.map((it) =>
                            it.id === line.id ? { ...it, productId: e.target.value } : it
                          ),
                        }))
                      }
                      className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — Stock: {p.stock}
                        </option>
                      ))}
                    </select>

                    <input
                      required
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) =>
                        setGrnForm((prev) => ({
                          ...prev,
                          items: prev.items.map((it) =>
                            it.id === line.id ? { ...it, quantity: e.target.value } : it
                          ),
                        }))
                      }
                      className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-right font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <div className="text-xs font-semibold px-2">
                      {selectedProd ? (
                        <span
                          className={
                            projectedStock < 0 ? 'text-red-600' : 'text-emerald-700'
                          }
                        >
                          {currentStock} → <strong>{projectedStock}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={grnForm.items.length <= 1}
                      onClick={() =>
                        setGrnForm((prev) => ({
                          ...prev,
                          items: prev.items.filter((it) => it.id !== line.id),
                        }))
                      }
                      className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  setGrnForm((prev) => ({
                    ...prev,
                    items: [
                      ...prev.items,
                      {
                        id: Math.max(...prev.items.map((i) => i.id), 0) + 1,
                        productId: products[0] ? String(products[0].id) : '',
                        quantity: '10',
                      },
                    ],
                  }))
                }
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 pt-1"
              >
                <Plus size={14} /> Add another product line to this note
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setGrnModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
              >
                {saving ? 'Posting Note...' : 'Post Note & Update Stock'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Category Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleCategorySubmit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-800">Add Product Category</h2>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name *</label>
              <input
                required
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Frozen Foods"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
              >
                {saving ? 'Saving...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
