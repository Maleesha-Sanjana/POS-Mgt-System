using System.Threading;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using PosSystem.Api.Config;
using PosSystem.Api.Data;
using PosSystem.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Load the dedicated Database Configuration file (backend/dbconfig.json & Config/DatabaseConfig.cs)
var dbConfig = DatabaseConfig.LoadAndRegister(builder);

// 2. Register API & CORS services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// Synchronization primitives for automatic database & table creation
var schemaLock = new SemaphoreSlim(1, 1);

// Helper to compute customer loyalty tier from points
static string CalculateLoyaltyTier(int points) => points switch
{
    >= 1000 => "Platinum",
    >= 400  => "Gold",
    >= 150  => "Silver",
    _       => "Bronze"
};

// Helper to map Order entity to OrderDto
static OrderDto MapOrderToDto(Order o) => new(
    Id: o.OrderNumber,
    DbId: o.Id,
    Date: o.OrderDate,
    Customer: o.CustomerName,
    CustomerId: o.CustomerId,
    Subtotal: o.Subtotal,
    DiscountAmount: o.DiscountAmount,
    Tax: o.TaxAmount,
    Total: o.TotalAmount,
    Method: o.PaymentMethodSummary,
    Status: o.Status,
    Items: o.OrderItems.Sum(i => i.Quantity),
    CashTendered: o.CashTendered,
    Change: o.ChangeGiven,
    PointsEarned: o.PointsEarned,
    CartItems: o.OrderItems.Select(i => new OrderItemDto(
        i.Id,
        i.ProductId,
        i.ProductName,
        i.UnitPrice,
        i.Quantity,
        i.LineTotal
    )).ToList(),
    Payments: o.OrderPayments.Select(p => new OrderPaymentDto(
        p.PaymentMethod,
        p.Amount,
        p.ReferenceNumber
    )).ToList()
);

// Automatically ensures the destination database and all 14 required tables exist in SQL Server
async Task EnsureDatabaseAndTablesAsync(PosDbContext db, DatabaseConfig config)
{
    await schemaLock.WaitAsync();
    try
    {
        // Step 1: Attempt to auto-create the destination database via master if it does not exist yet
        try
        {
            var csb = new SqlConnectionStringBuilder(config.ConnectionString);
            var targetDb = csb.InitialCatalog;
            if (!string.IsNullOrWhiteSpace(targetDb))
            {
                csb.InitialCatalog = "master";
                await using var masterConn = new SqlConnection(csb.ConnectionString);
                await masterConn.OpenAsync();
                await using var cmd = masterConn.CreateCommand();
                cmd.CommandText = @"
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = @dbName)
BEGIN
    DECLARE @sql NVARCHAR(MAX) = N'CREATE DATABASE [' + REPLACE(@dbName, N']', N']]') + N']';
    EXEC(@sql);
END";
                cmd.Parameters.AddWithValue("@dbName", targetDb);
                await cmd.ExecuteNonQueryAsync();
            }
        }
        catch
        {
            // Ignore if the SQL login does not have permission on 'master' because the target DB already exists
        }

        // Step 2: Check and auto-create any missing tables in dependency order + essential seed rows
        const string ensureAllTablesSql = @"
-- 1. dbo.Roles
IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        Id          INT IDENTITY(1,1) NOT NULL,
        Name        NVARCHAR(50)      NOT NULL,
        Description NVARCHAR(250)     NULL,
        CreatedAt   DATETIME2         NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Roles PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Roles_Name UNIQUE (Name)
    );
END;

-- 2. dbo.Users
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id           INT IDENTITY(1,1) NOT NULL,
        Username     NVARCHAR(50)      NOT NULL,
        FullName     NVARCHAR(100)     NOT NULL,
        Email        NVARCHAR(150)     NOT NULL,
        PasswordHash NVARCHAR(256)     NOT NULL,
        RoleId       INT               NOT NULL,
        IsActive     BIT               NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
        LastLoginAt  DATETIME2         NULL,
        CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Users_Username UNIQUE (Username),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles (Id)
    );
END;

-- 3. dbo.StoreSettings
IF OBJECT_ID('dbo.StoreSettings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StoreSettings (
        Id                        INT IDENTITY(1,1) NOT NULL,
        StoreName                 NVARCHAR(150)     NOT NULL,
        BranchCode                NVARCHAR(50)      NOT NULL,
        StoreAddress              NVARCHAR(300)     NOT NULL,
        Phone                     NVARCHAR(50)      NOT NULL,
        Email                     NVARCHAR(150)     NOT NULL,
        Currency                  NVARCHAR(20)      NOT NULL CONSTRAINT DF_StoreSettings_Currency DEFAULT ('LKR (Rs.)'),
        DefaultTaxRate            DECIMAL(5,2)      NOT NULL CONSTRAINT DF_StoreSettings_TaxRate DEFAULT (8.00),
        LowStockThreshold         INT               NOT NULL CONSTRAINT DF_StoreSettings_LowStock DEFAULT (15),
        LoyaltyPointsPerHundredRs INT               NOT NULL CONSTRAINT DF_StoreSettings_Loyalty DEFAULT (1),
        ReceiptFooterText         NVARCHAR(300)     NULL,
        ReceiptPrinterName        NVARCHAR(100)     NULL,
        ReceiptPrinterConnected   BIT               NOT NULL CONSTRAINT DF_StoreSettings_Printer DEFAULT (1),
        BarcodeScannerName        NVARCHAR(100)     NULL,
        BarcodeScannerConnected   BIT               NOT NULL CONSTRAINT DF_StoreSettings_Scanner DEFAULT (1),
        PaymentTerminalName       NVARCHAR(100)     NULL,
        PaymentTerminalConnected  BIT               NOT NULL CONSTRAINT DF_StoreSettings_Terminal DEFAULT (1),
        UpdatedAt                 DATETIME2         NOT NULL CONSTRAINT DF_StoreSettings_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_StoreSettings PRIMARY KEY CLUSTERED (Id)
    );
END;

-- 4. dbo.Categories
IF OBJECT_ID('dbo.Categories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories (
        Id           INT IDENTITY(1,1) NOT NULL,
        Name         NVARCHAR(100)     NOT NULL,
        Description  NVARCHAR(250)     NULL,
        DisplayOrder INT               NOT NULL CONSTRAINT DF_Categories_Order DEFAULT (0),
        IsActive     BIT               NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT (1),
        CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Categories_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Categories PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Categories_Name UNIQUE (Name)
    );
END;

