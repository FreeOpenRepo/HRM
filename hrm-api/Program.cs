using Hangfire;
using Hangfire.MemoryStorage;
using hrm_api.Data;
using hrm_api.Models;
using hrm_api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:5060");

// Add OpenApi
builder.Services.AddOpenApi();

// Hangfire In-Memory Scheduler
builder.Services.AddHangfire(config =>
{
    config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
          .UseSimpleAssemblyNameTypeSerializer()
          .UseRecommendedSerializerSettings()
          .UseMemoryStorage();
});
builder.Services.AddHangfireServer();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure Database: PostgreSQL if connection string is set, else InMemory
var postgresConn = builder.Configuration.GetConnectionString("PostgresConnection");
if (!string.IsNullOrEmpty(postgresConn))
{
    builder.Services.AddDbContext<HrmDbContext>(opt =>
        opt.UseNpgsql(postgresConn, o => o.UseNetTopologySuite()));
}
else
{
    builder.Services.AddDbContext<HrmDbContext>(opt =>
        opt.UseInMemoryDatabase("HrmInMemoryDb"));
}

builder.Services.AddSingleton<GeofenceService>();
builder.Services.AddScoped<LeaveService>();
builder.Services.AddScoped<PayrollService>();

var app = builder.Build();

// Ensure Database is Created
app.Lifetime.ApplicationStarted.Register(async () =>
{
    for (int i = 0; i < 5; i++)
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HrmDbContext>();
            await db.Database.EnsureCreatedAsync();
            app.Logger.LogInformation("HRM Database connected and verified successfully.");
            break;
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning("HRM DB initialization attempt {Attempt} failed: {Message}. Retrying...", i + 1, ex.Message);
            await Task.Delay(2000);
        }
    }
});

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    DashboardTitle = "HRM & Payroll Engine Hangfire Scheduler"
});

// Schedule Monthly Payroll Recurring Job (Cron: 28th of every month)
RecurringJob.AddOrUpdate<PayrollService>(
    "monthly-payroll-run",
    service => service.ExecutePayrollBatchAsync(DateTime.UtcNow.ToString("yyyy-MM")),
    "0 18 28 * *" // 18:00 on the 28th of every month
);

// Health Check
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    system = "03_HRM_PAYROLL_ENGINE",
    timestamp = DateTime.UtcNow,
    engine = ".NET 10 + NetTopologySuite + QuestPDF + ClosedXML + Hangfire + EF Core 10"
}));

// Employees Endpoints
app.MapGet("/api/employees", async (HrmDbContext db) =>
{
    var list = await db.Employees.ToListAsync();
    return Results.Ok(list);
});

app.MapGet("/api/employees/{id:int}", async (int id, HrmDbContext db) =>
{
    var emp = await db.Employees
        .Include(e => e.AttendanceRecords)
        .Include(e => e.LeaveRequests)
        .FirstOrDefaultAsync(e => e.Id == id);
    return emp != null ? Results.Ok(emp) : Results.NotFound();
});

// 1. Attendance Clock-in (Invariant: ClockInWithinGeofenceBoundaryOnly)
app.MapPost("/api/attendance/clock-in", async (ClockInDto dto, HrmDbContext db, GeofenceService geofence) =>
{
    var employee = await db.Employees.FindAsync(dto.EmployeeId);
    if (employee == null) return Results.NotFound(new { error = "Employee not found" });

    // Validation: NetTopologySuite.Within(Coords, Polygon)
    bool isInside = geofence.IsWithinGeofence(dto.Latitude, dto.Longitude);
    if (!isInside)
    {
        var recordRejected = new AttendanceRecord
        {
            EmployeeId = dto.EmployeeId,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            IsWithinGeofence = false,
            SelfieImageBase64 = dto.SelfieImageBase64,
            VerificationStatus = "REJECTED_OUTSIDE_GEOFENCE",
            ClockInTime = DateTime.UtcNow
        };
        db.AttendanceRecords.Add(recordRejected);
        await db.SaveChangesAsync();

        return Results.BadRequest(new
        {
            error = "Invariant violation [ClockInWithinGeofenceBoundaryOnly]: Clock-in coordinates are outside authorized company geofence boundary.",
            userCoords = new { dto.Latitude, dto.Longitude },
            hqCoords = new { geofence.HqLatitude, geofence.HqLongitude },
            distanceMeters = geofence.CalculateDistanceMeters(dto.Latitude, dto.Longitude, geofence.HqLatitude, geofence.HqLongitude)
        });
    }

    employee.AttendanceStatus = AttendanceStatus.CLOCKED_IN;

    var record = new AttendanceRecord
    {
        EmployeeId = dto.EmployeeId,
        Latitude = dto.Latitude,
        Longitude = dto.Longitude,
        IsWithinGeofence = true,
        SelfieImageBase64 = dto.SelfieImageBase64,
        VerificationStatus = "VALID",
        ClockInTime = DateTime.UtcNow
    };

    db.AttendanceRecords.Add(record);
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        message = $"Clock-in verified within geofence for {employee.FullName}!",
        record
    });
});

