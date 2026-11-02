/* ============================================================================
   POS MANAGEMENT SYSTEM - CLEAR ALL DATA SCRIPT (SQL SERVER)
   Database Name : PosManagementDb
   Description   : Deletes all records from all tables in proper foreign-key
                   order and reseeds all identity columns back to 0.
   ============================================================================ */

USE [PosManagementDb];
GO

SET NOCOUNT ON;
BEGIN TRANSACTION;

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

COMMIT TRANSACTION;
PRINT 'All data cleared from PosManagementDb.';
GO