-- 5. dbo.Products
IF OBJECT_ID('dbo.Products', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Products (
        Id           INT IDENTITY(1,1) NOT NULL,
        Sku          NVARCHAR(50)      NOT NULL,
        Barcode      NVARCHAR(50)      NOT NULL,
        Name         NVARCHAR(150)     NOT NULL,
        CategoryId   INT               NOT NULL,
        Price        DECIMAL(18,2)     NOT NULL,
        CostPrice    DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Products_CostPrice DEFAULT (0.00),
        Stock        INT               NOT NULL CONSTRAINT DF_Products_Stock DEFAULT (0),
        ReorderLevel INT               NOT NULL CONSTRAINT DF_Products_Reorder DEFAULT (15),
        Icon         NVARCHAR(30)      NOT NULL CONSTRAINT DF_Products_Icon DEFAULT (N'📦'),
        Color        NVARCHAR(100)     NOT NULL CONSTRAINT DF_Products_Color DEFAULT ('bg-indigo-100 text-indigo-600'),
        IsActive     BIT               NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT (1),
        CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Products_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Products PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Products_Sku UNIQUE (Sku),
        CONSTRAINT UQ_Products_Barcode UNIQUE (Barcode),
        CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories (Id)
    );
    CREATE NONCLUSTERED INDEX IX_Products_CategoryId ON dbo.Products (CategoryId);
    CREATE NONCLUSTERED INDEX IX_Products_Name ON dbo.Products (Name);
END;

-- 6. dbo.Customers
IF OBJECT_ID('dbo.Customers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers (
        Id           INT IDENTITY(1,1) NOT NULL,
        CustomerCode NVARCHAR(30)      NOT NULL,
        Name         NVARCHAR(120)     NOT NULL,
        Email        NVARCHAR(150)     NOT NULL,
        Phone        NVARCHAR(40)      NOT NULL,
        Points       INT               NOT NULL CONSTRAINT DF_Customers_Points DEFAULT (0),
        Tier         NVARCHAR(30)      NOT NULL CONSTRAINT DF_Customers_Tier DEFAULT ('Bronze'),
        Balance      DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Customers_Balance DEFAULT (0.00),
        LastVisit    DATETIME2         NULL,
        IsActive     BIT               NOT NULL CONSTRAINT DF_Customers_IsActive DEFAULT (1),
        CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Customers PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Customers_Code UNIQUE (CustomerCode)
    );
    CREATE NONCLUSTERED INDEX IX_Customers_Phone ON dbo.Customers (Phone);
END;

-- 7. dbo.Discounts
IF OBJECT_ID('dbo.Discounts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Discounts (
        Id             INT IDENTITY(1,1) NOT NULL,
        Code           NVARCHAR(40)      NOT NULL,
        Name           NVARCHAR(120)     NOT NULL,
        DiscountType   NVARCHAR(30)      NOT NULL,
        Value          DECIMAL(18,2)     NOT NULL,
        MinOrderAmount DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Discounts_MinOrder DEFAULT (0.00),
        IsActive       BIT               NOT NULL CONSTRAINT DF_Discounts_IsActive DEFAULT (1),
        StartDate      DATETIME2         NULL,
        EndDate        DATETIME2         NULL,
        CONSTRAINT PK_Discounts PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Discounts_Code UNIQUE (Code)
    );
END;

-- 8. dbo.TillSessions
IF OBJECT_ID('dbo.TillSessions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TillSessions (
        Id           INT IDENTITY(1,1) NOT NULL,
        UserId       INT               NOT NULL,
        OpenedAt     DATETIME2         NOT NULL CONSTRAINT DF_TillSessions_OpenedAt DEFAULT (SYSUTCDATETIME()),
        ClosedAt     DATETIME2         NULL,
        OpeningFloat DECIMAL(18,2)     NOT NULL CONSTRAINT DF_TillSessions_OpeningFloat DEFAULT (0.00),
        ClosingCash  DECIMAL(18,2)     NULL,
        ExpectedCash DECIMAL(18,2)     NULL,
        Variance     DECIMAL(18,2)     NULL,
        Status       NVARCHAR(20)      NOT NULL CONSTRAINT DF_TillSessions_Status DEFAULT ('Open'),
        Notes        NVARCHAR(250)     NULL,
        CONSTRAINT PK_TillSessions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_TillSessions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
    );
END;

-- 9. dbo.Orders
IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        Id                   INT IDENTITY(1,1) NOT NULL,
        OrderNumber          NVARCHAR(40)      NOT NULL,
        OrderDate            DATETIME2         NOT NULL CONSTRAINT DF_Orders_OrderDate DEFAULT (SYSUTCDATETIME()),
        CustomerId           INT               NULL,
        CustomerName         NVARCHAR(120)     NOT NULL CONSTRAINT DF_Orders_CustomerName DEFAULT ('Walk-in'),
        CashierUserId        INT               NOT NULL,
        TillSessionId        INT               NULL,
        DiscountId           INT               NULL,
        Subtotal             DECIMAL(18,2)     NOT NULL,
        DiscountAmount       DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Orders_Discount DEFAULT (0.00),
        TaxRate              DECIMAL(5,2)      NOT NULL CONSTRAINT DF_Orders_TaxRate DEFAULT (8.00),
        TaxAmount            DECIMAL(18,2)     NOT NULL,
        TotalAmount          DECIMAL(18,2)     NOT NULL,
        PaymentMethodSummary NVARCHAR(100)     NOT NULL,
        CashTendered         DECIMAL(18,2)     NULL,
        ChangeGiven          DECIMAL(18,2)     NULL,
        PointsEarned         INT               NOT NULL CONSTRAINT DF_Orders_PointsEarned DEFAULT (0),
        PointsRedeemed       INT               NOT NULL CONSTRAINT DF_Orders_PointsRedeemed DEFAULT (0),
        Status               NVARCHAR(30)      NOT NULL CONSTRAINT DF_Orders_Status DEFAULT ('Completed'),
        Notes                NVARCHAR(250)     NULL,
        CreatedAt            DATETIME2         NOT NULL CONSTRAINT DF_Orders_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Orders_OrderNumber UNIQUE (OrderNumber),
        CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers (Id),
        CONSTRAINT FK_Orders_Users FOREIGN KEY (CashierUserId) REFERENCES dbo.Users (Id),
        CONSTRAINT FK_Orders_TillSessions FOREIGN KEY (TillSessionId) REFERENCES dbo.TillSessions (Id),
        CONSTRAINT FK_Orders_Discounts FOREIGN KEY (DiscountId) REFERENCES dbo.Discounts (Id)
    );
    CREATE NONCLUSTERED INDEX IX_Orders_OrderDate ON dbo.Orders (OrderDate DESC);
    CREATE NONCLUSTERED INDEX IX_Orders_Status ON dbo.Orders (Status);
END;

-- 10. dbo.OrderItems
IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems (
        Id             INT IDENTITY(1,1) NOT NULL,
        OrderId        INT               NOT NULL,
        ProductId      INT               NOT NULL,
        ProductName    NVARCHAR(150)     NOT NULL,
        Barcode        NVARCHAR(50)      NULL,
        UnitPrice      DECIMAL(18,2)     NOT NULL,
        CostPrice      DECIMAL(18,2)     NOT NULL CONSTRAINT DF_OrderItems_Cost DEFAULT (0.00),
        Quantity       INT               NOT NULL,
        DiscountAmount DECIMAL(18,2)     NOT NULL CONSTRAINT DF_OrderItems_Discount DEFAULT (0.00),
        LineTotal      DECIMAL(18,2)     NOT NULL,
        CONSTRAINT PK_OrderItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (Id) ON DELETE CASCADE,
        CONSTRAINT FK_OrderItems_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products (Id)
    );
    CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId ON dbo.OrderItems (OrderId);
END;

