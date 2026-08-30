using Microsoft.EntityFrameworkCore;
using hrm_api.Models;

namespace hrm_api.Data;

public class HrmDbContext : DbContext
{
    public HrmDbContext(DbContextOptions<HrmDbContext> options) : base(options)
    {
    }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<PayrollBatch> PayrollBatches => Set<PayrollBatch>();
    public DbSet<PayrollSlip> PayrollSlips => Set<PayrollSlip>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Seed 4 initial employees across departments
        modelBuilder.Entity<Employee>().HasData(
            new Employee
            {
                Id = 1,
                EmployeeCode = "EMP-2026-001",
                FullName = "Supachai Tantrakul",
                Email = "supachai@freeopenrepo.com",
                Phone = "+66 81 234 5678",
                Department = "Engineering",
                Position = "Lead Micro-Engine Architect",
                BaseSalary = 95000.0m,
                BankAccountNumber = "789-2-34567-1",
                BankName = "KBANK",
                TaxId = "1100500987654",
                AttendanceStatus = AttendanceStatus.IDLE,
                AnnualLeaveBalance = 14
            },
            new Employee
            {
                Id = 2,
                EmployeeCode = "EMP-2026-002",
                FullName = "Narumol Srisawat",
                Email = "narumol@freeopenrepo.com",
                Phone = "+66 89 876 5432",
                Department = "Accounting & Finance",
                Position = "Senior Financial Controller",
                BaseSalary = 78000.0m,
                BankAccountNumber = "456-1-89012-3",
                BankName = "SCB",
                TaxId = "1100500876543",
                AttendanceStatus = AttendanceStatus.IDLE,
                AnnualLeaveBalance = 12
            },
            new Employee
            {
                Id = 3,
                EmployeeCode = "EMP-2026-003",
                FullName = "Anan Phong",
                Email = "anan@freeopenrepo.com",
                Phone = "+66 86 555 7788",
                Department = "Operations & CMMS",
                Position = "Senior Facilities Engineer",
                BaseSalary = 58000.0m,
                BankAccountNumber = "123-0-67890-4",
                BankName = "BBL",
                TaxId = "1100500765432",
                AttendanceStatus = AttendanceStatus.IDLE,
                AnnualLeaveBalance = 15
            },
            new Employee
            {
                Id = 4,
                EmployeeCode = "EMP-2026-004",
                FullName = "Maya Lin",
                Email = "maya.lin@freeopenrepo.com",
                Phone = "+66 82 444 3322",
                Department = "Customer Support",
                Position = "Helpdesk Support Lead",
                BaseSalary = 52000.0m,
                BankAccountNumber = "234-5-67890-1",
                BankName = "KBANK",
                TaxId = "1100500654321",
                AttendanceStatus = AttendanceStatus.IDLE,
                AnnualLeaveBalance = 10
            }
        );

        // Seed an approved leave
        modelBuilder.Entity<LeaveRequest>().HasData(
            new LeaveRequest
            {
                Id = 1,
                EmployeeId = 1,
                LeaveType = LeaveType.ANNUAL,
                StartDate = DateTime.UtcNow.AddDays(-10).Date,
                EndDate = DateTime.UtcNow.AddDays(-9).Date,
                DaysCount = 2,
                Reason = "Family vacation in Chiang Mai",
                Status = LeaveStatus.APPROVED,
                ApprovedBy = "HR Director",
                CreatedAt = DateTime.UtcNow.AddDays(-15)
            }
        );
    }
}
