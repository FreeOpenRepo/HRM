using hrm_api.Data;
using hrm_api.Models;
using Microsoft.EntityFrameworkCore;

namespace hrm_api.Services;

public class LeaveService
{
    private readonly HrmDbContext _db;
    private readonly ILogger<LeaveService> _logger;

    public LeaveService(HrmDbContext db, ILogger<LeaveService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<LeaveRequest> SubmitLeaveRequestAsync(
        int employeeId,
        LeaveType leaveType,
        DateTime startDate,
        DateTime endDate,
        string reason)
    {
        var employee = await _db.Employees.FindAsync(employeeId)
            ?? throw new KeyNotFoundException($"Employee {employeeId} not found");

        var start = startDate.Date;
        var end = endDate.Date;

        if (end < start)
        {
            throw new ArgumentException("End date cannot be earlier than start date.");
        }

        // Invariant: NoOverlappingLeaves
        // Check for any active (PENDING or APPROVED) leave that overlaps with [start, end]
        var hasOverlap = await _db.LeaveRequests
            .AnyAsync(l => l.EmployeeId == employeeId &&
                           l.Status != LeaveStatus.REJECTED &&
                           l.StartDate <= end &&
                           l.EndDate >= start);

        if (hasOverlap)
        {
            throw new InvalidOperationException(
                $"Invariant violation [NoOverlappingLeaves]: Employee {employee.FullName} already has a pending or approved leave overlapping with {start:yyyy-MM-dd} to {end:yyyy-MM-dd}."
            );
        }

        var daysCount = (end - start).Days + 1;

        if (leaveType == LeaveType.ANNUAL && employee.AnnualLeaveBalance < daysCount)
        {
            throw new InvalidOperationException($"Insufficient annual leave balance. Requested: {daysCount} days, Available: {employee.AnnualLeaveBalance} days.");
        }

        var leave = new LeaveRequest
        {
            EmployeeId = employeeId,
            LeaveType = leaveType,
            StartDate = start,
            EndDate = end,
            DaysCount = daysCount,
            Reason = reason,
            Status = LeaveStatus.PENDING,
            CreatedAt = DateTime.UtcNow
        };

        _db.LeaveRequests.Add(leave);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Leave request submitted for {Emp} ({Days} days, {Type})", employee.FullName, daysCount, leaveType);
        return leave;
    }

    // State Transition: PENDING -> APPROVED (Trigger: APPROVE_LEAVE)
    public async Task<LeaveRequest> ApproveLeaveAsync(int leaveId, string approvedBy)
    {
        var leave = await _db.LeaveRequests.FindAsync(leaveId)
            ?? throw new KeyNotFoundException($"Leave request {leaveId} not found");

        if (leave.Status == LeaveStatus.APPROVED)
            return leave;

        var employee = await _db.Employees.FindAsync(leave.EmployeeId)
            ?? throw new KeyNotFoundException($"Employee {leave.EmployeeId} not found");

        leave.Status = LeaveStatus.APPROVED;
        leave.ApprovedBy = approvedBy;

        if (leave.LeaveType == LeaveType.ANNUAL)
        {
            employee.AnnualLeaveBalance = Math.Max(0, employee.AnnualLeaveBalance - leave.DaysCount);
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Leave #{Id} approved by {Admin}. Employee {Emp} remaining balance: {Bal} days",
            leave.Id, approvedBy, employee.FullName, employee.AnnualLeaveBalance);

        return leave;
    }
}
