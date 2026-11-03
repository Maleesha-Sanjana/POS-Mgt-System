/* ============================================================================
   POS MANAGEMENT SYSTEM - AUTHENTICATION, ROLES & USERS SCRIPT (SQL SERVER)
   Database Name : PosManagementDb
   Description   : Configures Role-Based Access Control (RBAC) and provisions
                   default user accounts for Cashier, Store Manager, and Administrator.
   ============================================================================ */

USE [PosManagementDb];
GO

SET NOCOUNT ON;
BEGIN TRANSACTION;

/* ----------------------------------------------------------------------------
   1. ENSURE ROLES TABLE & POPULATE THE 3 REQUIRED ROLES
      - Cashier
      - Store Manager (Manager)
      - Administrator
   ---------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        Id          INT IDENTITY(1,1) NOT NULL,
        Name        NVARCHAR(50)      NOT NULL,
        Description NVARCHAR(250)     NULL,
        CONSTRAINT PK_Roles PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Roles_Name UNIQUE (Name)
    );
END
GO

-- Upsert Roles
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = N'Administrator')
BEGIN
    INSERT INTO dbo.Roles (Name, Description)
    VALUES (N'Administrator', N'Full system access: staff management, store settings, peripherals, and security audit logs.');
END
ELSE
BEGIN
    UPDATE dbo.Roles 
    SET Description = N'Full system access: staff management, store settings, peripherals, and security audit logs.'
    WHERE Name = N'Administrator';
END

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = N'Store Manager')
BEGIN
    -- Check if legacy 'Manager' exists and update it, otherwise insert
    IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = N'Manager')
    BEGIN
        UPDATE dbo.Roles 
        SET Name = N'Store Manager',
            Description = N'Store management: inventory, categories, pricing, customer loyalty, reports, and manager refunds.'
        WHERE Name = N'Manager';
    END
    ELSE
    BEGIN
        INSERT INTO dbo.Roles (Name, Description)
        VALUES (N'Store Manager', N'Store management: inventory, categories, pricing, customer loyalty, reports, and manager refunds.');
    END
END
ELSE
BEGIN
    UPDATE dbo.Roles 
    SET Description = N'Store management: inventory, categories, pricing, customer loyalty, reports, and manager refunds.'
    WHERE Name = N'Store Manager';
END

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = N'Cashier')
BEGIN
    INSERT INTO dbo.Roles (Name, Description)
    VALUES (N'Cashier', N'POS terminal operations: till sessions, fast checkout, cash/card tendering, and receipt printing.');
END
ELSE
BEGIN
    UPDATE dbo.Roles 
    SET Description = N'POS terminal operations: till sessions, fast checkout, cash/card tendering, and receipt printing.'
    WHERE Name = N'Cashier';
END
GO

/* ----------------------------------------------------------------------------
   2. ENSURE USERS TABLE & UPSERT DEFAULT STAFF ACCOUNTS
      Default Password for all seed users: Demo@123
   ---------------------------------------------------------------------------- */
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
        CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
        LastLoginAt  DATETIME2         NULL,
        CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Users_Username UNIQUE (Username),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles (Id)
    );
END
GO

DECLARE @AdminRoleId INT = (SELECT TOP 1 Id FROM dbo.Roles WHERE Name = N'Administrator');
DECLARE @ManagerRoleId INT = (SELECT TOP 1 Id FROM dbo.Roles WHERE Name IN (N'Store Manager', N'Manager'));
DECLARE @CashierRoleId INT = (SELECT TOP 1 Id FROM dbo.Roles WHERE Name = N'Cashier');

-- 1. Administrator Account (admin / Demo@123)
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'admin')
BEGIN
    INSERT INTO dbo.Users (Username, FullName, Email, PasswordHash, RoleId, IsActive, CreatedAt)
    VALUES (N'admin', N'Denuka Jayasundara', N'denuka.admin@freshmart.lk', N'SHA256:Demo@123', @AdminRoleId, 1, SYSUTCDATETIME());
END
ELSE
BEGIN
    UPDATE dbo.Users 
    SET RoleId = @AdminRoleId, 
        PasswordHash = N'SHA256:Demo@123',
        IsActive = 1
    WHERE Username = N'admin';
END

-- 2. Store Manager Account (manager / Demo@123)
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'manager')
BEGIN
    INSERT INTO dbo.Users (Username, FullName, Email, PasswordHash, RoleId, IsActive, CreatedAt)
    VALUES (N'manager', N'Kasun Perera', N'kasun.manager@freshmart.lk', N'SHA256:Demo@123', @ManagerRoleId, 1, SYSUTCDATETIME());
END
ELSE
BEGIN
    UPDATE dbo.Users 
    SET RoleId = @ManagerRoleId, 
        PasswordHash = N'SHA256:Demo@123',
        IsActive = 1
    WHERE Username = N'manager';
END

-- 3. Cashier Account (cashier1 / Demo@123)
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'cashier1')
BEGIN
    INSERT INTO dbo.Users (Username, FullName, Email, PasswordHash, RoleId, IsActive, CreatedAt)
    VALUES (N'cashier1', N'Nimali Silva', N'nimali.cashier@freshmart.lk', N'SHA256:Demo@123', @CashierRoleId, 1, SYSUTCDATETIME());
END
ELSE
BEGIN
    UPDATE dbo.Users 
    SET RoleId = @CashierRoleId, 
        PasswordHash = N'SHA256:Demo@123',
        IsActive = 1
    WHERE Username = N'cashier1';
END

COMMIT TRANSACTION;
GO

/* ----------------------------------------------------------------------------
   3. VERIFICATION QUERY
   ---------------------------------------------------------------------------- */
SELECT 
    u.Id AS UserId,
    u.Username,
    u.FullName,
    u.Email,
    r.Name AS RoleName,
    r.Description AS RolePermissions,
    u.IsActive,
    u.CreatedAt,
    u.LastLoginAt
FROM dbo.Users u
INNER JOIN dbo.Roles r ON u.RoleId = r.Id
ORDER BY u.Id ASC;
GO

