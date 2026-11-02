/* ============================================================================
   POS MANAGEMENT SYSTEM - DATABASE CREATION & SCHEMA SCRIPT (SQL SERVER)
   Database Name : PosManagementDb
   Description   : Creates the database and all normalized tables, constraints,
                   relationships, and indexes required by the POS SRS.
   ============================================================================ */

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'PosManagementDb')
BEGIN
    CREATE DATABASE [PosManagementDb];
END
GO

USE [PosManagementDb];
GO

/* ============================================================================
   DROP EXISTING TABLES (IN REVERSE FOREIGN-KEY ORDER) FOR CLEAN RE-CREATION
   ============================================================================ */
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NOT NULL DROP TABLE dbo.AuditLogs;
IF OBJECT_ID('dbo.Refunds', 'U') IS NOT NULL DROP TABLE dbo.Refunds;
IF OBJECT_ID('dbo.OrderPayments', 'U') IS NOT NULL DROP TABLE dbo.OrderPayments;
IF OBJECT_ID('dbo.OrderItems', 'U') IS NOT NULL DROP TABLE dbo.OrderItems;
IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DROP TABLE dbo.Orders;
IF OBJECT_ID('dbo.TillSessions', 'U') IS NOT NULL DROP TABLE dbo.TillSessions;
IF OBJECT_ID('dbo.Discounts', 'U') IS NOT NULL DROP TABLE dbo.Discounts;
IF OBJECT_ID('dbo.Customers', 'U') IS NOT NULL DROP TABLE dbo.Customers;
IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID('dbo.StoreSettings', 'U') IS NOT NULL DROP TABLE dbo.StoreSettings;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
GO

/* ============================================================================
   1. ROLES TABLE (Cashier, Manager, Administrator)
   ============================================================================ */
CREATE TABLE dbo.Roles (
    Id          INT IDENTITY(1,1) NOT NULL,
    Name        NVARCHAR(50)      NOT NULL,
    Description NVARCHAR(250)     NULL,
    CONSTRAINT PK_Roles PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Roles_Name UNIQUE (Name)
);
GO

/* ============================================================================
   2. USERS TABLE (Role-Based Access Control & Staff Accounts)
   ============================================================================ */
CREATE TABLE dbo.Users (
    Id           INT IDENTITY(1,1) NOT NULL,
    Username     NVARCHAR(50)      NOT NULL,
    FullName     NVARCHAR(100)     NOT NULL,
    Email        NVARCHAR(150)     NOT NULL,
    PasswordHash NVARCHAR(256)     NOT NULL,
    RoleId       INT               NOT NULL,
    IsActive     BIT               NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
    LastLoginAt  DATETIME2         NULL,
    CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Users_Username UNIQUE (Username),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles (Id)
);
GO

/* ============================================================================
   3. STORE SETTINGS TABLE (Branch, Tax, Currency, Loyalty & Peripherals)
   ============================================================================ */
CREATE TABLE dbo.StoreSettings (
    Id                        INT IDENTITY(1,1) NOT NULL,
    StoreName                 NVARCHAR(150)     NOT NULL,
    BranchCode                NVARCHAR(50)      NOT NULL,
    StoreAddress              NVARCHAR(300)     NOT NULL,
    Phone                     NVARCHAR(50)      NULL,
    Email                     NVARCHAR(150)     NULL,
    Currency                  NVARCHAR(10)      NOT NULL CONSTRAINT DF_StoreSettings_Currency DEFAULT ('LKR'),
    DefaultTaxRate            DECIMAL(5,2)      NOT NULL CONSTRAINT DF_StoreSettings_TaxRate DEFAULT (8.00),
    LowStockThreshold         INT               NOT NULL CONSTRAINT DF_StoreSettings_LowStock DEFAULT (20),
    LoyaltyPointsPerHundredRs INT               NOT NULL CONSTRAINT DF_StoreSettings_LoyaltyRate DEFAULT (1),
    ReceiptFooterText         NVARCHAR(300)     NOT NULL CONSTRAINT DF_StoreSettings_Footer DEFAULT ('Thank you for shopping with us!'),
    ReceiptPrinterName        NVARCHAR(100)     NOT NULL CONSTRAINT DF_StoreSettings_Printer DEFAULT ('EPSON TM-T88VI'),
    ReceiptPrinterConnected   BIT               NOT NULL CONSTRAINT DF_StoreSettings_PrinterConn DEFAULT (1),
    BarcodeScannerName        NVARCHAR(100)     NOT NULL CONSTRAINT DF_StoreSettings_Scanner DEFAULT ('Symbol LS2208'),
    BarcodeScannerConnected   BIT               NOT NULL CONSTRAINT DF_StoreSettings_ScannerConn DEFAULT (1),
    PaymentTerminalName       NVARCHAR(100)     NOT NULL CONSTRAINT DF_StoreSettings_Terminal DEFAULT ('Verifone VX520'),
    PaymentTerminalConnected  BIT               NOT NULL CONSTRAINT DF_StoreSettings_TerminalConn DEFAULT (0),
    UpdatedAt                 DATETIME2         NOT NULL CONSTRAINT DF_StoreSettings_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_StoreSettings PRIMARY KEY CLUSTERED (Id)
);
GO

