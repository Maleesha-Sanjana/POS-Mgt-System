/* ============================================================================
   POS MANAGEMENT SYSTEM - DEMO / SEED DATA INSERTION SCRIPT (SQL SERVER)
   Database Name : PosManagementDb
   Description   : Populates all 13 POS tables with realistic Sri Lankan retail
                   supermarket data for live demonstrations and testing.
   ============================================================================ */

USE [PosManagementDb];
GO

SET NOCOUNT ON;
BEGIN TRANSACTION;

/* ----------------------------------------------------------------------------
   0. CLEAR EXISTING DATA & RESET IDENTITIES (SAFE TO RE-RUN ANYTIME)
   ---------------------------------------------------------------------------- */
DELETE FROM dbo.AuditLogs;
DELETE FROM dbo.Refunds;
DELETE FROM dbo.OrderPayments;
DELETE FROM dbo.OrderItems;
DELETE FROM dbo.Orders;
DELETE FROM dbo.TillSessions;
DELETE FROM dbo.Discounts;
DELETE FROM dbo.Customers;
DELETE FROM dbo.Products;
DELETE FROM dbo.Categories;
DELETE FROM dbo.StoreSettings;
DELETE FROM dbo.Users;
DELETE FROM dbo.Roles;

DBCC CHECKIDENT ('dbo.AuditLogs', RESEED, 0);
DBCC CHECKIDENT ('dbo.Refunds', RESEED, 0);
DBCC CHECKIDENT ('dbo.OrderPayments', RESEED, 0);
DBCC CHECKIDENT ('dbo.OrderItems', RESEED, 0);
DBCC CHECKIDENT ('dbo.Orders', RESEED, 0);
DBCC CHECKIDENT ('dbo.TillSessions', RESEED, 0);
DBCC CHECKIDENT ('dbo.Discounts', RESEED, 0);
DBCC CHECKIDENT ('dbo.Customers', RESEED, 0);
DBCC CHECKIDENT ('dbo.Products', RESEED, 0);
DBCC CHECKIDENT ('dbo.Categories', RESEED, 0);
DBCC CHECKIDENT ('dbo.StoreSettings', RESEED, 0);
DBCC CHECKIDENT ('dbo.Users', RESEED, 0);
DBCC CHECKIDENT ('dbo.Roles', RESEED, 0);

