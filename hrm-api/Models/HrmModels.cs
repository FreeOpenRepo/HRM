namespace hrm_api.Models;

public class Employee
{
    public int Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty; // e.g. EMP-2026-001
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Department { get; set; } = "Engineering";
    public string Position { get; set; } = "Software Engineer";
    
    public decimal BaseSalary { get; set; } = 65000.0m;
    public string BankAccountNumber { get; set; } = "123-4-56789-0";
    public string BankName { get; set; } = "KBANK"; // KBANK, SCB, BBL, KTB
    public string TaxId { get; set; } = "1100500123456";
    
    public AttendanceStatus AttendanceStatus { get; set; } = AttendanceStatus.IDLE;
    public int AnnualLeaveBalance { get; set; } = 15; // Days

    public List<AttendanceRecord> AttendanceRecords { get; set; } = new();
    public List<LeaveRequest> LeaveRequests { get; set; } = new();
}

public class AttendanceRecord
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public DateTime ClockInTime { get; set; } = DateTime.UtcNow;
    public DateTime? ClockOutTime { get; set; }

    // Geofence Coordinate Tracking
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool IsWithinGeofence { get; set; } // Invariant: ClockInWithinGeofenceBoundaryOnly

    // WebRTC Camera Selfie Face Capture
    public string? SelfieImageBase64 { get; set; }
    public string VerificationStatus { get; set; } = "VALID"; // VALID, REJECTED_OUTSIDE_GEOFENCE
}

public class LeaveRequest
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public LeaveType LeaveType { get; set; } = LeaveType.ANNUAL;
    
    // Invariant: NoOverlappingLeaves
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int DaysCount { get; set; } = 1;
    public string Reason { get; set; } = string.Empty;
    
    public LeaveStatus Status { get; set; } = LeaveStatus.PENDING;
    public string? ApprovedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PayrollBatch
{
    public int Id { get; set; }
    public string BatchPeriod { get; set; } = "2026-08"; // YYYY-MM
    public decimal TotalGross { get; set; }
    public decimal TotalSsf { get; set; } // Social Security Fund 5% (Capped at 750 THB/person)
    public decimal TotalTax { get; set; } // Withholding Tax (PND1)
    public decimal TotalNet { get; set; }
    public int EmployeeCount { get; set; }
    
    public PayrollStatus Status { get; set; } = PayrollStatus.SCHEDULED;
    public DateTime? ExecutedAt { get; set; }
    
    // Side-effects
    public string? BankExportTxt { get; set; } // Thai Direct Credit Flat-File format

    public List<PayrollSlip> Slips { get; set; } = new();
}

public class PayrollSlip
{
    public int Id { get; set; }
    public int BatchId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    
    public decimal BaseSalary { get; set; }
    public decimal OvertimePay { get; set; }
    public decimal GrossPay { get; set; }
    public decimal SsfDeduction { get; set; } // 5% max 750
    public decimal TaxDeduction { get; set; } // PND1
    public decimal NetPay { get; set; }
    
    public string BankCode { get; set; } = "004"; // 004=KBANK, 014=SCB, 002=BBL
    public string BankAccountNumber { get; set; } = string.Empty;
}
