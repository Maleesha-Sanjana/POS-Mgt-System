/* ============================================================================
   POS MANAGEMENT SYSTEM - GOODS RECEIVED FROM PRODUCTION (GRN) & STOCK ADJUSTMENT
   Database Name : PosManagementDb
   Description   : Creates dbo.StockAdjustmentNotes for Goods Received from
                   Production (GRN) and Stock Adjustment Notes (Admin Exclusive).
   ============================================================================ */

USE [PosManagementDb];
GO

IF OBJECT_ID('dbo.StockAdjustmentNotes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockAdjustmentNotes (
        Id                INT IDENTITY(1,1) NOT NULL,
        NoteNumber        NVARCHAR(40)      NOT NULL,
        NoteType          NVARCHAR(60)      NOT NULL, -- 'Goods Received from Production (GRN)', 'Stock Adjustment (+)', 'Stock Adjustment (-)'
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
END
GO