-- 11. dbo.OrderPayments
IF OBJECT_ID('dbo.OrderPayments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderPayments (
        Id              INT IDENTITY(1,1) NOT NULL,
        OrderId         INT               NOT NULL,
        PaymentMethod   NVARCHAR(50)      NOT NULL,
        Amount          DECIMAL(18,2)     NOT NULL,
        ReferenceNumber NVARCHAR(100)     NULL,
        PaidAt          DATETIME2         NOT NULL CONSTRAINT DF_OrderPayments_PaidAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OrderPayments PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_OrderPayments_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (Id) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_OrderPayments_OrderId ON dbo.OrderPayments (OrderId);
END;

-- 12. dbo.Refunds
IF OBJECT_ID('dbo.Refunds', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Refunds (
        Id                  INT IDENTITY(1,1) NOT NULL,
        RefundNumber        NVARCHAR(40)      NOT NULL,
        OrderId             INT               NOT NULL,
        ProcessedByUserId   INT               NOT NULL,
        ApprovedByManagerId INT               NULL,
        RefundType          NVARCHAR(30)      NOT NULL CONSTRAINT DF_Refunds_Type DEFAULT ('Refund'),
        RefundAmount        DECIMAL(18,2)     NOT NULL,
        Reason              NVARCHAR(300)     NOT NULL,
        RestockItems        BIT               NOT NULL CONSTRAINT DF_Refunds_Restock DEFAULT (1),
        CreatedAt           DATETIME2         NOT NULL CONSTRAINT DF_Refunds_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Refunds PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Refunds_RefundNumber UNIQUE (RefundNumber),
        CONSTRAINT FK_Refunds_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (Id),
        CONSTRAINT FK_Refunds_ProcessedBy FOREIGN KEY (ProcessedByUserId) REFERENCES dbo.Users (Id),
        CONSTRAINT FK_Refunds_ApprovedBy FOREIGN KEY (ApprovedByManagerId) REFERENCES dbo.Users (Id)
    );
END;

-- 13. dbo.AuditLogs
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs (
        Id         INT IDENTITY(1,1) NOT NULL,
        UserId     INT               NULL,
        Username   NVARCHAR(100)     NOT NULL,
        Action     NVARCHAR(100)     NOT NULL,
        EntityName NVARCHAR(100)     NOT NULL,
        EntityId   NVARCHAR(50)      NULL,
        Details    NVARCHAR(1000)    NULL,
        CreatedAt  DATETIME2         NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_AuditLogs PRIMARY KEY CLUSTERED (Id)
    );
END;

-- 14. dbo.StockAdjustmentNotes
IF OBJECT_ID('dbo.StockAdjustmentNotes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockAdjustmentNotes (
        Id                INT IDENTITY(1,1) NOT NULL,
        NoteNumber        NVARCHAR(40)      NOT NULL,
        NoteType          NVARCHAR(60)      NOT NULL,
        ProductId         INT               NOT NULL,
        ProductName       NVARCHAR(150)     NOT NULL,
        Sku               NVARCHAR(50)      NOT NULL,
        PreviousStock     INT               NOT NULL,
        QuantityChange    INT               NOT NULL,
        NewStock          INT               NOT NULL,
        BatchReference    NVARCHAR(100)     NULL,
        Remarks           NVARCHAR(500)     NULL,
        CreatedByUserId   INT               NULL,
        CreatedByUsername NVARCHAR(100)     NOT NULL CONSTRAINT DF_StockAdj_User DEFAULT ('admin'),
        CreatedAt         DATETIME2         NOT NULL CONSTRAINT DF_StockAdj_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_StockAdjustmentNotes PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_StockAdjustmentNotes_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products (Id) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_StockAdjustmentNotes_CreatedAt ON dbo.StockAdjustmentNotes (CreatedAt DESC);
END;

-- Seed essential baseline Roles, Users & StoreSettings if destination tables were just created and are empty
IF NOT EXISTS (SELECT 1 FROM dbo.Roles)
BEGIN
    INSERT INTO dbo.Roles (Name, Description) VALUES
    (N'Administrator', N'Full system configuration, user management, GRN/Stock Adjustment Notes, and database settings'),
    (N'Store Manager', N'Inventory master, discounts, customer loyalty, refunds, and financial reports'),
    (N'Cashier',       N'POS terminal sales, barcode scanning, split payments, and receipt printing');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Users)
BEGIN
    DECLARE @AdminRoleId INT   = (SELECT TOP 1 Id FROM dbo.Roles WHERE Name = N'Administrator');
    DECLARE @ManagerRoleId INT = (SELECT TOP 1 Id FROM dbo.Roles WHERE Name = N'Store Manager');
    DECLARE @CashierRoleId INT = (SELECT TOP 1 Id FROM dbo.Roles WHERE Name = N'Cashier');

    INSERT INTO dbo.Users (Username, FullName, Email, PasswordHash, RoleId, IsActive) VALUES
    (N'admin',    N'Nalin Perera (System Admin)',    N'admin@freshmartpos.lk',   N'SHA256:Demo@123', ISNULL(@AdminRoleId, 1),   1),
    (N'manager',  N'Kavindi Silva (Store Manager)',  N'manager@freshmartpos.lk', N'SHA256:Demo@123', ISNULL(@ManagerRoleId, 2), 1),
    (N'cashier1', N'Ruwan Jayawardena (Cashier 01)', N'ruwan@freshmartpos.lk',   N'SHA256:Demo@123', ISNULL(@CashierRoleId, 3), 1);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.StoreSettings)
BEGIN
    INSERT INTO dbo.StoreSettings (
        StoreName, BranchCode, StoreAddress, Phone, Email, Currency,
        DefaultTaxRate, LowStockThreshold, LoyaltyPointsPerHundredRs,
        ReceiptFooterText, ReceiptPrinterName, ReceiptPrinterConnected,
        BarcodeScannerName, BarcodeScannerConnected, PaymentTerminalName, PaymentTerminalConnected
    ) VALUES (
        N'FreshMart Supermarket', N'CMB-01', N'No. 142, Galle Road, Colombo 03, Sri Lanka',
        N'+94 11 234 5678', N'support@freshmartpos.lk', N'LKR (Rs.)',
        8.00, 15, 1,
        N'Thank you for shopping at FreshMart! Goods once sold can be exchanged within 7 days with original receipt.',
        N'Epson TM-T82III Thermal 80mm', 1,
        N'Zebra DS2208 2D USB', 1,
        N'Verifone VX520 NFC/EMV', 1
    );
END;
";

        await db.Database.ExecuteSqlRawAsync(ensureAllTablesSql);
    }
    finally
    {
        schemaLock.Release();
    }
}

// Run automatic database & table verification at application startup
using (var startupScope = app.Services.CreateScope())
{
    try
    {
        var startupDb = startupScope.ServiceProvider.GetRequiredService<PosDbContext>();
        await EnsureDatabaseAndTablesAsync(startupDb, dbConfig);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Database Auto-Provisioning Warning]: {ex.Message}");
    }
}

/* ============================================================================
   HEALTH & DATABASE CONFIGURATION ENDPOINT
   ============================================================================ */
