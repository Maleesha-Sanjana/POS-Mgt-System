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

/* ============================================================================
   HEALTH & DATABASE CONNECTION CHECK ENDPOINT
   ============================================================================ */
app.MapGet("/api/health/db", async (PosDbContext db, DatabaseConfig config) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        if (!canConnect)
        {
            return Results.Json(new
            {
                connected = false,
                message = "Cannot connect to SQL Server. Please verify your connection string in backend/dbconfig.json and ensure PosManagementDb is created using database/01_Create_Schema.sql."
            }, statusCode: 503);
        }

        var productCount = await db.Products.CountAsync();
        var orderCount = await db.Orders.CountAsync();
        var customerCount = await db.Customers.CountAsync();

        return Results.Ok(new
        {
            connected = true,
            database = db.Database.GetDbConnection().Database,
            dataSource = db.Database.GetDbConnection().DataSource,
            counts = new { products = productCount, orders = orderCount, customers = customerCount }
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            connected = false,
            message = ex.Message,
            hint = "Check backend/dbconfig.json and run database/01_Create_Schema.sql on your SQL Server instance."
        }, statusCode: 503);
    }
});

/* ============================================================================
   BOOTSTRAP ENDPOINT (Loads all live POS data in a single round-trip)
   ============================================================================ */
app.MapGet("/api/bootstrap", async (PosDbContext db) =>
{
    var categories = await db.Categories
        .Where(c => c.IsActive)
        .OrderBy(c => c.DisplayOrder)
        .ThenBy(c => c.Name)
        .Select(c => new CategoryDto(c.Id, c.Name, c.Description, c.DisplayOrder))
        .ToListAsync();

    var products = await db.Products
        .Include(p => p.Category)
        .Where(p => p.IsActive)
        .OrderBy(p => p.Category!.DisplayOrder)
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

    return Results.Ok(new
    {
        categories,
        products,
        customers,
        orders,
        discounts,
        settings,
        users
    });
});

/* ============================================================================
   AUTHENTICATION & USERS ENDPOINTS
   ============================================================================ */
