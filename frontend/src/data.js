export const mockProducts = [
  { id: 1, name: "Fuji Apple", category: "Fruits", price: 1.50, stock: 50, icon: "🍎", color: "bg-red-100 text-red-600" },
  { id: 2, name: "Banana Bunch", category: "Fruits", price: 0.80, stock: 100, icon: "🍌", color: "bg-yellow-100 text-yellow-600" },
  { id: 3, name: "Whole Milk", category: "Dairy", price: 2.50, stock: 20, icon: "🥛", color: "bg-blue-100 text-blue-600" },
  { id: 4, name: "Cheddar Cheese", category: "Dairy", price: 4.00, stock: 15, icon: "🧀", color: "bg-orange-100 text-orange-600" },
  { id: 5, name: "Sourdough Bread", category: "Bakery", price: 2.00, stock: 30, icon: "🍞", color: "bg-amber-100 text-amber-600" },
  { id: 6, name: "Croissant", category: "Bakery", price: 2.50, stock: 10, icon: "🥐", color: "bg-orange-100 text-orange-600" },
  { id: 7, name: "Espresso", category: "Beverages", price: 3.00, stock: 40, icon: "☕", color: "bg-stone-200 text-stone-700" },
  { id: 8, name: "Green Tea", category: "Beverages", price: 2.00, stock: 60, icon: "🍵", color: "bg-green-100 text-green-600" },
  { id: 9, name: "Watermelon", category: "Fruits", price: 5.00, stock: 10, icon: "🍉", color: "bg-pink-100 text-pink-600" },
  { id: 10, name: "Orange Juice", category: "Beverages", price: 3.50, stock: 25, icon: "🧃", color: "bg-orange-100 text-orange-600" },
  { id: 11, name: "Avocado", category: "Fruits", price: 2.20, stock: 45, icon: "🥑", color: "bg-green-100 text-green-600" },
  { id: 12, name: "Baguette", category: "Bakery", price: 1.80, stock: 20, icon: "🥖", color: "bg-amber-100 text-amber-600" },
];

export const mockCategories = ["All", "Fruits", "Dairy", "Bakery", "Beverages"];

export const mockOrders = [
  { id: "ORD-1042", date: "2026-09-28T10:30:00", customer: "Walk-in", total: 15.50, method: "Cash", status: "Completed", items: 3 },
  { id: "ORD-1043", date: "2026-09-28T11:15:00", customer: "John Doe", total: 42.80, method: "Card", status: "Completed", items: 5 },
  { id: "ORD-1044", date: "2026-09-28T12:05:00", customer: "Walk-in", total: 8.00, method: "E-Wallet", status: "Completed", items: 1 },
  { id: "ORD-1045", date: "2026-09-28T13:45:00", customer: "Jane Smith", total: 112.50, method: "Card", status: "Refunded", items: 12 },
  { id: "ORD-1046", date: "2026-09-28T14:20:00", customer: "Walk-in", total: 24.00, method: "Cash", status: "Completed", items: 4 },
  { id: "ORD-1047", date: "2026-09-28T15:10:00", customer: "Michael B.", total: 6.50, method: "E-Wallet", status: "Completed", items: 2 },
];

export const mockCustomers = [
  { id: "CUST-001", name: "John Doe", email: "john@example.com", phone: "+1 234-567-8900", points: 450, tier: "Gold", lastVisit: "2026-09-28", balance: 0 },
  { id: "CUST-002", name: "Jane Smith", email: "jane.smith@example.com", phone: "+1 987-654-3210", points: 120, tier: "Silver", lastVisit: "2026-09-27", balance: 0 },
  { id: "CUST-003", name: "Michael B.", email: "mike.b@example.com", phone: "+1 555-123-4567", points: 85, tier: "Bronze", lastVisit: "2026-09-25", balance: 0 },
  { id: "CUST-004", name: "Sarah Connor", email: "sarah.c@example.com", phone: "+1 555-987-6543", points: 1250, tier: "Platinum", lastVisit: "2026-09-28", balance: 0 },
];