app.MapGet("/api/health/db", async (PosDbContext db, DatabaseConfig config) =>
{
    try
    {
        await EnsureDatabaseAndTablesAsync(db, config);
        var canConnect = await db.Database.CanConnectAsync();
        if (!canConnect)
        {
            return Results.Problem(
                detail: "Cannot connect to SQL Server. Please check backend/dbconfig.json.",
                statusCode: 503);
        }

        return Results.Ok(new
        {
            status = "Connected",
            provider = "SqlServer",
            database = db.Database.GetDbConnection().Database,
            server = db.Database.GetDbConnection().DataSource,
            productCount = await db.Products.CountAsync(p => p.IsActive),
            customerCount = await db.Customers.CountAsync(c => c.IsActive),
            orderCount = await db.Orders.CountAsync(),
            stockAdjustmentCount = await db.StockAdjustmentNotes.CountAsync()
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            detail: $"Database connection error: {ex.Message}. Verify backend/dbconfig.json.",
            statusCode: 500);
    }
});

/* ============================================================================
   BOOTSTRAP ENDPOINT (Loads all live tables in one call for the POS UI)
   ============================================================================ */
app.MapGet("/api/bootstrap", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);

    var categories = await db.Categories
        .Where(c => c.IsActive)
        .OrderBy(c => c.DisplayOrder)
        .ThenBy(c => c.Name)
        .Select(c => new CategoryDto(c.Id, c.Name, c.Description, c.DisplayOrder))
        .ToListAsync();

    var products = await db.Products
        .Include(p => p.Category)
        .Where(p => p.IsActive)
        .OrderBy(p => p.Category != null ? p.Category.DisplayOrder : 999)
        .ThenBy(p => p.Name)
        .Select(p => new ProductDto(
            p.Id,
            p.Sku,
            p.Barcode,
            p.Name,
            p.CategoryId,
            p.Category != null ? p.Category.Name : "Uncategorized",
            p.Price,
            p.CostPrice,
            p.Stock,
            p.ReorderLevel,
            p.Icon,
            p.Color,
            p.IsActive
        ))
        .ToListAsync();

    var customers = await db.Customers
        .Where(c => c.IsActive)
        .OrderBy(c => c.CustomerCode)
        .Select(c => new CustomerDto(
            c.CustomerCode,
            c.Id,
            c.Name,
            c.Email,
            c.Phone,
            c.Points,
            c.Tier,
            c.Balance,
            c.LastVisit
        ))
        .ToListAsync();

    var rawOrders = await db.Orders
        .Include(o => o.OrderItems)
        .Include(o => o.OrderPayments)
        .OrderByDescending(o => o.OrderDate)
        .ToListAsync();

    var orders = rawOrders.Select(MapOrderToDto).ToList();

    var discounts = await db.Discounts
        .Where(d => d.IsActive)
        .OrderBy(d => d.Code)
        .Select(d => new DiscountDto(
            d.Id,
            d.Code,
            d.Name,
            d.DiscountType,
            d.Value,
            d.MinOrderAmount,
            d.IsActive
        ))
        .ToListAsync();

    var settings = await db.StoreSettings.FirstOrDefaultAsync();

    var users = await db.Users
        .Include(u => u.Role)
        .OrderBy(u => u.Id)
        .Select(u => new UserDto(
            u.Id,
            u.Username,
            u.FullName,
            u.Email,
            u.Role != null ? u.Role.Name : "Cashier",
            u.RoleId,
            u.IsActive,
            u.LastLoginAt
        ))
        .ToListAsync();

    var stockAdjustments = await db.StockAdjustmentNotes
        .OrderByDescending(n => n.CreatedAt)
        .Take(200)
        .Select(n => new StockAdjustmentDto(
            n.Id,
            n.NoteNumber,
            n.NoteType,
            n.ProductId,
            n.ProductName,
            n.Sku,
            n.PreviousStock,
            n.QuantityChange,
            n.NewStock,
            n.BatchReference,
            n.Remarks,
            n.CreatedByUsername,
            n.CreatedAt
        ))
        .ToListAsync();

    return Results.Ok(new
    {
        categories,
        products,
        customers,
        orders,
        discounts,
        settings,
        users,
        stockAdjustments
    });
});

/* ============================================================================
   AUTHENTICATION & USERS ENDPOINTS
   ============================================================================ */
app.MapPost("/api/auth/login", async (LoginRequest req, PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);

    var user = await db.Users
        .Include(u => u.Role)
        .FirstOrDefaultAsync(u => u.Username == req.Username && u.IsActive);

    if (user is null)
    {
        return Results.BadRequest(new { message = "Invalid username or inactive account." });
    }

    var expectedHash = $"SHA256:{req.Password}";
    if (user.PasswordHash != expectedHash && user.PasswordHash != req.Password)
    {
        return Results.BadRequest(new { message = "Invalid password." });
    }

    user.LastLoginAt = DateTime.UtcNow;
    db.AuditLogs.Add(new AuditLog
    {
        UserId = user.Id,
        Username = user.Username,
        Action = "USER_LOGIN",
        EntityName = "Users",
        EntityId = user.Id.ToString(),
        Details = $"{user.FullName} ({user.Role?.Name}) signed in."
    });
    await db.SaveChangesAsync();

    return Results.Ok(new UserDto(
        user.Id,
        user.Username,
        user.FullName,
        user.Email,
        user.Role?.Name ?? "Cashier",
        user.RoleId,
        user.IsActive,
        user.LastLoginAt
    ));
});

app.MapGet("/api/users", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var users = await db.Users
        .Include(u => u.Role)
        .OrderBy(u => u.Id)
        .Select(u => new UserDto(
            u.Id,
            u.Username,
            u.FullName,
            u.Email,
            u.Role != null ? u.Role.Name : "Cashier",
            u.RoleId,
            u.IsActive,
            u.LastLoginAt
        ))
        .ToListAsync();
    return Results.Ok(users);
});

app.MapPost("/api/users", async (CreateUserRequest req, PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);

    if (await db.Users.AnyAsync(u => u.Username == req.Username || u.Email == req.Email))
    {
        return Results.BadRequest(new { message = "A user with that username or email already exists." });
    }

    var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == req.Role)
               ?? (req.Role.Contains("Manager", StringComparison.OrdinalIgnoreCase)
                   ? await db.Roles.FirstOrDefaultAsync(r => r.Name.Contains("Manager"))
                   : null)
               ?? await db.Roles.FirstOrDefaultAsync(r => r.Name == "Cashier");

    if (role is null)
    {
        return Results.BadRequest(new { message = "Roles table is empty." });
    }

    var user = new User
    {
        Username = req.Username.Trim(),
        FullName = req.FullName.Trim(),
        Email = req.Email.Trim(),
        PasswordHash = $"SHA256:{req.Password}",
        RoleId = role.Id,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    db.Users.Add(user);
    db.AuditLogs.Add(new AuditLog
    {
        Username = "admin",
        Action = "CREATE_USER",
        EntityName = "Users",
        EntityId = user.Username,
        Details = $"Created user account '{user.Username}' with role '{role.Name}'."
    });
    await db.SaveChangesAsync();

    return Results.Ok(new UserDto(
        user.Id,
        user.Username,
        user.FullName,
        user.Email,
        role.Name,
        user.RoleId,
        user.IsActive,
        user.LastLoginAt
    ));
});

app.MapPatch("/api/users/{id:int}/toggle-status", async (int id, PosDbContext db) =>
{
    var user = await db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
    if (user is null) return Results.NotFound();

    user.IsActive = !user.IsActive;
    db.AuditLogs.Add(new AuditLog
    {
        Username = "admin",
        Action = user.IsActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
        EntityName = "Users",
        EntityId = user.Id.ToString(),
        Details = $"{(user.IsActive ? "Activated" : "Deactivated")} user '{user.Username}'."
    });
    await db.SaveChangesAsync();

    return Results.Ok(new UserDto(
        user.Id,
        user.Username,
        user.FullName,
        user.Email,
        user.Role?.Name ?? "Cashier",
        user.RoleId,
        user.IsActive,
        user.LastLoginAt
    ));
});

/* ============================================================================
   CATEGORIES & INVENTORY MASTER (PRODUCTS) ENDPOINTS
   Note: Product creation initializes Stock = 0 and keeps ReorderLevel.
         Stock additions/adjustments happen exclusively via Goods Received from
         Production (GRN) & Stock Adjustment Notes (/api/stock-adjustments).
   ============================================================================ */
app.MapGet("/api/categories", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var categories = await db.Categories
        .Where(c => c.IsActive)
        .OrderBy(c => c.DisplayOrder)
        .ThenBy(c => c.Name)
        .Select(c => new CategoryDto(c.Id, c.Name, c.Description, c.DisplayOrder))
        .ToListAsync();
    return Results.Ok(categories);
});