app.MapPost("/api/auth/login", async (LoginRequest req, PosDbContext db) =>
{
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

app.MapGet("/api/users", async (PosDbContext db) =>
{
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

app.MapPost("/api/users", async (CreateUserRequest req, PosDbContext db) =>
{
    if (await db.Users.AnyAsync(u => u.Username == req.Username || u.Email == req.Email))
    {
        return Results.BadRequest(new { message = "A user with that username or email already exists." });
    }

    var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == req.Role)
               ?? await db.Roles.FirstOrDefaultAsync(r => r.Name == "Cashier");

    if (role is null)
    {
        return Results.BadRequest(new { message = "Roles table is empty. Run 02_Insert_Demo_Data.sql first." });
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
   CATEGORIES & PRODUCTS ENDPOINTS
   ============================================================================ */
app.MapGet("/api/categories", async (PosDbContext db) =>
{
    var categories = await db.Categories
        .Where(c => c.IsActive)
        .OrderBy(c => c.DisplayOrder)
        .ThenBy(c => c.Name)
        .Select(c => new CategoryDto(c.Id, c.Name, c.Description, c.DisplayOrder))
        .ToListAsync();
    return Results.Ok(categories);
});

app.MapPost("/api/categories", async (CreateCategoryRequest req, PosDbContext db) =>
{
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

app.MapGet("/api/products", async (PosDbContext db) =>
{
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

app.MapPost("/api/products", async (UpsertProductRequest req, PosDbContext db) =>
{
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
        Stock = req.Stock,
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
        Username = "manager",
        Action = "CREATE_PRODUCT",
        EntityName = "Products",
        EntityId = product.Sku,
        Details = $"Added product '{product.Name}' (Price: Rs. {product.Price:F2}, Stock: {product.Stock})."
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
    product.Stock = req.Stock;
    if (req.ReorderLevel > 0) product.ReorderLevel = req.ReorderLevel;
    if (!string.IsNullOrWhiteSpace(req.Icon)) product.Icon = req.Icon.Trim();
    if (!string.IsNullOrWhiteSpace(req.Color)) product.Color = req.Color.Trim();
    product.UpdatedAt = DateTime.UtcNow;

    db.AuditLogs.Add(new AuditLog
    {
        Username = "manager",
        Action = "UPDATE_PRODUCT",
        EntityName = "Products",
        EntityId = product.Id.ToString(),
        Details = $"Updated '{product.Name}' (Price: Rs. {product.Price:F2}, Stock: {product.Stock})."
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
        Username = "manager",
        Action = "DEACTIVATE_PRODUCT",
        EntityName = "Products",
        EntityId = product.Id.ToString(),
        Details = $"Removed/deactivated product '{product.Name}'."
    });
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ============================================================================
   CUSTOMERS & LOYALTY ENDPOINTS
   ============================================================================ */
app.MapGet("/api/customers", async (PosDbContext db) =>
{
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

app.MapPost("/api/customers", async (UpsertCustomerRequest req, PosDbContext db) =>
{
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
   ORDERS, CHECKOUT (TRANSACTIONAL STOCK DEDUCTION) & REFUNDS ENDPOINTS
   ============================================================================ */
app.MapGet("/api/orders", async (PosDbContext db) =>
{
    var rawOrders = await db.Orders
        .Include(o => o.OrderItems)
        .Include(o => o.OrderPayments)
        .OrderByDescending(o => o.OrderDate)
        .ToListAsync();

    return Results.Ok(rawOrders.Select(MapOrderToDto));
});

app.MapPost("/api/orders", async (CreateOrderRequest req, PosDbContext db) =>
{
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

            // Deduct stock in real time
            product.Stock -= itemReq.Quantity;
            product.UpdatedAt = DateTime.UtcNow;

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

        var order = new Order
        {
            OrderNumber = orderNumber,
            OrderDate = DateTime.UtcNow,
            CustomerId = customer?.Id,
            CustomerName = customer?.Name ?? "Walk-in",
            CashierUserId = req.CashierUserId ?? openTill?.UserId ?? 3,
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
            Username = "cashier1",
            Action = "CREATE_ORDER",
            EntityName = "Orders",
            EntityId = order.OrderNumber,
            Details = $"Completed sale {order.OrderNumber} for Rs. {order.TotalAmount:F2} via {order.PaymentMethodSummary}."
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
        var refund = new Refund
        {
            RefundNumber = $"REF-{1001 + refundCount}",
            OrderId = order.Id,
            ProcessedByUserId = order.CashierUserId,
            ApprovedByManagerId = req.ApprovedByManagerId ?? 2,
            RefundType = "Refund",
            RefundAmount = order.TotalAmount,
            Reason = string.IsNullOrWhiteSpace(req.Reason) ? "Customer requested refund against receipt" : req.Reason.Trim(),
            RestockItems = req.RestockItems,
            CreatedAt = DateTime.UtcNow
        };
        db.Refunds.Add(refund);

        db.AuditLogs.Add(new AuditLog
        {
            Username = "manager",
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
app.MapGet("/api/discounts", async (PosDbContext db) =>
{
    var list = await db.Discounts
        .Where(d => d.IsActive)
        .OrderBy(d => d.Code)
        .Select(d => new DiscountDto(d.Id, d.Code, d.Name, d.DiscountType, d.Value, d.MinOrderAmount, d.IsActive))
        .ToListAsync();
    return Results.Ok(list);
});

app.MapGet("/api/settings", async (PosDbContext db) =>
{
    var settings = await db.StoreSettings.FirstOrDefaultAsync();
    return settings is not null ? Results.Ok(settings) : Results.NotFound();
});

app.MapPut("/api/settings", async (StoreSetting updated, PosDbContext db) =>
{
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

app.MapGet("/api/reports/summary", async (PosDbContext db) =>
{
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

app.MapGet("/api/audit-logs", async (PosDbContext db) =>
{
    var logs = await db.AuditLogs
        .OrderByDescending(a => a.CreatedAt)
        .Take(100)
        .ToListAsync();
    return Results.Ok(logs);
});

app.Run();
