export type AttendanceStatus = 'IDLE' | 'CLOCKED_IN' | 'CLOCKED_OUT';
export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PayrollStatus = 'SCHEDULED' | 'EXECUTED' | 'CANCELLED';
export type ActorRole = 'Employee' | 'HRAdmin' | 'HangfireScheduler';

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  baseSalary: number;
  bankAccountNumber: string;
  bankName: string;
  taxId: string;
  attendanceStatus: AttendanceStatus;
  annualLeaveBalance: number;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  clockInTime: string;
  clockOutTime?: string;
  latitude: number;
  longitude: number;
  isWithinGeofence: boolean;
  selfieImageBase64?: string;
  verificationStatus: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  createdAt: string;
}

export interface PayrollSlip {
  id: number;
  batchId: number;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  baseSalary: number;
  overtimePay: number;
  grossPay: number;
  ssfDeduction: number;
  taxDeduction: number;
  netPay: number;
  bankCode: string;
  bankAccountNumber: string;
}

export interface PayrollBatch {
  id: number;
  batchPeriod: string;
  totalGross: number;
  totalSsf: number;
  totalTax: number;
  totalNet: number;
  employeeCount: number;
  status: PayrollStatus;
  executedAt?: string;
  bankExportTxt?: string;
  slips: PayrollSlip[];
}