app.MapPost("/api/categories", async (CreateCategoryRequest req, PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var trimmed = req.Name.Trim();
    if (string.IsNullOrWhiteSpace(trimmed))
        return Results.BadRequest(new { message = "Category name is required." });

    var existing = await db.Categories.FirstOrDefaultAsync(c => c.Name == trimmed);
    if (existing is not null)
    {
        existing.IsActive = true;
        existing.Description = req.Description ?? existing.Description;
        await db.SaveChangesAsync();
        return Results.Ok(new CategoryDto(existing.Id, existing.Name, existing.Description, existing.DisplayOrder));
    }

    var maxOrder = await db.Categories.AnyAsync() ? await db.Categories.MaxAsync(c => c.DisplayOrder) : 0;
    var cat = new Category
    {
        Name = trimmed,
        Description = req.Description,
        DisplayOrder = maxOrder + 1,
        IsActive = true
    };
    db.Categories.Add(cat);
    await db.SaveChangesAsync();

    return Results.Ok(new CategoryDto(cat.Id, cat.Name, cat.Description, cat.DisplayOrder));
});

app.MapGet("/api/products", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var products = await db.Products
        .Include(p => p.Category)
        .Where(p => p.IsActive)
        .OrderBy(p => p.Name)
        .Select(p => new ProductDto(
            p.Id,
            p.Sku,
            p.Barcode,
            p.Name,
            p.CategoryId,
            p.Category != null ? p.Category.Name : "Uncategorized",
            p.Price,
            p.CostPrice,
            p.Stock,
            p.ReorderLevel,
            p.Icon,
            p.Color,
            p.IsActive
        ))
        .ToListAsync();
    return Results.Ok(products);
});

app.MapPost("/api/products", async (UpsertProductRequest req, PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);

    var categoryName = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim();
    var category = await db.Categories.FirstOrDefaultAsync(c => c.Name == categoryName);
    if (category is null)
    {
        var maxOrder = await db.Categories.AnyAsync() ? await db.Categories.MaxAsync(c => c.DisplayOrder) : 0;
        category = new Category { Name = categoryName, DisplayOrder = maxOrder + 1, IsActive = true };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
    }

    var uniqueSuffix = DateTime.UtcNow.Ticks.ToString()[^6..];
    var sku = string.IsNullOrWhiteSpace(req.Sku) ? $"SKU-{uniqueSuffix}" : req.Sku.Trim();
    var barcode = string.IsNullOrWhiteSpace(req.Barcode) ? $"479{uniqueSuffix}01" : req.Barcode.Trim();

    var product = new Product
    {
        Sku = sku,
        Barcode = barcode,
        Name = req.Name.Trim(),
        CategoryId = category.Id,
        Price = req.Price,
        CostPrice = req.CostPrice > 0 ? req.CostPrice : Math.Round(req.Price * 0.72m, 2),
        // Stock at Inventory Master creation is strictly 0. Stock is added via Goods Received from Production (GRN) / Adjustment Note.
        Stock = 0,
        ReorderLevel = req.ReorderLevel > 0 ? req.ReorderLevel : 15,
        Icon = string.IsNullOrWhiteSpace(req.Icon) ? "📦" : req.Icon.Trim(),
        Color = string.IsNullOrWhiteSpace(req.Color) ? "bg-indigo-100 text-indigo-600" : req.Color.Trim(),
        IsActive = true,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    db.Products.Add(product);
    db.AuditLogs.Add(new AuditLog
    {
        Username = "admin",
        Action = "CREATE_PRODUCT",
        EntityName = "Products",
        EntityId = product.Sku,
        Details = $"Created product '{product.Name}' in Inventory Master (Price: Rs. {product.Price:F2}, Reorder Level: {product.ReorderLevel}, Initial Stock: 0)."
    });
    await db.SaveChangesAsync();

    return Results.Ok(new ProductDto(
        product.Id,
        product.Sku,
        product.Barcode,
        product.Name,
        category.Id,
        category.Name,
        product.Price,
        product.CostPrice,
        product.Stock,
        product.ReorderLevel,
        product.Icon,
        product.Color,
        product.IsActive
    ));
});

app.MapPut("/api/products/{id:int}", async (int id, UpsertProductRequest req, PosDbContext db) =>
{
    var product = await db.Products.Include(p => p.Category).FirstOrDefaultAsync(p => p.Id == id);
    if (product is null) return Results.NotFound();

    var categoryName = string.IsNullOrWhiteSpace(req.Category) ? (product.Category?.Name ?? "General") : req.Category.Trim();
    var category = await db.Categories.FirstOrDefaultAsync(c => c.Name == categoryName);
    if (category is null)
    {
        category = new Category { Name = categoryName, DisplayOrder = 99, IsActive = true };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
    }

    if (!string.IsNullOrWhiteSpace(req.Sku)) product.Sku = req.Sku.Trim();
    if (!string.IsNullOrWhiteSpace(req.Barcode)) product.Barcode = req.Barcode.Trim();
    product.Name = req.Name.Trim();
    product.CategoryId = category.Id;
    product.Price = req.Price;
    if (req.CostPrice >= 0) product.CostPrice = req.CostPrice;
    // Stock is NOT modified from Inventory Master edit; it is exclusively controlled by GRN / Stock Adjustment Notes and Invoices.
    if (req.ReorderLevel > 0) product.ReorderLevel = req.ReorderLevel;
    if (!string.IsNullOrWhiteSpace(req.Icon)) product.Icon = req.Icon.Trim();
    if (!string.IsNullOrWhiteSpace(req.Color)) product.Color = req.Color.Trim();
    product.UpdatedAt = DateTime.UtcNow;

    db.AuditLogs.Add(new AuditLog
    {
        Username = "admin",
        Action = "UPDATE_PRODUCT",
        EntityName = "Products",
        EntityId = product.Id.ToString(),
        Details = $"Updated Inventory Master for '{product.Name}' (Price: Rs. {product.Price:F2}, Reorder Level: {product.ReorderLevel})."
    });
    await db.SaveChangesAsync();

    return Results.Ok(new ProductDto(
        product.Id,
        product.Sku,
        product.Barcode,
        product.Name,
        category.Id,
        category.Name,
        product.Price,
        product.CostPrice,
        product.Stock,
        product.ReorderLevel,
        product.Icon,
        product.Color,
        product.IsActive
    ));
});

app.MapDelete("/api/products/{id:int}", async (int id, PosDbContext db) =>
{
    var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id);
    if (product is null) return Results.NotFound();

    // Soft-deactivate if referenced by OrderItems, otherwise delete cleanly
    var hasOrders = await db.OrderItems.AnyAsync(oi => oi.ProductId == id);
    if (hasOrders)
    {
        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;
    }
    else
    {
        db.Products.Remove(product);
    }

    db.AuditLogs.Add(new AuditLog
    {
        Username = "admin",
        Action = "DEACTIVATE_PRODUCT",
        EntityName = "Products",
        EntityId = product.Id.ToString(),
        Details = $"Removed/deactivated product '{product.Name}'."
    });
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ============================================================================
   GOODS RECEIVED FROM PRODUCTION (GRN) & STOCK ADJUSTMENT NOTES ENDPOINTS
   (Admin Login Exclusive)
   ============================================================================ */
app.MapGet("/api/stock-adjustments", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var notes = await db.StockAdjustmentNotes
        .OrderByDescending(n => n.CreatedAt)
        .Take(200)
        .Select(n => new StockAdjustmentDto(
            n.Id,
            n.NoteNumber,
            n.NoteType,
            n.ProductId,
            n.ProductName,
            n.Sku,
            n.PreviousStock,
            n.QuantityChange,
            n.NewStock,
            n.BatchReference,
            n.Remarks,
            n.CreatedByUsername,
            n.CreatedAt
        ))
        .ToListAsync();
    return Results.Ok(notes);
});