/* ============================================================================
   4. CATEGORIES TABLE (Product Categorization)
   ============================================================================ */
CREATE TABLE dbo.Categories (
    Id           INT IDENTITY(1,1) NOT NULL,
    Name         NVARCHAR(100)     NOT NULL,
    Description  NVARCHAR(250)     NULL,
    DisplayOrder INT               NOT NULL CONSTRAINT DF_Categories_DisplayOrder DEFAULT (0),
    IsActive     BIT               NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT (1),
    CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Categories_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Categories PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Categories_Name UNIQUE (Name)
);
GO

/* ============================================================================
   5. PRODUCTS TABLE (Inventory, Pricing, Barcodes & Low-Stock Alerts)
   ============================================================================ */
CREATE TABLE dbo.Products (
    Id           INT IDENTITY(1,1) NOT NULL,
    Sku          NVARCHAR(50)      NOT NULL,
    Barcode      NVARCHAR(100)     NOT NULL,
    Name         NVARCHAR(150)     NOT NULL,
    CategoryId   INT               NOT NULL,
    Price        DECIMAL(18,2)     NOT NULL,
    CostPrice    DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Products_CostPrice DEFAULT (0.00),
    Stock        INT               NOT NULL CONSTRAINT DF_Products_Stock DEFAULT (0),
    ReorderLevel INT               NOT NULL CONSTRAINT DF_Products_ReorderLevel DEFAULT (20),
    Icon         NVARCHAR(20)      NOT NULL CONSTRAINT DF_Products_Icon DEFAULT (N'📦'),
    Color        NVARCHAR(100)     NOT NULL CONSTRAINT DF_Products_Color DEFAULT ('bg-indigo-100 text-indigo-600'),
    IsActive     BIT               NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT (1),
    CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Products_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Products PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Products_Sku UNIQUE (Sku),
    CONSTRAINT UQ_Products_Barcode UNIQUE (Barcode),
    CONSTRAINT CK_Products_Price CHECK (Price >= 0),
    CONSTRAINT CK_Products_CostPrice CHECK (CostPrice >= 0),
    CONSTRAINT CK_Products_Stock CHECK (Stock >= 0),
    CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories (Id)
);
GO

CREATE NONCLUSTERED INDEX IX_Products_CategoryId ON dbo.Products (CategoryId);
CREATE NONCLUSTERED INDEX IX_Products_Name ON dbo.Products (Name);
GO

/* ============================================================================
   6. CUSTOMERS TABLE (Customer Profiles & Loyalty Program)
   ============================================================================ */
CREATE TABLE dbo.Customers (
    Id           INT IDENTITY(1,1) NOT NULL,
    CustomerCode NVARCHAR(30)      NOT NULL,
    Name         NVARCHAR(150)     NOT NULL,
    Email        NVARCHAR(150)     NOT NULL,
    Phone        NVARCHAR(50)      NOT NULL,
    Points       INT               NOT NULL CONSTRAINT DF_Customers_Points DEFAULT (0),
    Tier         NVARCHAR(30)      NOT NULL CONSTRAINT DF_Customers_Tier DEFAULT ('Bronze'),
    Balance      DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Customers_Balance DEFAULT (0.00),
    LastVisit    DATETIME2         NOT NULL CONSTRAINT DF_Customers_LastVisit DEFAULT (SYSUTCDATETIME()),
    IsActive     BIT               NOT NULL CONSTRAINT DF_Customers_IsActive DEFAULT (1),
    CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Customers PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Customers_CustomerCode UNIQUE (CustomerCode),
    CONSTRAINT CK_Customers_Tier CHECK (Tier IN ('Bronze', 'Silver', 'Gold', 'Platinum'))
);
GO

CREATE NONCLUSTERED INDEX IX_Customers_Phone ON dbo.Customers (Phone);
CREATE NONCLUSTERED INDEX IX_Customers_Email ON dbo.Customers (Email);
GO

/* ============================================================================
   7. DISCOUNTS TABLE (Promotional Pricing & Coupon Rules)
   ============================================================================ */