app.MapPost("/api/attendance/clock-out", async (ClockOutDto dto, HrmDbContext db) =>
{
    var employee = await db.Employees.FindAsync(dto.EmployeeId);
    if (employee == null) return Results.NotFound();

    employee.AttendanceStatus = AttendanceStatus.IDLE;
    var lastRecord = await db.AttendanceRecords
        .Where(a => a.EmployeeId == dto.EmployeeId && a.ClockOutTime == null && a.IsWithinGeofence)
        .OrderByDescending(a => a.ClockInTime)
        .FirstOrDefaultAsync();

    if (lastRecord != null)
    {
        lastRecord.ClockOutTime = DateTime.UtcNow;
    }

    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Clocked out successfully" });
});

app.MapGet("/api/attendance/records", async (HrmDbContext db) =>
{
    var records = await db.AttendanceRecords.OrderByDescending(r => r.ClockInTime).Take(50).ToListAsync();
    return Results.Ok(records);
});

// 2. Leave Management (Invariant: NoOverlappingLeaves)
app.MapGet("/api/leaves", async (HrmDbContext db) =>
{
    var leaves = await db.LeaveRequests.OrderByDescending(l => l.CreatedAt).ToListAsync();
    return Results.Ok(leaves);
});

app.MapPost("/api/leaves", async (SubmitLeaveDto dto, LeaveService service) =>
{
    try
    {
        var leave = await service.SubmitLeaveRequestAsync(
            dto.EmployeeId,
            dto.LeaveType,
            dto.StartDate,
            dto.EndDate,
            dto.Reason
        );
        return Results.Created($"/api/leaves/{leave.Id}", leave);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPost("/api/leaves/{id:int}/approve", async (int id, ApproveLeaveDto dto, LeaveService service) =>
{
    try
    {
        var leave = await service.ApproveLeaveAsync(id, dto.ApprovedBy ?? "HR Admin");
        return Results.Ok(leave);
    }
    catch (KeyNotFoundException)
    {
        return Results.NotFound();
    }
});

// 3. Payroll Execution & Exports (CRON_PAYROLL_RUN / ExecuteBatch)
app.MapPost("/api/payroll/execute", async (ExecutePayrollDto dto, PayrollService service) =>
{
    try
    {
        var period = dto.Period ?? DateTime.UtcNow.ToString("yyyy-MM");
        var batch = await service.ExecutePayrollBatchAsync(period);
        return Results.Ok(batch);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapGet("/api/payroll/batches", async (HrmDbContext db) =>
{
    var batches = await db.PayrollBatches
        .Include(b => b.Slips)
        .OrderByDescending(b => b.ExecutedAt)
        .ToListAsync();
    return Results.Ok(batches);
});

// Side-effect 1: Download Bank Flat-File TXT
app.MapGet("/api/payroll/batches/{id:int}/bank-txt", async (int id, HrmDbContext db) =>
{
    var batch = await db.PayrollBatches.FindAsync(id);
    if (batch == null || string.IsNullOrEmpty(batch.BankExportTxt))
    {
        return Results.NotFound();
    }

    var bytes = System.Text.Encoding.UTF8.GetBytes(batch.BankExportTxt);
    return Results.File(bytes, "text/plain", $"payroll-bank-export-{batch.BatchPeriod}.txt");
});

// Side-effect 2: Download QuestPDF Payslip
app.MapGet("/api/payroll/slips/{id:int}/pdf", async (int id, HrmDbContext db, PayrollService service) =>
{
    var slip = await db.PayrollSlips.FindAsync(id);
    if (slip == null) return Results.NotFound();

    var batch = await db.PayrollBatches.FindAsync(slip.BatchId);
    var period = batch?.BatchPeriod ?? DateTime.UtcNow.ToString("yyyy-MM");

    var pdfBytes = service.GeneratePayslipPdf(slip, period);
    return Results.File(pdfBytes, "application/pdf", $"payslip-{slip.EmployeeCode}-{period}.pdf");
});

app.Run();

public record ClockInDto(int EmployeeId, double Latitude, double Longitude, string? SelfieImageBase64);
public record ClockOutDto(int EmployeeId);
public record SubmitLeaveDto(int EmployeeId, LeaveType LeaveType, DateTime StartDate, DateTime EndDate, string Reason);
public record ApproveLeaveDto(string? ApprovedBy);
public record ExecutePayrollDto(string? Period);