app.MapPost("/api/stock-adjustments", async (CreateStockAdjustmentRequest req, PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);

    if (req.Items is null || req.Items.Count == 0)
    {
        return Results.BadRequest(new { message = "Please select at least one product and quantity for the note." });
    }

    // Enforce Admin-exclusive access
    bool isAdmin = false;
    string actingUsername = req.Username ?? "admin";
    int? actingUserId = req.UserId;

    if (req.UserId.HasValue)
    {
        var dbUser = await db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == req.UserId.Value);
        if (dbUser is not null)
        {
            actingUsername = dbUser.Username;
            isAdmin = string.Equals(dbUser.Role?.Name, "Administrator", StringComparison.OrdinalIgnoreCase)
                      || string.Equals(dbUser.Role?.Name, "Admin", StringComparison.OrdinalIgnoreCase)
                      || string.Equals(dbUser.Username, "admin", StringComparison.OrdinalIgnoreCase);
        }
    }

    if (!isAdmin)
    {
        isAdmin = string.Equals(req.UserRole, "Administrator", StringComparison.OrdinalIgnoreCase)
                  || string.Equals(req.UserRole, "Admin", StringComparison.OrdinalIgnoreCase)
                  || string.Equals(req.Username, "admin", StringComparison.OrdinalIgnoreCase);
    }

    if (!isAdmin)
    {
        return Results.BadRequest(new
        {
            message = "Access Restricted: Goods Received from Production (GRN) and Stock Adjustment Notes are exclusive to Administrator login."
        });
    }

    var noteType = string.IsNullOrWhiteSpace(req.NoteType)
        ? "Goods Received from Production (GRN)"
        : req.NoteType.Trim();

    bool isDeduction = noteType.Contains("(-)") || noteType.Contains("Deduct", StringComparison.OrdinalIgnoreCase)
                       || noteType.Contains("Wastage", StringComparison.OrdinalIgnoreCase);

    await using var tx = await db.Database.BeginTransactionAsync();
    try
    {
        var existingCount = await db.StockAdjustmentNotes.CountAsync();
        var prefix = noteType.Contains("Production", StringComparison.OrdinalIgnoreCase)
                     || noteType.Contains("GRN", StringComparison.OrdinalIgnoreCase)
            ? "GRN"
            : "ADJ";
        var noteNumber = $"{prefix}-{1001 + existingCount}";

        var createdDtos = new List<StockAdjustmentDto>();

        foreach (var line in req.Items)
        {
            if (line.Quantity <= 0)
            {
                return Results.BadRequest(new { message = "Quantity must be greater than zero." });
            }

            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == line.ProductId);
            if (product is null)
            {
                return Results.BadRequest(new { message = $"Product ID {line.ProductId} not found." });
            }

            var previousStock = product.Stock;
            var signedChange = isDeduction ? -Math.Abs(line.Quantity) : Math.Abs(line.Quantity);

            if (previousStock + signedChange < 0)
            {
                return Results.BadRequest(new
                {
                    message = $"Cannot deduct {Math.Abs(line.Quantity)} unit(s) from '{product.Name}' (Current Stock: {previousStock})."
                });
            }

            product.Stock = previousStock + signedChange;
            product.UpdatedAt = DateTime.UtcNow;

            var note = new StockAdjustmentNote
            {
                NoteNumber = noteNumber,
                NoteType = noteType,
                ProductId = product.Id,
                ProductName = product.Name,
                Sku = product.Sku,
                PreviousStock = previousStock,
                QuantityChange = signedChange,
                NewStock = product.Stock,
                BatchReference = string.IsNullOrWhiteSpace(req.BatchReference) ? null : req.BatchReference.Trim(),
                Remarks = string.IsNullOrWhiteSpace(req.Remarks) ? null : req.Remarks.Trim(),
                CreatedByUserId = actingUserId,
                CreatedByUsername = actingUsername,
                CreatedAt = DateTime.UtcNow
            };

            db.StockAdjustmentNotes.Add(note);

            db.AuditLogs.Add(new AuditLog
            {
                UserId = actingUserId,
                Username = actingUsername,
                Action = prefix == "GRN" ? "GOODS_RECEIVED_NOTE" : "STOCK_ADJUSTMENT",
                EntityName = "StockAdjustmentNotes",
                EntityId = noteNumber,
                Details = $"{noteType} [{noteNumber}] for '{product.Name}' ({product.Sku}): Stock {previousStock} {(signedChange >= 0 ? "+" : "")}{signedChange} -> {product.Stock}."
            });

            await db.SaveChangesAsync();

            createdDtos.Add(new StockAdjustmentDto(
                note.Id,
                note.NoteNumber,
                note.NoteType,
                note.ProductId,
                note.ProductName,
                note.Sku,
                note.PreviousStock,
                note.QuantityChange,
                note.NewStock,
                note.BatchReference,
                note.Remarks,
                note.CreatedByUsername,
                note.CreatedAt
            ));
        }

        await tx.CommitAsync();
        return Results.Ok(createdDtos);
    }
    catch (Exception ex)
    {
        await tx.RollbackAsync();
        return Results.BadRequest(new { message = $"Failed to post stock adjustment note: {ex.Message}" });
    }
});

/* ============================================================================
   CUSTOMERS & LOYALTY ENDPOINTS
   ============================================================================ */
app.MapGet("/api/customers", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var customers = await db.Customers
        .Where(c => c.IsActive)
        .OrderBy(c => c.CustomerCode)
        .Select(c => new CustomerDto(
            c.CustomerCode,
            c.Id,
            c.Name,
            c.Email,
            c.Phone,
            c.Points,
            c.Tier,
            c.Balance,
            c.LastVisit
        ))
        .ToListAsync();
    return Results.Ok(customers);
});