/* ----------------------------------------------------------------------------
   1. ROLES
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.Roles ON;
INSERT INTO dbo.Roles (Id, Name, Description) VALUES
(1, N'Administrator', N'Full system access: user management, branch/tax settings, and audit logs.'),
(2, N'Manager',       N'Store management: inventory, pricing, discounts, refunds, and reports.'),
(3, N'Cashier',       N'POS terminal operations: till sessions, billing, checkout, and receipts.');
SET IDENTITY_INSERT dbo.Roles OFF;

/* ----------------------------------------------------------------------------
   2. USERS (Default demo password for all accounts: Demo@123)
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.Users ON;
INSERT INTO dbo.Users (Id, Username, FullName, Email, PasswordHash, RoleId, IsActive, CreatedAt, LastLoginAt) VALUES
(1, N'admin',    N'Denuka Jayasundara', N'denuka.admin@freshmart.lk',   N'SHA256:Demo@123', 1, 1, DATEADD(DAY, -60, SYSUTCDATETIME()), SYSUTCDATETIME()),
(2, N'manager',  N'Maleesha Sanjana',   N'maleesha.mgr@freshmart.lk',   N'SHA256:Demo@123', 2, 1, DATEADD(DAY, -60, SYSUTCDATETIME()), SYSUTCDATETIME()),
(3, N'cashier1', N'Randini Gunasekara', N'randini.pos@freshmart.lk',    N'SHA256:Demo@123', 3, 1, DATEADD(DAY, -45, SYSUTCDATETIME()), SYSUTCDATETIME()),
(4, N'cashier2', N'Kasun Perera',       N'kasun.pos@freshmart.lk',      N'SHA256:Demo@123', 3, 1, DATEADD(DAY, -30, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()));
SET IDENTITY_INSERT dbo.Users OFF;

/* ----------------------------------------------------------------------------
   3. STORE SETTINGS
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.StoreSettings ON;
INSERT INTO dbo.StoreSettings (
    Id, StoreName, BranchCode, StoreAddress, Phone, Email,
    Currency, DefaultTaxRate, LowStockThreshold, LoyaltyPointsPerHundredRs,
    ReceiptFooterText, ReceiptPrinterName, ReceiptPrinterConnected,
    BarcodeScannerName, BarcodeScannerConnected, PaymentTerminalName, PaymentTerminalConnected, UpdatedAt
) VALUES (
    1, N'FreshMart Supermarket', N'BR-CMB-001', N'No. 145, Galle Road, Colombo 03, Sri Lanka',
    N'+94 11 234 5678', N'support@freshmart.lk',
    N'LKR', 8.00, 20, 1,
    N'Thank you for shopping at FreshMart! Visit again soon.',
    N'EPSON TM-T88VI', 1,
    N'Symbol LS2208', 1,
    N'Verifone VX520', 1,
    SYSUTCDATETIME()
);
SET IDENTITY_INSERT dbo.StoreSettings OFF;

/* ----------------------------------------------------------------------------
   4. CATEGORIES
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.Categories ON;
INSERT INTO dbo.Categories (Id, Name, Description, DisplayOrder, IsActive) VALUES
(1, N'Fruits & Veg', N'Fresh local and imported fruits and vegetables', 1, 1),
(2, N'Dairy & Eggs', N'Fresh milk, cheese, butter, curd, and farm eggs', 2, 1),
(3, N'Bakery',       N'Freshly baked bread, buns, croissants, and pastries', 3, 1),
(4, N'Beverages',    N'Ceylon tea, coffee, fruit juices, and soft drinks', 4, 1),
(5, N'Grocery',      N'Rice, spices, noodles, cooking oil, and pantry staples', 5, 1),
(6, N'Snacks',       N'Biscuits, chocolates, chips, and confectionery', 6, 1);
SET IDENTITY_INSERT dbo.Categories OFF;

/* ----------------------------------------------------------------------------
   5. PRODUCTS (Includes healthy stock, low stock, and out-of-stock items)
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.Products ON;
INSERT INTO dbo.Products (
    Id, Sku, Barcode, Name, CategoryId, Price, CostPrice, Stock, ReorderLevel, Icon, Color, IsActive
) VALUES
(1,  N'FRU-001', N'479100100001', N'Fuji Apple (500g)',          1,  450.00,  320.00, 55, 20, N'🍎', N'bg-red-100 text-red-600',       1),
(2,  N'FRU-002', N'479100100002', N'Ambul Banana (1kg)',         1,  280.00,  190.00, 85, 25, N'🍌', N'bg-yellow-100 text-yellow-600', 1),
(3,  N'FRU-003', N'479100100003', N'Organic Avocado',            1,  320.00,  210.00, 42, 15, N'🥑', N'bg-green-100 text-green-600',   1),
(4,  N'FRU-004', N'479100100004', N'Sweet Watermelon',           1,  650.00,  450.00, 12, 15, N'🍉', N'bg-pink-100 text-pink-600',     1),
(5,  N'DAI-001', N'479100200001', N'Ambewela Fresh Milk (1L)',   2,  520.00,  410.00, 40, 20, N'🥛', N'bg-blue-100 text-blue-600',     1),
(6,  N'DAI-002', N'479100200002', N'Kotmale Cheddar Cheese',     2, 1250.00,  950.00, 14, 15, N'🧀', N'bg-orange-100 text-orange-600', 1),
(7,  N'DAI-003', N'479100200003', N'Farm Brown Eggs (10 Pack)',  2,  580.00,  460.00, 60, 20, N'🥚', N'bg-amber-100 text-amber-600',   1),
(8,  N'DAI-004', N'479100200004', N'Salted Butter (200g)',       2,  890.00,  700.00,  8, 15, N'🧈', N'bg-yellow-100 text-yellow-600', 1),
(9,  N'BAK-001', N'479100300001', N'Artisan Sourdough Bread',    3,  420.00,  260.00, 30, 10, N'🍞', N'bg-amber-100 text-amber-600',   1),
(10, N'BAK-002', N'479100300002', N'Butter Croissant',           3,  350.00,  200.00,  9, 15, N'🥐', N'bg-orange-100 text-orange-600', 1),
(11, N'BAK-003', N'479100300003', N'French Baguette',            3,  300.00,  180.00, 24, 10, N'🥖', N'bg-amber-100 text-amber-600',   1),
(12, N'BEV-001', N'479100400001', N'Ceylon Green Tea (100g)',    4,  680.00,  480.00, 65, 20, N'🍵', N'bg-green-100 text-green-600',   1),
(13, N'BEV-002', N'479100400002', N'Roasted Espresso Beans',     4, 1450.00, 1050.00, 35, 15, N'☕', N'bg-stone-200 text-stone-700',   1),
(14, N'BEV-003', N'479100400003', N'Fresh Orange Juice (1L)',    4,  750.00,  540.00, 28, 15, N'🧃', N'bg-orange-100 text-orange-600', 1),
(15, N'GRO-001', N'479100500001', N'Keeri Samba Rice (5kg)',     5, 1350.00, 1120.00, 50, 20, N'🌾', N'bg-emerald-100 text-emerald-600', 1),
(16, N'GRO-002', N'479100500002', N'Pure Coconut Oil (1L)',      5,  980.00,  780.00, 32, 15, N'🥥', N'bg-teal-100 text-teal-600',     1),
(17, N'SNK-001', N'479100600001', N'Dark Chocolate Bar (100g)',  6,  490.00,  340.00, 48, 20, N'🍫', N'bg-purple-100 text-purple-600', 1),
(18, N'SNK-002', N'479100600002', N'Salted Potato Crisps',       6,  360.00,  240.00,  5, 15, N'🥔', N'bg-yellow-100 text-yellow-600', 1);
SET IDENTITY_INSERT dbo.Products OFF;

/* ----------------------------------------------------------------------------
   6. CUSTOMERS & LOYALTY PROFILES
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.Customers ON;
INSERT INTO dbo.Customers (
    Id, CustomerCode, Name, Email, Phone, Points, Tier, Balance, LastVisit, IsActive
) VALUES
(1, N'CUST-001', N'Nimal Perera',       N'nimal.perera@gmail.com',     N'+94 77 123 4567',  480, N'Gold',     0.00, DATEADD(HOUR, -3, SYSUTCDATETIME()), 1),
(2, N'CUST-002', N'Dilani Silva',       N'dilani.silva@yahoo.com',     N'+94 71 987 6543',  165, N'Silver',   0.00, DATEADD(DAY,  -1, SYSUTCDATETIME()), 1),
(3, N'CUST-003', N'Rohan Fernando',     N'rohan.f@outlook.com',        N'+94 76 555 1234',   85, N'Bronze',   0.00, DATEADD(DAY,  -3, SYSUTCDATETIME()), 1),
(4, N'CUST-004', N'Chamari Jayawardena',N'chamari.j@sltnet.lk',        N'+94 77 888 9900', 1420, N'Platinum', 0.00, DATEADD(HOUR, -1, SYSUTCDATETIME()), 1),
(5, N'CUST-005', N'Nuwan Bandara',      N'nuwan.bandara@gmail.com',    N'+94 70 321 7654',  310, N'Silver',   0.00, DATEADD(DAY,  -2, SYSUTCDATETIME()), 1),
(6, N'CUST-006', N'Sachini Wijesinghe', N'sachini.w@gmail.com',        N'+94 75 444 2211',  620, N'Gold',     0.00, DATEADD(DAY,  -4, SYSUTCDATETIME()), 1),
(7, N'CUST-007', N'Tharindu Rajapaksha',N'tharindu.r@hotmail.com',     N'+94 78 654 0987',   45, N'Bronze',   0.00, DATEADD(DAY,  -6, SYSUTCDATETIME()), 1),
(8, N'CUST-008', N'Anushka Senanayake', N'anushka.s@company.lk',       N'+94 77 222 3344', 1850, N'Platinum', 0.00, DATEADD(HOUR, -5, SYSUTCDATETIME()), 1);
SET IDENTITY_INSERT dbo.Customers OFF;

/* ----------------------------------------------------------------------------
   7. DISCOUNTS & PROMOTIONS
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.Discounts ON;
INSERT INTO dbo.Discounts (
    Id, Code, Name, DiscountType, Value, MinOrderAmount, IsActive, ValidFrom, ValidUntil
) VALUES
(1, N'WELCOME5',  N'Welcome 5% Off',            N'Percentage',   5.00, 1000.00, 1, DATEADD(DAY, -30, SYSUTCDATETIME()), DATEADD(DAY, 90, SYSUTCDATETIME())),
(2, N'FESTIVE10', N'Festive Season 10% Off',    N'Percentage',  10.00, 2500.00, 1, DATEADD(DAY, -15, SYSUTCDATETIME()), DATEADD(DAY, 60, SYSUTCDATETIME())),
(3, N'SAVE250',   N'Flat Rs. 250 Off Basket',   N'Fixed',      250.00, 2000.00, 1, DATEADD(DAY, -10, SYSUTCDATETIME()), DATEADD(DAY, 45, SYSUTCDATETIME())),
(4, N'VIP15',     N'Loyalty VIP 15% Discount',  N'Percentage',  15.00, 5000.00, 1, DATEADD(DAY, -30, SYSUTCDATETIME()), DATEADD(DAY, 90, SYSUTCDATETIME()));
SET IDENTITY_INSERT dbo.Discounts OFF;

/* ----------------------------------------------------------------------------
   8. TILL SESSIONS
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.TillSessions ON;
INSERT INTO dbo.TillSessions (
    Id, UserId, OpenedAt, ClosedAt, OpeningFloat, ClosingCashCounted, ExpectedCash, Variance, Status, Notes
) VALUES
(1, 3, DATEADD(DAY, -1, SYSUTCDATETIME()), DATEADD(HOUR, -14, SYSUTCDATETIME()), 10000.00, 18450.00, 18450.00, 0.00, N'Closed', N'Yesterday shift balanced cleanly.'),
(2, 3, DATEADD(HOUR, -6, SYSUTCDATETIME()), NULL,                                 10000.00, NULL,     NULL,     NULL, N'Open',   N'Current active morning shift.');
SET IDENTITY_INSERT dbo.TillSessions OFF;

/* ----------------------------------------------------------------------------
   9. ORDERS (Sample Completed, Split-Payment, and Refunded Transactions)
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.Orders ON;
INSERT INTO dbo.Orders (
    Id, OrderNumber, OrderDate, CustomerId, CustomerName, CashierUserId, TillSessionId, DiscountId,
    Subtotal, DiscountAmount, TaxRate, TaxAmount, TotalAmount,
    PaymentMethodSummary, CashTendered, ChangeGiven, PointsEarned, PointsRedeemed, Status
) VALUES
(1, N'ORD-1001', DATEADD(HOUR, -26, SYSUTCDATETIME()), 1,    N'Nimal Perera',        3, 1, NULL,
    1820.00,   0.00, 8.00, 145.60, 1965.60, N'Cash',          2000.00,  34.40, 19, 0, N'Completed'),

(2, N'ORD-1002', DATEADD(HOUR, -24, SYSUTCDATETIME()), 2,    N'Dilani Silva',        3, 1, 1,
    3150.00, 157.50, 8.00, 239.40, 3231.90, N'Card',          NULL,      0.00, 32, 0, N'Completed'),

(3, N'ORD-1003', DATEADD(HOUR, -20, SYSUTCDATETIME()), NULL, N'Walk-in',             4, 1, NULL,
    1030.00,   0.00, 8.00,  82.40, 1112.40, N'E-Wallet',      NULL,      0.00,  0, 0, N'Completed'),

(4, N'ORD-1004', DATEADD(HOUR, -18, SYSUTCDATETIME()), 4,    N'Chamari Jayawardena', 3, 1, 2,
    4630.00, 463.00, 8.00, 333.36, 4500.36, N'Cash + Card',   2000.00,   0.00, 45, 0, N'Completed'),

(5, N'ORD-1005', DATEADD(HOUR, -5,  SYSUTCDATETIME()), 5,    N'Nuwan Bandara',       3, 2, NULL,
    1600.00,   0.00, 8.00, 128.00, 1728.00, N'Card',          NULL,      0.00, 17, 0, N'Refunded'),

(6, N'ORD-1006', DATEADD(HOUR, -3,  SYSUTCDATETIME()), 8,    N'Anushka Senanayake',  3, 2, 3,
    2790.00, 250.00, 8.00, 203.20, 2743.20, N'Cash',          3000.00, 256.80, 27, 0, N'Completed'),

(7, N'ORD-1007', DATEADD(HOUR, -1,  SYSUTCDATETIME()), NULL, N'Walk-in',             3, 2, NULL,
    1490.00,   0.00, 8.00, 119.20, 1609.20, N'Cash',          2000.00, 390.80,  0, 0, N'Completed');
SET IDENTITY_INSERT dbo.Orders OFF;

/* ----------------------------------------------------------------------------
   10. ORDER ITEMS
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.OrderItems ON;
INSERT INTO dbo.OrderItems (
    Id, OrderId, ProductId, ProductName, Barcode, UnitPrice, CostPrice, Quantity, DiscountAmount, LineTotal
) VALUES
-- ORD-1001 (Subtotal: 1820.00)
(1,  1, 1,  N'Fuji Apple (500g)',         N'479100100001',  450.00,  320.00, 2, 0.00,  900.00),
(2,  1, 5,  N'Ambewela Fresh Milk (1L)',  N'479100200001',  520.00,  410.00, 1, 0.00,  520.00),
(3,  1, 9,  N'Artisan Sourdough Bread',   N'479100300001',  400.00,  260.00, 1, 0.00,  400.00),

-- ORD-1002 (Subtotal: 3150.00)
(4,  2, 15, N'Keeri Samba Rice (5kg)',    N'479100500001', 1350.00, 1120.00, 1, 0.00, 1350.00),
(5,  2, 6,  N'Kotmale Cheddar Cheese',    N'479100200002', 1250.00,  950.00, 1, 0.00, 1250.00),
(6,  2, 2,  N'Ambul Banana (1kg)',        N'479100100002',  275.00,  190.00, 2, 0.00,  550.00),

-- ORD-1003 (Subtotal: 1030.00)
(7,  3, 12, N'Ceylon Green Tea (100g)',   N'479100400001',  680.00,  480.00, 1, 0.00,  680.00),
(8,  3, 10, N'Butter Croissant',          N'479100300002',  350.00,  200.00, 1, 0.00,  350.00),

-- ORD-1004 (Subtotal: 4630.00)
(9,  4, 13, N'Roasted Espresso Beans',    N'479100400002', 1450.00, 1050.00, 2, 0.00, 2900.00),
(10, 4, 16, N'Pure Coconut Oil (1L)',     N'479100500002',  980.00,  780.00, 1, 0.00,  980.00),
(11, 4, 14, N'Fresh Orange Juice (1L)',   N'479100400003',  750.00,  540.00, 1, 0.00,  750.00),

-- ORD-1005 (Subtotal: 1600.00 - Refunded)
(12, 5, 4,  N'Sweet Watermelon',          N'479100100004',  650.00,  450.00, 1, 0.00,  650.00),
(13, 5, 17, N'Dark Chocolate Bar (100g)', N'479100600001',  475.00,  340.00, 2, 0.00,  950.00),

-- ORD-1006 (Subtotal: 2790.00)
(14, 6, 7,  N'Farm Brown Eggs (10 Pack)', N'479100200003',  580.00,  460.00, 2, 0.00, 1160.00),
(15, 6, 8,  N'Salted Butter (200g)',      N'479100200004',  890.00,  700.00, 1, 0.00,  890.00),
(16, 6, 9,  N'Artisan Sourdough Bread',   N'479100300001',  420.00,  260.00, 1, 0.00,  420.00),
(17, 6, 3,  N'Organic Avocado',           N'479100100003',  320.00,  210.00, 1, 0.00,  320.00),

-- ORD-1007 (Subtotal: 1490.00)
(18, 7, 5,  N'Ambewela Fresh Milk (1L)',  N'479100200001',  520.00,  410.00, 1, 0.00,  520.00),
(19, 7, 11, N'French Baguette',           N'479100300003',  300.00,  180.00, 1, 0.00,  300.00),
(20, 7, 18, N'Salted Potato Crisps',      N'479100600002',  335.00,  240.00, 2, 0.00,  670.00);
SET IDENTITY_INSERT dbo.OrderItems OFF;

/* ----------------------------------------------------------------------------
   11. ORDER PAYMENTS
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.OrderPayments ON;
INSERT INTO dbo.OrderPayments (Id, OrderId, PaymentMethod, Amount, ReferenceNumber, PaidAt) VALUES
(1, 1, N'Cash',     1965.60, NULL,            DATEADD(HOUR, -26, SYSUTCDATETIME())),
(2, 2, N'Card',     3231.90, N'TXN-CRD-8821', DATEADD(HOUR, -24, SYSUTCDATETIME())),
(3, 3, N'E-Wallet', 1112.40, N'WAL-LANKAQR-9',DATEADD(HOUR, -20, SYSUTCDATETIME())),
(4, 4, N'Cash',     2000.00, NULL,            DATEADD(HOUR, -18, SYSUTCDATETIME())),
(5, 4, N'Card',     2500.36, N'TXN-CRD-8849', DATEADD(HOUR, -18, SYSUTCDATETIME())),
(6, 5, N'Card',     1728.00, N'TXN-CRD-8902', DATEADD(HOUR, -5,  SYSUTCDATETIME())),
(7, 6, N'Cash',     2743.20, NULL,            DATEADD(HOUR, -3,  SYSUTCDATETIME())),
(8, 7, N'Cash',     1609.20, NULL,            DATEADD(HOUR, -1,  SYSUTCDATETIME()));
SET IDENTITY_INSERT dbo.OrderPayments OFF;

/* ----------------------------------------------------------------------------
   12. REFUNDS
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.Refunds ON;
INSERT INTO dbo.Refunds (
    Id, RefundNumber, OrderId, ProcessedByUserId, ApprovedByManagerId, RefundType, RefundAmount, Reason, RestockItems, CreatedAt
) VALUES
(1, N'REF-1001', 5, 3, 2, N'Refund', 1728.00, N'Customer returned unopened items within 1 hour; manager approved full refund.', 1, DATEADD(HOUR, -4, SYSUTCDATETIME()));
SET IDENTITY_INSERT dbo.Refunds OFF;

/* ----------------------------------------------------------------------------
   13. AUDIT LOGS
   ---------------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.AuditLogs ON;
INSERT INTO dbo.AuditLogs (Id, UserId, Username, Action, EntityName, EntityId, Details, CreatedAt) VALUES
(1, 1, N'admin',    N'UPDATE_SETTINGS', N'StoreSettings', N'1',        N'Configured FreshMart Supermarket branch BR-CMB-001 and 8% VAT.', DATEADD(DAY, -2, SYSUTCDATETIME())),
(2, 2, N'manager',  N'STOCK_ALERT',     N'Products',      N'18',       N'Low stock alert triggered for Salted Potato Crisps (5 remaining, reorder level 15).', DATEADD(HOUR, -12, SYSUTCDATETIME())),
(3, 3, N'cashier1', N'OPEN_TILL',       N'TillSessions',  N'2',        N'Opened Till Session #2 with opening float Rs. 10,000.00.', DATEADD(HOUR, -6, SYSUTCDATETIME())),
(4, 3, N'cashier1', N'CREATE_ORDER',    N'Orders',        N'ORD-1005', N'Processed sale ORD-1005 for Rs. 1,728.00 via Card.', DATEADD(HOUR, -5, SYSUTCDATETIME())),
(5, 2, N'manager',  N'APPROVE_REFUND',  N'Refunds',       N'REF-1001', N'Approved refund REF-1001 for Order ORD-1005 (Rs. 1,728.00) and restored stock.', DATEADD(HOUR, -4, SYSUTCDATETIME())),
(6, 3, N'cashier1', N'CREATE_ORDER',    N'Orders',        N'ORD-1006', N'Processed sale ORD-1006 for Rs. 2,743.20 via Cash with promo SAVE250.', DATEADD(HOUR, -3, SYSUTCDATETIME())),
(7, 3, N'cashier1', N'CREATE_ORDER',    N'Orders',        N'ORD-1007', N'Processed sale ORD-1007 for Rs. 1,609.20 via Cash.', DATEADD(HOUR, -1, SYSUTCDATETIME()));
SET IDENTITY_INSERT dbo.AuditLogs OFF;

COMMIT TRANSACTION;
PRINT 'Demo seed data inserted successfully into PosManagementDb.';
GO
