using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PosSystem.Api.Models;

[Table("Roles", Schema = "dbo")]
public class Role
{
    [Key]
    public int Id { get; set; }
    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(250)]
    public string? Description { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
}

[Table("Users", Schema = "dbo")]
public class User
{
    [Key]
    public int Id { get; set; }
    [Required, MaxLength(50)]
    public string Username { get; set; } = string.Empty;
    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;
    [Required, MaxLength(150)]
    public string Email { get; set; } = string.Empty;
    [Required, MaxLength(256)]
    public string PasswordHash { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    [ForeignKey(nameof(RoleId))]
    public Role? Role { get; set; }
}

[Table("StoreSettings", Schema = "dbo")]
public class StoreSetting
{
    [Key]
    public int Id { get; set; }
    [Required, MaxLength(150)]
    public string StoreName { get; set; } = "FreshMart Supermarket";
    [Required, MaxLength(50)]
    public string BranchCode { get; set; } = "BR-CMB-001";
    [Required, MaxLength(300)]
    public string StoreAddress { get; set; } = string.Empty;
    [MaxLength(50)]
    public string? Phone { get; set; }
    [MaxLength(150)]
    public string? Email { get; set; }
    [Required, MaxLength(10)]
    public string Currency { get; set; } = "LKR";
    [Column(TypeName = "decimal(5,2)")]
    public decimal DefaultTaxRate { get; set; } = 8.00m;
    public int LowStockThreshold { get; set; } = 20;
    public int LoyaltyPointsPerHundredRs { get; set; } = 1;
    [Required, MaxLength(300)]
    public string ReceiptFooterText { get; set; } = "Thank you for shopping with us!";
    [Required, MaxLength(100)]
    public string ReceiptPrinterName { get; set; } = "EPSON TM-T88VI";
    public bool ReceiptPrinterConnected { get; set; } = true;
    [Required, MaxLength(100)]
    public string BarcodeScannerName { get; set; } = "Symbol LS2208";
    public bool BarcodeScannerConnected { get; set; } = true;
    [Required, MaxLength(100)]
    public string PaymentTerminalName { get; set; } = "Verifone VX520";
    public bool PaymentTerminalConnected { get; set; } = false;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("Categories", Schema = "dbo")]
public class Category
{
    [Key]
    public int Id { get; set; }
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(250)]
    public string? Description { get; set; }
    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Product> Products { get; set; } = new List<Product>();
}

[Table("Products", Schema = "dbo")]
public class Product
{
    [Key]
    public int Id { get; set; }
    [Required, MaxLength(50)]
    public string Sku { get; set; } = string.Empty;
    [Required, MaxLength(100)]
    public string Barcode { get; set; } = string.Empty;
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal CostPrice { get; set; }
    public int Stock { get; set; }
    public int ReorderLevel { get; set; } = 20;
    [Required, MaxLength(20)]
    public string Icon { get; set; } = "📦";
    [Required, MaxLength(100)]
    public string Color { get; set; } = "bg-indigo-100 text-indigo-600";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CategoryId))]
    public Category? Category { get; set; }
}