app.MapPost("/api/customers", async (UpsertCustomerRequest req, PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var count = await db.Customers.CountAsync();
    var code = $"CUST-{(count + 1):D3}";
    while (await db.Customers.AnyAsync(c => c.CustomerCode == code))
    {
        count++;
        code = $"CUST-{(count + 1):D3}";
    }

    var points = req.Points ?? 0;
    var customer = new Customer
    {
        CustomerCode = code,
        Name = req.Name.Trim(),
        Email = req.Email.Trim(),
        Phone = req.Phone.Trim(),
        Points = points,
        Tier = CalculateLoyaltyTier(points),
        Balance = req.Balance ?? 0m,
        LastVisit = DateTime.UtcNow,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    db.Customers.Add(customer);
    db.AuditLogs.Add(new AuditLog
    {
        Username = "cashier1",
        Action = "CREATE_CUSTOMER",
        EntityName = "Customers",
        EntityId = customer.CustomerCode,
        Details = $"Enrolled customer '{customer.Name}' ({customer.CustomerCode})."
    });
    await db.SaveChangesAsync();

    return Results.Ok(new CustomerDto(
        customer.CustomerCode,
        customer.Id,
        customer.Name,
        customer.Email,
        customer.Phone,
        customer.Points,
        customer.Tier,
        customer.Balance,
        customer.LastVisit
    ));
});

app.MapPut("/api/customers/{code}", async (string code, UpsertCustomerRequest req, PosDbContext db) =>
{
    var customer = await db.Customers.FirstOrDefaultAsync(c => c.CustomerCode == code);
    if (customer is null) return Results.NotFound();

    customer.Name = req.Name.Trim();
    customer.Email = req.Email.Trim();
    customer.Phone = req.Phone.Trim();
    if (req.Points.HasValue)
    {
        customer.Points = req.Points.Value;
        customer.Tier = CalculateLoyaltyTier(customer.Points);
    }
    if (req.Balance.HasValue)
    {
        customer.Balance = req.Balance.Value;
    }

    await db.SaveChangesAsync();

    return Results.Ok(new CustomerDto(
        customer.CustomerCode,
        customer.Id,
        customer.Name,
        customer.Email,
        customer.Phone,
        customer.Points,
        customer.Tier,
        customer.Balance,
        customer.LastVisit
    ));
});

app.MapDelete("/api/customers/{code}", async (string code, PosDbContext db) =>
{
    var customer = await db.Customers.FirstOrDefaultAsync(c => c.CustomerCode == code);
    if (customer is null) return Results.NotFound();

    var hasOrders = await db.Orders.AnyAsync(o => o.CustomerId == customer.Id);
    if (hasOrders)
    {
        customer.IsActive = false;
    }
    else
    {
        db.Customers.Remove(customer);
    }

    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ============================================================================
   ORDERS, INVOICE CHECKOUT (TRANSACTIONAL STOCK DEDUCTION) & REFUNDS ENDPOINTS
   ============================================================================ */
app.MapGet("/api/orders", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var rawOrders = await db.Orders
        .Include(o => o.OrderItems)
        .Include(o => o.OrderPayments)
        .OrderByDescending(o => o.OrderDate)
        .ToListAsync();

    return Results.Ok(rawOrders.Select(MapOrderToDto));
});

app.MapPost("/api/orders", async (CreateOrderRequest req, PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);

    if (req.CartItems is null || req.CartItems.Count == 0)
    {
        return Results.BadRequest(new { message = "Cannot create an order with an empty cart." });
    }

    await using var tx = await db.Database.BeginTransactionAsync();
    try
    {
        var settings = await db.StoreSettings.FirstOrDefaultAsync();
        var taxRate = settings?.DefaultTaxRate ?? 8.00m;
        var loyaltyRate = settings?.LoyaltyPointsPerHundredRs ?? 1;

        Customer? customer = null;
        if (!string.IsNullOrWhiteSpace(req.CustomerCode))
        {
            customer = await db.Customers.FirstOrDefaultAsync(c => c.CustomerCode == req.CustomerCode);
        }

        Discount? discount = null;
        if (!string.IsNullOrWhiteSpace(req.DiscountCode))
        {
            discount = await db.Discounts.FirstOrDefaultAsync(d =>
                d.Code == req.DiscountCode && d.IsActive);
        }

        var orderItems = new List<OrderItem>();
        decimal subtotal = 0m;
        int totalUnitsDeducted = 0;

        foreach (var itemReq in req.CartItems)
        {
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == itemReq.Id);
            if (product is null)
            {
                return Results.BadRequest(new { message = $"Product ID {itemReq.Id} ({itemReq.Name}) no longer exists." });
            }

            if (product.Stock < itemReq.Quantity)
            {
                return Results.BadRequest(new
                {
                    message = $"Insufficient stock for '{product.Name}'. Available: {product.Stock}, requested: {itemReq.Quantity}."
                });
            }

            // Deduct stock in real time upon invoice creation
            product.Stock -= itemReq.Quantity;
            product.UpdatedAt = DateTime.UtcNow;
            totalUnitsDeducted += itemReq.Quantity;

            var lineTotal = Math.Round(product.Price * itemReq.Quantity, 2);
            subtotal += lineTotal;

            orderItems.Add(new OrderItem
            {
                ProductId = product.Id,
                ProductName = product.Name,
                Barcode = product.Barcode,
                UnitPrice = product.Price,
                CostPrice = product.CostPrice,
                Quantity = itemReq.Quantity,
                DiscountAmount = 0m,
                LineTotal = lineTotal
            });
        }

        decimal discountAmount = 0m;
        if (discount is not null && subtotal >= discount.MinOrderAmount)
        {
            discountAmount = discount.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase)
                ? Math.Round(subtotal * (discount.Value / 100m), 2)
                : Math.Min(subtotal, discount.Value);
        }

        var taxableAmount = Math.Max(0m, subtotal - discountAmount);
        var taxAmount = Math.Round(taxableAmount * (taxRate / 100m), 2);
        var totalAmount = Math.Round(taxableAmount + taxAmount, 2);

        var orderCount = await db.Orders.CountAsync();
        var orderNumber = $"ORD-{1001 + orderCount}";
        while (await db.Orders.AnyAsync(o => o.OrderNumber == orderNumber))
        {
            orderCount++;
            orderNumber = $"ORD-{1001 + orderCount}";
        }

        var pointsEarned = customer is not null
            ? (int)Math.Floor(totalAmount / 100m) * Math.Max(1, loyaltyRate)
            : 0;

        var openTill = await db.TillSessions.FirstOrDefaultAsync(t => t.Status == "Open");

        // Resolve a valid CashierUserId in dbo.Users so FK never fails even on custom user setups
        var requestedCashierId = req.CashierUserId ?? openTill?.UserId;
        User? cashierUser = null;
        if (requestedCashierId.HasValue)
        {
            cashierUser = await db.Users.FirstOrDefaultAsync(u => u.Id == requestedCashierId.Value);
        }
        cashierUser ??= await db.Users.FirstOrDefaultAsync();

        var order = new Order
        {
            OrderNumber = orderNumber,
            OrderDate = DateTime.UtcNow,
            CustomerId = customer?.Id,
            CustomerName = customer?.Name ?? "Walk-in",
            CashierUserId = cashierUser?.Id ?? 1,
            TillSessionId = openTill?.Id,
            DiscountId = discount?.Id,
            Subtotal = subtotal,
            DiscountAmount = discountAmount,
            TaxRate = taxRate,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            PaymentMethodSummary = req.Method,
            CashTendered = req.CashTendered,
            ChangeGiven = req.Change ?? 0m,
            PointsEarned = pointsEarned,
            PointsRedeemed = 0,
            Status = "Completed",
            CreatedAt = DateTime.UtcNow,
            OrderItems = orderItems,
            OrderPayments = (req.Payments is { Count: > 0 }
                ? req.Payments.Select(p => new OrderPayment
                {
                    PaymentMethod = p.Method,
                    Amount = p.Amount,
                    ReferenceNumber = p.ReferenceNumber,
                    PaidAt = DateTime.UtcNow
                }).ToList()
                : new List<OrderPayment>
                {
                    new()
                    {
                        PaymentMethod = req.Method,
                        Amount = totalAmount,
                        PaidAt = DateTime.UtcNow
                    }
                })
        };

        db.Orders.Add(order);

        if (customer is not null)
        {
            customer.Points += pointsEarned;
            customer.Tier = CalculateLoyaltyTier(customer.Points);
            customer.LastVisit = DateTime.UtcNow;
        }

        db.AuditLogs.Add(new AuditLog
        {
            UserId = order.CashierUserId,
            Username = cashierUser?.Username ?? "cashier1",
            Action = "CREATE_ORDER",
            EntityName = "Orders",
            EntityId = order.OrderNumber,
            Details = $"Completed invoice {order.OrderNumber} for Rs. {order.TotalAmount:F2} via {order.PaymentMethodSummary} and deducted {totalUnitsDeducted} unit(s) from inventory stock."
        });

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return Results.Ok(MapOrderToDto(order));
    }
    catch (Exception ex)
    {
        await tx.RollbackAsync();
        return Results.BadRequest(new { message = $"Failed to complete checkout: {ex.Message}" });
    }
});

