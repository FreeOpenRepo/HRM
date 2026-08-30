namespace hrm_api.Models;

public enum AttendanceStatus
{
    IDLE,
    CLOCKED_IN,
    CLOCKED_OUT
}

public enum LeaveType
{
    ANNUAL,
    SICK,
    PERSONAL,
    MATERNITY
}

public enum LeaveStatus
{
    PENDING,
    APPROVED,
    REJECTED
}

public enum PayrollStatus
{
    SCHEDULED,
    EXECUTED,
    CANCELLED
}

public enum ActorRole
{
    Employee,
    HRAdmin,
    HangfireScheduler
}