CREATE TABLE dbo.Discounts (
    Id             INT IDENTITY(1,1) NOT NULL,
    Code           NVARCHAR(50)      NOT NULL,
    Name           NVARCHAR(150)     NOT NULL,
    DiscountType   NVARCHAR(20)      NOT NULL, -- 'Percentage' or 'Fixed'
    Value          DECIMAL(18,2)     NOT NULL,
    MinOrderAmount DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Discounts_MinOrder DEFAULT (0.00),
    IsActive       BIT               NOT NULL CONSTRAINT DF_Discounts_IsActive DEFAULT (1),
    ValidFrom      DATETIME2         NOT NULL CONSTRAINT DF_Discounts_ValidFrom DEFAULT (SYSUTCDATETIME()),
    ValidUntil     DATETIME2         NULL,
    CreatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Discounts_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Discounts PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Discounts_Code UNIQUE (Code),
    CONSTRAINT CK_Discounts_Type CHECK (DiscountType IN ('Percentage', 'Fixed')),
    CONSTRAINT CK_Discounts_Value CHECK (Value >= 0)
);
GO

/* ============================================================================
   8. TILL SESSIONS TABLE (Shift Opening & Cash-Drawer Reconciliation)
   ============================================================================ */
CREATE TABLE dbo.TillSessions (
    Id                 INT IDENTITY(1,1) NOT NULL,
    UserId             INT               NOT NULL,
    OpenedAt           DATETIME2         NOT NULL CONSTRAINT DF_TillSessions_OpenedAt DEFAULT (SYSUTCDATETIME()),
    ClosedAt           DATETIME2         NULL,
    OpeningFloat       DECIMAL(18,2)     NOT NULL CONSTRAINT DF_TillSessions_OpeningFloat DEFAULT (0.00),
    ClosingCashCounted DECIMAL(18,2)     NULL,
    ExpectedCash       DECIMAL(18,2)     NULL,
    Variance           DECIMAL(18,2)     NULL,
    Status             NVARCHAR(20)      NOT NULL CONSTRAINT DF_TillSessions_Status DEFAULT ('Open'),
    Notes              NVARCHAR(500)     NULL,
    CONSTRAINT PK_TillSessions PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT CK_TillSessions_Status CHECK (Status IN ('Open', 'Closed')),
    CONSTRAINT FK_TillSessions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
);
GO

/* ============================================================================
   9. ORDERS TABLE (Sales Transactions & Receipt Headers)
   ============================================================================ */
