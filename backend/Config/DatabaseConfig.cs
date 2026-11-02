using Microsoft.EntityFrameworkCore;

namespace PosSystem.Api.Config;

/// <summary>
/// Dedicated database configuration file for managing the local SQL Server connection.
/// You can change the connection string in "backend/dbconfig.json" or directly via the FallbackConnectionString below.
/// </summary>
public class DatabaseConfig
{
    public const string SectionName = "DatabaseConfig";

    /// <summary>
    /// Fallback connection string if dbconfig.json is not provided.
    /// Change this or edit backend/dbconfig.json to point to your SQL Server instance.
    /// </summary>
    public const string FallbackConnectionString =
        "Server=localhost;Database=PosManagementDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True;";

    public string ConnectionString { get; set; } = FallbackConnectionString;
    public int CommandTimeoutSeconds { get; set; } = 30;
    public bool EnableSensitiveDataLogging { get; set; } = false;

    public static DatabaseConfig LoadAndRegister(WebApplicationBuilder builder)
    {
        // Load the dedicated dbconfig.json file
        builder.Configuration.AddJsonFile("dbconfig.json", optional: true, reloadOnChange: true);

        var dbConfig = builder.Configuration
            .GetSection(SectionName)
            .Get<DatabaseConfig>() ?? new DatabaseConfig();

        // Allow override via ConnectionStrings:DefaultConnection if present
        var altConn = builder.Configuration.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrWhiteSpace(altConn))
        {
            dbConfig.ConnectionString = altConn;
        }

        if (string.IsNullOrWhiteSpace(dbConfig.ConnectionString))
        {
            dbConfig.ConnectionString = FallbackConnectionString;
        }

        builder.Services.AddSingleton(dbConfig);

        builder.Services.AddDbContext<Data.PosDbContext>(options =>
        {
            options.UseSqlServer(dbConfig.ConnectionString, sqlOptions =>
            {
                sqlOptions.CommandTimeout(dbConfig.CommandTimeoutSeconds);
            });

            if (dbConfig.EnableSensitiveDataLogging)
            {
                options.EnableSensitiveDataLogging();
            }
        });

        return dbConfig;
    }
}