app.MapPost("/api/orders/{orderNumber}/refund", async (string orderNumber, RefundOrderRequest req, PosDbContext db) =>
{
    var order = await db.Orders
        .Include(o => o.OrderItems)
        .Include(o => o.OrderPayments)
        .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);

    if (order is null) return Results.NotFound(new { message = "Order not found." });
    if (order.Status == "Refunded")
        return Results.BadRequest(new { message = "This order has already been refunded." });

    await using var tx = await db.Database.BeginTransactionAsync();
    try
    {
        order.Status = "Refunded";

        if (req.RestockItems)
        {
            foreach (var item in order.OrderItems)
            {
                var product = await db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
                if (product is not null)
                {
                    product.Stock += item.Quantity;
                    product.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        if (order.CustomerId.HasValue && order.PointsEarned > 0)
        {
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == order.CustomerId.Value);
            if (customer is not null)
            {
                customer.Points = Math.Max(0, customer.Points - order.PointsEarned);
                customer.Tier = CalculateLoyaltyTier(customer.Points);
            }
        }

        var refundCount = await db.Refunds.CountAsync();
        var managerUser = req.ApprovedByManagerId.HasValue
            ? await db.Users.FirstOrDefaultAsync(u => u.Id == req.ApprovedByManagerId.Value)
            : await db.Users.FirstOrDefaultAsync();

        var refund = new Refund
        {
            RefundNumber = $"REF-{1001 + refundCount}",
            OrderId = order.Id,
            ProcessedByUserId = order.CashierUserId,
            ApprovedByManagerId = managerUser?.Id,
            RefundType = "Refund",
            RefundAmount = order.TotalAmount,
            Reason = string.IsNullOrWhiteSpace(req.Reason) ? "Customer requested refund against receipt" : req.Reason.Trim(),
            RestockItems = req.RestockItems,
            CreatedAt = DateTime.UtcNow
        };
        db.Refunds.Add(refund);

        db.AuditLogs.Add(new AuditLog
        {
            Username = managerUser?.Username ?? "manager",
            Action = "APPROVE_REFUND",
            EntityName = "Refunds",
            EntityId = refund.RefundNumber,
            Details = $"Processed refund {refund.RefundNumber} for Order {order.OrderNumber} (Rs. {order.TotalAmount:F2}). Restocked: {req.RestockItems}."
        });

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return Results.Ok(MapOrderToDto(order));
    }
    catch (Exception ex)
    {
        await tx.RollbackAsync();
        return Results.BadRequest(new { message = ex.Message });
    }
});

/* ============================================================================
   DISCOUNTS, SETTINGS, REPORTS & AUDIT LOGS ENDPOINTS
   ============================================================================ */
app.MapGet("/api/discounts", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var list = await db.Discounts
        .Where(d => d.IsActive)
        .OrderBy(d => d.Code)
        .Select(d => new DiscountDto(d.Id, d.Code, d.Name, d.DiscountType, d.Value, d.MinOrderAmount, d.IsActive))
        .ToListAsync();
    return Results.Ok(list);
});

app.MapGet("/api/settings", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var settings = await db.StoreSettings.FirstOrDefaultAsync();
    return settings is not null ? Results.Ok(settings) : Results.NotFound();
});

app.MapPut("/api/settings", async (StoreSetting updated, PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var settings = await db.StoreSettings.FirstOrDefaultAsync();
    if (settings is null)
    {
        updated.UpdatedAt = DateTime.UtcNow;
        db.StoreSettings.Add(updated);
    }
    else
    {
        settings.StoreName = updated.StoreName;
        settings.BranchCode = updated.BranchCode;
        settings.StoreAddress = updated.StoreAddress;
        settings.Phone = updated.Phone;
        settings.Email = updated.Email;
        settings.Currency = updated.Currency;
        settings.DefaultTaxRate = updated.DefaultTaxRate;
        settings.LowStockThreshold = updated.LowStockThreshold;
        settings.LoyaltyPointsPerHundredRs = updated.LoyaltyPointsPerHundredRs;
        settings.ReceiptFooterText = updated.ReceiptFooterText;
        settings.ReceiptPrinterName = updated.ReceiptPrinterName;
        settings.ReceiptPrinterConnected = updated.ReceiptPrinterConnected;
        settings.BarcodeScannerName = updated.BarcodeScannerName;
        settings.BarcodeScannerConnected = updated.BarcodeScannerConnected;
        settings.PaymentTerminalName = updated.PaymentTerminalName;
        settings.PaymentTerminalConnected = updated.PaymentTerminalConnected;
        settings.UpdatedAt = DateTime.UtcNow;
    }

    db.AuditLogs.Add(new AuditLog
    {
        Username = "admin",
        Action = "UPDATE_SETTINGS",
        EntityName = "StoreSettings",
        EntityId = "1",
        Details = $"Updated store settings for '{updated.StoreName}' ({updated.BranchCode}), Tax Rate: {updated.DefaultTaxRate}%."
    });

    await db.SaveChangesAsync();
    return Results.Ok(await db.StoreSettings.FirstOrDefaultAsync());
});

app.MapGet("/api/reports/summary", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var completedOrders = await db.Orders
        .Include(o => o.OrderItems)
        .Include(o => o.OrderPayments)
        .Where(o => o.Status == "Completed")
        .ToListAsync();

    var totalRevenue = completedOrders.Sum(o => o.TotalAmount);
    var totalTax = completedOrders.Sum(o => o.TaxAmount);
    var totalDiscount = completedOrders.Sum(o => o.DiscountAmount);
    var totalCost = completedOrders
        .SelectMany(o => o.OrderItems)
        .Sum(i => i.CostPrice * i.Quantity);
    var netSalesBeforeTax = completedOrders.Sum(o => o.Subtotal - o.DiscountAmount);
    var grossProfit = netSalesBeforeTax - totalCost;

    var lowStockProducts = await db.Products
        .Include(p => p.Category)
        .Where(p => p.IsActive && p.Stock <= p.ReorderLevel)
        .OrderBy(p => p.Stock)
        .Select(p => new
        {
            p.Id,
            p.Sku,
            p.Name,
            Category = p.Category != null ? p.Category.Name : "General",
            p.Stock,
            p.ReorderLevel,
            p.Price
        })
        .ToListAsync();

    var paymentBreakdown = completedOrders
        .SelectMany(o => o.OrderPayments)
        .GroupBy(p => p.PaymentMethod)
        .Select(g => new
        {
            method = g.Key,
            amount = g.Sum(x => x.Amount),
            count = g.Count()
        })
        .ToList();

    return Results.Ok(new
    {
        totalOrders = completedOrders.Count,
        refundedOrders = await db.Orders.CountAsync(o => o.Status == "Refunded"),
        totalRevenue,
        totalTax,
        totalDiscount,
        grossProfit,
        lowStockCount = lowStockProducts.Count,
        lowStockProducts,
        paymentBreakdown
    });
});

app.MapGet("/api/audit-logs", async (PosDbContext db, DatabaseConfig config) =>
{
    await EnsureDatabaseAndTablesAsync(db, config);
    var logs = await db.AuditLogs
        .OrderByDescending(a => a.CreatedAt)
        .Take(100)
        .ToListAsync();
    return Results.Ok(logs);
});

app.Run();
