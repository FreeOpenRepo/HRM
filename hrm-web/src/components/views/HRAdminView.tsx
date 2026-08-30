import { showSuccess, showError, showInfo, showWarning, showConfirm } from '@/lib/swal';
'use client';

import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, LeaveRequest, PayrollBatch } from '@/lib/types';
import { fetchEmployees, fetchAttendanceRecords, fetchLeaves, approveLeave, executePayroll, fetchPayrollBatches, getBankTxtUrl, getPayslipPdfUrl } from '@/lib/api';
import { Users, MapPin, Calendar, DollarSign, Download, CheckCircle2, AlertOctagon, FileText, RefreshCw, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HRAdminView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [isExecutingPayroll, setIsExecutingPayroll] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState('2026-08');

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    const [empList, attList, leaveList, batchList] = await Promise.all([
      fetchEmployees(),
      fetchAttendanceRecords(),
      fetchLeaves(),
      fetchPayrollBatches()
    ]);
    setEmployees(empList);
    setAttendance(attList);
    setLeaves(leaveList);
    setBatches(batchList);
  }

  async function handleApproveLeave(id: number) {
    try {
      await approveLeave(id, 'HR Admin');
      await loadAllData();
      confetti({ particleCount: 50, spread: 60 });
    } catch (err: any) {
      showInfo('แจ้งเตือนระบบ', 'Approval failed: ' + err.message);
    }
  }

  async function handleExecutePayroll() {
    setIsExecutingPayroll(true);
    try {
      const batch = await executePayroll(payrollPeriod);
      await loadAllData();
      confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
      showInfo('แจ้งเตือนระบบ', `Payroll batch ${batch.batchPeriod} executed successfully for ${batch.employeeCount} employees! Total Net: ${batch.totalNet.toLocaleString()} THB`);
    } catch (err: any) {
      showInfo('แจ้งเตือนระบบ', 'Payroll execution failed: ' + err.message);
    } finally {
      setIsExecutingPayroll(false);
    }
  }

  const pendingLeaves = leaves.filter(l => l.status === 'PENDING');

  return (
    <div style={{ maxWidth: '1500px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users style={{ color: 'var(--accent-cyan)', width: 28, height: 28 }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>HR Admin, Attendance & Payroll Command Desk</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            NetTopologySuite Geofence audit • Leave approval queue • Thai Bank Direct Credit & QuestPDF generator
          </p>
        </div>

        <button onClick={loadAllData} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw style={{ width: 14, height: 14 }} /> Refresh All Records
        </button>
      </div>

      {/* Grid: Leave Approvals & Attendance Audit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', marginBottom: '24px' }}>
        {/* Leave Approvals Queue */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar style={{ width: 18, height: 18, color: 'var(--accent-cyan)' }} />
              Pending Leave Requests ({pendingLeaves.length})
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invariant: NoOverlappingLeaves</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
            {pendingLeaves.map(leave => {
              const emp = employees.find(e => e.id === leave.employeeId);
              return (
                <div key={leave.id} style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{emp?.fullName} ({emp?.department})</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {leave.leaveType} • {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()} ({leave.daysCount} days)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Reason: "{leave.reason}"
                    </div>
                  </div>

                  <button
                    onClick={() => handleApproveLeave(leave.id)}
                    className="btn-success"
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    <CheckCircle2 style={{ width: 14, height: 14 }} /> Approve (APPROVE_LEAVE)
                  </button>
                </div>
              );
            })}
            {pendingLeaves.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No pending leave requests awaiting approval.
              </div>
            )}
          </div>
        </div>

        {/* Attendance Punch-in Audit Logs */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin style={{ width: 18, height: 18, color: 'var(--accent-emerald)' }} />
              Geofence Attendance Punch Logs ({attendance.length})
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NetTopologySuite.Within Check</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
            {attendance.map(att => {
              const emp = employees.find(e => e.id === att.employeeId);
              return (
                <div key={att.id} style={{ padding: '10px 12px', borderRadius: '8px', background: att.isWithinGeofence ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.08)', border: `1px solid ${att.isWithinGeofence ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.3)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{emp?.fullName || `Emp #${att.employeeId}`}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      GPS: {att.latitude.toFixed(4)}, {att.longitude.toFixed(4)} • {new Date(att.clockInTime).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {att.selfieImageBase64 && (
                      <img src={att.selfieImageBase64} alt="Selfie" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: att.isWithinGeofence ? '#34d399' : '#fda4af' }}>
                      {att.verificationStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payroll Batch Execution & Bank Flat-File Desk */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign style={{ width: 22, height: 22, color: 'var(--accent-purple)' }} />
              Monthly Payroll Run (Side-effects: Bank Direct Credit TXT & QuestPDF)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Calculates Social Security Fund (SSF 5% max 750 THB) & Progressive PND1 Withholding Tax
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="month"
              value={payrollPeriod}
              onChange={e => setPayrollPeriod(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
            />
            <button
              onClick={handleExecutePayroll}
              disabled={isExecutingPayroll}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              <Zap style={{ width: 14, height: 14 }} />
              {isExecutingPayroll ? 'Processing Batch...' : 'Run Payroll Batch (CRON_PAYROLL_RUN)'}
            </button>
          </div>
        </div>

        {/* Batches Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Period</th>
                <th style={{ padding: '10px 12px' }}>Employees</th>
                <th style={{ padding: '10px 12px' }}>Total Gross</th>
                <th style={{ padding: '10px 12px' }}>Total SSF (5%)</th>
                <th style={{ padding: '10px 12px' }}>Total Tax (PND1)</th>
                <th style={{ padding: '10px 12px' }}>Total Net Transfer</th>
                <th style={{ padding: '10px 12px' }}>Actions & Artifacts</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px', fontWeight: 700 }} className="font-mono">{b.batchPeriod}</td>
                  <td style={{ padding: '12px' }}>{b.employeeCount} Staff</td>
                  <td style={{ padding: '12px' }} className="font-mono">{b.totalGross.toLocaleString()} ฿</td>
                  <td style={{ padding: '12px', color: 'var(--accent-amber)' }} className="font-mono">{b.totalSsf.toLocaleString()} ฿</td>
                  <td style={{ padding: '12px', color: 'var(--accent-rose)' }} className="font-mono">{b.totalTax.toLocaleString()} ฿</td>
                  <td style={{ padding: '12px', color: 'var(--accent-emerald)', fontWeight: 800 }} className="font-mono">{b.totalNet.toLocaleString()} ฿</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={getBankTxtUrl(b.id)}
                        download
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                      >
                        <Download style={{ width: 12, height: 12 }} /> Bank TXT Flat-File
                      </a>
                      {b.slips && b.slips.length > 0 && (
                        <a
                          href={getPayslipPdfUrl(b.slips[0].id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                        >
                          <FileText style={{ width: 12, height: 12 }} /> QuestPDF Slip
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