[Table("Customers", Schema = "dbo")]
public class Customer
{
    [Key]
    public int Id { get; set; }
    [Required, MaxLength(30)]
    public string CustomerCode { get; set; } = string.Empty;
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;
    [Required, MaxLength(150)]
    public string Email { get; set; } = string.Empty;
    [Required, MaxLength(50)]
    public string Phone { get; set; } = string.Empty;
    public int Points { get; set; } = 0;
    [Required, MaxLength(30)]
    public string Tier { get; set; } = "Bronze";
    [Column(TypeName = "decimal(18,2)")]
    public decimal Balance { get; set; } = 0.00m;
    public DateTime LastVisit { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("Discounts", Schema = "dbo")]
public class Discount
{
    [Key]
    public int Id { get; set; }
    [Required, MaxLength(50)]
    public string Code { get; set; } = string.Empty;
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;
    [Required, MaxLength(20)]
    public string DiscountType { get; set; } = "Percentage"; // Percentage or Fixed
    [Column(TypeName = "decimal(18,2)")]
    public decimal Value { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal MinOrderAmount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime ValidFrom { get; set; } = DateTime.UtcNow;
    public DateTime? ValidUntil { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("TillSessions", Schema = "dbo")]
public class TillSession
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal OpeningFloat { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal? ClosingCashCounted { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal? ExpectedCash { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal? Variance { get; set; }
    [Required, MaxLength(20)]
    public string Status { get; set; } = "Open";
    [MaxLength(500)]
    public string? Notes { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}

[Table("Orders", Schema = "dbo")]
public class Order
{
    [Key]
    public int Id { get; set; }
    [Required, MaxLength(40)]
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public int? CustomerId { get; set; }
    [Required, MaxLength(150)]
    public string CustomerName { get; set; } = "Walk-in";
    public int? CashierUserId { get; set; }
    public int? TillSessionId { get; set; }
    public int? DiscountId { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }
    [Column(TypeName = "decimal(5,2)")]
    public decimal TaxRate { get; set; } = 8.00m;
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }
    [Required, MaxLength(100)]
    public string PaymentMethodSummary { get; set; } = "Cash";
    [Column(TypeName = "decimal(18,2)")]
    public decimal? CashTendered { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal ChangeGiven { get; set; }
    public int PointsEarned { get; set; }
    public int PointsRedeemed { get; set; }
    [Required, MaxLength(30)]
    public string Status { get; set; } = "Completed";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CustomerId))]
    public Customer? Customer { get; set; }
    [ForeignKey(nameof(CashierUserId))]
    public User? CashierUser { get; set; }

    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    public ICollection<OrderPayment> OrderPayments { get; set; } = new List<OrderPayment>();
}

[Table("OrderItems", Schema = "dbo")]
public class OrderItem
{
    [Key]
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    [Required, MaxLength(150)]
    public string ProductName { get; set; } = string.Empty;
    [MaxLength(100)]
    public string? Barcode { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal CostPrice { get; set; }
    public int Quantity { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal LineTotal { get; set; }

    [ForeignKey(nameof(OrderId))]
    public Order? Order { get; set; }
    [ForeignKey(nameof(ProductId))]
    public Product? Product { get; set; }
}

[Table("OrderPayments", Schema = "dbo")]
public class OrderPayment
{
    [Key]
    public int Id { get; set; }
    public int OrderId { get; set; }
    [Required, MaxLength(50)]
    public string PaymentMethod { get; set; } = "Cash";
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(OrderId))]
    public Order? Order { get; set; }
}

[Table("Refunds", Schema = "dbo")]
public class Refund
{
    [Key]
    public int Id { get; set; }
    [Required, MaxLength(40)]
    public string RefundNumber { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public int? ProcessedByUserId { get; set; }
    public int? ApprovedByManagerId { get; set; }
    [Required, MaxLength(20)]
    public string RefundType { get; set; } = "Refund";
    [Column(TypeName = "decimal(18,2)")]
    public decimal RefundAmount { get; set; }
    [Required, MaxLength(300)]
    public string Reason { get; set; } = string.Empty;
    public bool RestockItems { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(OrderId))]
    public Order? Order { get; set; }
}

[Table("AuditLogs", Schema = "dbo")]
public class AuditLog
{
    [Key]
    public int Id { get; set; }
    public int? UserId { get; set; }
    [Required, MaxLength(100)]
    public string Username { get; set; } = "System";
    [Required, MaxLength(100)]
    public string Action { get; set; } = string.Empty;
    [Required, MaxLength(100)]
    public string EntityName { get; set; } = string.Empty;
    [MaxLength(100)]
    public string? EntityId { get; set; }
    [MaxLength(1000)]
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

