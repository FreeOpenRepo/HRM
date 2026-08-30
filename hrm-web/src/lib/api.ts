import { Employee, AttendanceRecord, LeaveRequest, LeaveType, PayrollBatch } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5060';

export async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch(`${API_BASE}/api/employees`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchEmployeeById(id: number): Promise<Employee> {
  const res = await fetch(`${API_BASE}/api/employees/${id}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function clockIn(payload: {
  employeeId: number;
  latitude: number;
  longitude: number;
  selfieImageBase64?: string;
}): Promise<{ message: string; record: AttendanceRecord }> {
  const res = await fetch(`${API_BASE}/api/attendance/clock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Clock-in rejected' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function clockOut(employeeId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/attendance/clock-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId })
  });

  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchAttendanceRecords(): Promise<AttendanceRecord[]> {
  const res = await fetch(`${API_BASE}/api/attendance/records`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchLeaves(): Promise<LeaveRequest[]> {
  const res = await fetch(`${API_BASE}/api/leaves`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function submitLeave(payload: {
  employeeId: number;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<LeaveRequest> {
  const res = await fetch(`${API_BASE}/api/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Leave request failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function approveLeave(id: number, approvedBy?: string): Promise<LeaveRequest> {
  const res = await fetch(`${API_BASE}/api/leaves/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy })
  });

  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function executePayroll(period?: string): Promise<PayrollBatch> {
  const res = await fetch(`${API_BASE}/api/payroll/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Payroll execution failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function fetchPayrollBatches(): Promise<PayrollBatch[]> {
  const res = await fetch(`${API_BASE}/api/payroll/batches`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export function getBankTxtUrl(batchId: number): string {
  return `${API_BASE}/api/payroll/batches/${batchId}/bank-txt`;
}

export function getPayslipPdfUrl(slipId: number): string {
  return `${API_BASE}/api/payroll/slips/${slipId}/pdf`;
}
