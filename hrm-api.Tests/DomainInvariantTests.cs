using hrm_api.Data;
using hrm_api.Models;
using hrm_api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace hrm_api.Tests;

public class DomainInvariantTests
{
    private HrmDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<HrmDbContext>()
            .UseInMemoryDatabase(databaseName: $"HrmTestDb_{Guid.NewGuid()}")
            .Options;

        var db = new HrmDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    [Fact]
    public void Invariant_ClockInWithinGeofenceBoundaryOnly_ValidatesNetTopologySuiteBoundary()
    {
        var geofence = new GeofenceService();

        // Inside HQ boundary (13.7563, 100.5018)
        bool inside = geofence.IsWithinGeofence(13.7563, 100.5018);
        Assert.True(inside, "HQ coordinates must be within authorized geofence boundary");

        // Coordinates far outside (e.g. Chiang Mai 18.7883, 98.9853)
        bool outside = geofence.IsWithinGeofence(18.7883, 98.9853);
        Assert.False(outside, "Coordinates outside office perimeter must be rejected by invariant");
    }

    [Fact]
    public async Task Invariant_NoOverlappingLeaves_RejectsOverlappingLeaveDates()
    {
        using var db = CreateInMemoryDbContext();
        var leaveService = new LeaveService(db, NullLogger<LeaveService>.Instance);

        // Employee 1 has approved leave from (UtcNow - 10 days) to (UtcNow - 9 days)
        var existing = await db.LeaveRequests.FirstOrDefaultAsync(l => l.EmployeeId == 1);
        Assert.NotNull(existing);

        // Attempting to submit another leave that overlaps with the existing date range
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            leaveService.SubmitLeaveRequestAsync(
                1,
                LeaveType.SICK,
                existing.StartDate,
                existing.EndDate,
                "Overlapping doctor appointment"
            )
        );

        Assert.Contains("NoOverlappingLeaves", ex.Message);
    }

    [Fact]
    public async Task StateTransitions_ExecutePayrollBatch_GeneratesBankTxtAndQuestPdfPayslip()
    {
        using var db = CreateInMemoryDbContext();
        var payrollService = new PayrollService(db, NullLogger<PayrollService>.Instance);

        var batch = await payrollService.ExecutePayrollBatchAsync("2026-08");

        Assert.NotNull(batch);
        Assert.Equal(PayrollStatus.EXECUTED, batch.Status);
        Assert.Equal(4, batch.EmployeeCount);
        Assert.True(batch.TotalNet > 0);

        // Side-effect 1: Bank Flat-File TXT generated
        Assert.NotNull(batch.BankExportTxt);
        Assert.Contains("H|004|BATCH-2026-08|", batch.BankExportTxt);
        Assert.Contains("D|EMP-2026-001|", batch.BankExportTxt);
        Assert.Contains("T|4|", batch.BankExportTxt);

        // Side-effect 2: QuestPDF Payslip binary generated
        var firstSlip = batch.Slips[0];
        var pdfBytes = payrollService.GeneratePayslipPdf(firstSlip, "2026-08");
        Assert.NotNull(pdfBytes);
        Assert.True(pdfBytes.Length > 1000, "QuestPDF must generate valid PDF byte stream");
    }
}
