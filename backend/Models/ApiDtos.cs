namespace PosSystem.Api.Models;

public record ProductDto(
    int Id,
    string Sku,
    string Barcode,
    string Name,
    int CategoryId,
    string Category,
    decimal Price,
    decimal CostPrice,
    int Stock,
    int ReorderLevel,
    string Icon,
    string Color,
    bool IsActive
);

public record UpsertProductRequest(
    string? Sku,
    string? Barcode,
    string Name,
    string Category,
    decimal Price,
    decimal CostPrice,
    int? Stock,
    int ReorderLevel,
    string? Icon,
    string? Color
);

public record CategoryDto(
    int Id,
    string Name,
    string? Description,
    int DisplayOrder
);

public record CreateCategoryRequest(
    string Name,
    string? Description
);

public record CustomerDto(
    string Id,
    int DbId,
    string Name,
    string Email,
    string Phone,
    int Points,
    string Tier,
    decimal Balance,
    DateTime LastVisit
);

public record UpsertCustomerRequest(
    string Name,
    string Email,
    string Phone,
    int? Points,
    decimal? Balance
);

public record DiscountDto(
    int Id,
    string Code,
    string Name,
    string DiscountType,
    decimal Value,
    decimal MinOrderAmount,
    bool IsActive
);

public record OrderItemDto(
    int Id,
    int ProductId,
    string Name,
    decimal Price,
    int Quantity,
    decimal LineTotal
);

public record OrderPaymentDto(
    string Method,
    decimal Amount,
    string? ReferenceNumber
);

public record OrderDto(
    string Id,
    int DbId,
    DateTime Date,
    string Customer,
    int? CustomerId,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal Tax,
    decimal Total,
    string Method,
    string Status,
    int Items,
    decimal? CashTendered,
    decimal Change,
    int PointsEarned,
    List<OrderItemDto> CartItems,
    List<OrderPaymentDto> Payments
);

public record CreateOrderItemRequest(
    int Id,
    string Name,
    decimal Price,
    int Quantity
);

public record CreateOrderPaymentRequest(
    string Method,
    decimal Amount,
    string? ReferenceNumber
);

public record CreateOrderRequest(
    string? CustomerCode,
    int? CashierUserId,
    string? DiscountCode,
    string Method,
    decimal? CashTendered,
    decimal? Change,
    List<CreateOrderItemRequest> CartItems,
    List<CreateOrderPaymentRequest> Payments
);

public record RefundOrderRequest(
    string Reason,
    bool RestockItems = true,
    int? ApprovedByManagerId = null
);

public record LoginRequest(
    string Username,
    string Password
);

public record UserDto(
    int Id,
    string Username,
    string FullName,
    string Email,
    string Role,
    int RoleId,
    bool IsActive,
    DateTime? LastLoginAt
);

public record CreateUserRequest(
    string Username,
    string FullName,
    string Email,
    string Password,
    string Role
);

public record StockAdjustmentDto(
    int Id,
    string NoteNumber,
    string NoteType,
    int ProductId,
    string ProductName,
    string Sku,
    int PreviousStock,
    int QuantityChange,
    int NewStock,
    string? BatchReference,
    string? Remarks,
    string CreatedByUsername,
    DateTime CreatedAt
);

public record StockAdjustmentLineRequest(
    int ProductId,
    int Quantity
);

public record CreateStockAdjustmentRequest(
    string NoteType,
    string? BatchReference,
    string? Remarks,
    int? UserId,
    string? Username,
    string? UserRole,
    List<StockAdjustmentLineRequest> Items
);