CREATE TABLE dbo.Orders (
    Id                   INT IDENTITY(1,1) NOT NULL,
    OrderNumber          NVARCHAR(40)      NOT NULL,
    OrderDate            DATETIME2         NOT NULL CONSTRAINT DF_Orders_OrderDate DEFAULT (SYSUTCDATETIME()),
    CustomerId           INT               NULL,
    CustomerName         NVARCHAR(150)     NOT NULL CONSTRAINT DF_Orders_CustomerName DEFAULT ('Walk-in'),
    CashierUserId        INT               NULL,
    TillSessionId        INT               NULL,
    DiscountId           INT               NULL,
    Subtotal             DECIMAL(18,2)     NOT NULL,
    DiscountAmount       DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Orders_DiscountAmount DEFAULT (0.00),
    TaxRate              DECIMAL(5,2)      NOT NULL CONSTRAINT DF_Orders_TaxRate DEFAULT (8.00),
    TaxAmount            DECIMAL(18,2)     NOT NULL,
    TotalAmount          DECIMAL(18,2)     NOT NULL,
    PaymentMethodSummary NVARCHAR(100)     NOT NULL,
    CashTendered         DECIMAL(18,2)     NULL,
    ChangeGiven          DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Orders_ChangeGiven DEFAULT (0.00),
    PointsEarned         INT               NOT NULL CONSTRAINT DF_Orders_PointsEarned DEFAULT (0),
    PointsRedeemed       INT               NOT NULL CONSTRAINT DF_Orders_PointsRedeemed DEFAULT (0),
    Status               NVARCHAR(30)      NOT NULL CONSTRAINT DF_Orders_Status DEFAULT ('Completed'),
    CreatedAt            DATETIME2         NOT NULL CONSTRAINT DF_Orders_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Orders_OrderNumber UNIQUE (OrderNumber),
    CONSTRAINT CK_Orders_Status CHECK (Status IN ('Completed', 'Refunded', 'Exchanged', 'Cancelled')),
    CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers (Id),
    CONSTRAINT FK_Orders_Users FOREIGN KEY (CashierUserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_Orders_TillSessions FOREIGN KEY (TillSessionId) REFERENCES dbo.TillSessions (Id),
    CONSTRAINT FK_Orders_Discounts FOREIGN KEY (DiscountId) REFERENCES dbo.Discounts (Id)
);
GO

CREATE NONCLUSTERED INDEX IX_Orders_OrderDate ON dbo.Orders (OrderDate DESC);
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId ON dbo.Orders (CustomerId);
GO

/* ============================================================================
   10. ORDER ITEMS TABLE (Line Items Linked to Each Sale)
   ============================================================================ */
CREATE TABLE dbo.OrderItems (
    Id             INT IDENTITY(1,1) NOT NULL,
    OrderId        INT               NOT NULL,
    ProductId      INT               NOT NULL,
    ProductName    NVARCHAR(150)     NOT NULL,
    Barcode        NVARCHAR(100)     NULL,
    UnitPrice      DECIMAL(18,2)     NOT NULL,
    CostPrice      DECIMAL(18,2)     NOT NULL CONSTRAINT DF_OrderItems_CostPrice DEFAULT (0.00),
    Quantity       INT               NOT NULL,
    DiscountAmount DECIMAL(18,2)     NOT NULL CONSTRAINT DF_OrderItems_Discount DEFAULT (0.00),
    LineTotal      DECIMAL(18,2)     NOT NULL,
    CONSTRAINT PK_OrderItems PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT CK_OrderItems_Quantity CHECK (Quantity > 0),
    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (Id) ON DELETE CASCADE,
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products (Id)
);
GO

CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId ON dbo.OrderItems (OrderId);
CREATE NONCLUSTERED INDEX IX_OrderItems_ProductId ON dbo.OrderItems (ProductId);
GO

/* ============================================================================
   11. ORDER PAYMENTS TABLE (Supports Single & Split/Combined Payments)
   ============================================================================ */
CREATE TABLE dbo.OrderPayments (
    Id              INT IDENTITY(1,1) NOT NULL,
    OrderId         INT               NOT NULL,
    PaymentMethod   NVARCHAR(50)      NOT NULL, -- 'Cash', 'Card', 'E-Wallet'
    Amount          DECIMAL(18,2)     NOT NULL,
    ReferenceNumber NVARCHAR(100)     NULL,
    PaidAt          DATETIME2         NOT NULL CONSTRAINT DF_OrderPayments_PaidAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_OrderPayments PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT CK_OrderPayments_Amount CHECK (Amount > 0),
    CONSTRAINT FK_OrderPayments_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (Id) ON DELETE CASCADE
);
GO

CREATE NONCLUSTERED INDEX IX_OrderPayments_OrderId ON dbo.OrderPayments (OrderId);
GO

/* ============================================================================
   12. REFUNDS TABLE (Manager-Approved Refunds & Exchanges)
   ============================================================================ */
CREATE TABLE dbo.Refunds (
    Id                  INT IDENTITY(1,1) NOT NULL,
    RefundNumber        NVARCHAR(40)      NOT NULL,
    OrderId             INT               NOT NULL,
    ProcessedByUserId   INT               NULL,
    ApprovedByManagerId INT               NULL,
    RefundType          NVARCHAR(20)      NOT NULL CONSTRAINT DF_Refunds_Type DEFAULT ('Refund'),
    RefundAmount        DECIMAL(18,2)     NOT NULL,
    Reason              NVARCHAR(300)     NOT NULL,
    RestockItems        BIT               NOT NULL CONSTRAINT DF_Refunds_Restock DEFAULT (1),
    CreatedAt           DATETIME2         NOT NULL CONSTRAINT DF_Refunds_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Refunds PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Refunds_RefundNumber UNIQUE (RefundNumber),
    CONSTRAINT CK_Refunds_Type CHECK (RefundType IN ('Refund', 'Exchange')),
    CONSTRAINT FK_Refunds_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (Id),
    CONSTRAINT FK_Refunds_ProcessedBy FOREIGN KEY (ProcessedByUserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_Refunds_ApprovedBy FOREIGN KEY (ApprovedByManagerId) REFERENCES dbo.Users (Id)
);
GO

/* ============================================================================
   13. AUDIT LOGS TABLE (Accountability for Sales, Refunds & Stock Adjustments)
   ============================================================================ */
CREATE TABLE dbo.AuditLogs (
    Id         INT IDENTITY(1,1) NOT NULL,
    UserId     INT               NULL,
    Username   NVARCHAR(100)     NOT NULL CONSTRAINT DF_AuditLogs_Username DEFAULT ('System'),
    Action     NVARCHAR(100)     NOT NULL,
    EntityName NVARCHAR(100)     NOT NULL,
    EntityId   NVARCHAR(100)     NULL,
    Details    NVARCHAR(1000)    NULL,
    CreatedAt  DATETIME2         NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_AuditLogs PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
);
GO

CREATE NONCLUSTERED INDEX IX_AuditLogs_CreatedAt ON dbo.AuditLogs (CreatedAt DESC);
GO

PRINT 'PosManagementDb schema created successfully.';
GO

