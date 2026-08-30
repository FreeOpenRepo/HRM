import { showSuccess, showError, showInfo, showWarning, showยืนยัน } from '@/lib/swal';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Employee, LeaveType } from '@/lib/types';
import { fetchEmployees, clockIn, clockOut, submitLeave, getPayslipPdfUrl } from '@/lib/api';
import { UserCheck, MapPin, Camera, Calendar, FileText, CheckCircle2, AlertOctagon, Clock, RefreshCw, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function EmployeeView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  const [isClocking, setIsClocking] = useState(false);

  // GPS Simulation state (HQ vs Outside)
  const [latitude, setLatitude] = useState(13.7563);
  const [longitude, setLongitude] = useState(100.5018);
  const [locationPreset, setLocationPreset] = useState<'HQ_OFFICE' | 'OUTSIDE_REMOTE'>('HQ_OFFICE');

  // WebRTC Selfie Face Capture Canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Leave Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Personal family errands');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const list = await fetchEmployees();
    setEmployees(list);
    if (list.length > 0 && !currentEmp) {
      setCurrentEmp(list[0]);
    }
  }

  function handlePresetChange(preset: 'HQ_OFFICE' | 'OUTSIDE_REMOTE') {
    setLocationPreset(preset);
    if (preset === 'HQ_OFFICE') {
      setLatitude(13.7563);
      setLongitude(100.5018);
    } else {
      // Chiang Mai remote coordinates far outside geofence
      setLatitude(18.7883);
      setLongitude(98.9853);
    }
  }

  async function startCamera() {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // Fallback synthetic base64 avatar
      setSelfieBase64('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%2306b6d4"/><text x="50" y="55" font-size="30" fill="white" text-anchor="middle">👤</text></svg>');
    }
  }

  function captureSnapshot() {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 160, 120);
        setSelfieBase64(canvas.toDataURL('image/jpeg'));
      }
    }
  }

  async function handleClockIn() {
    if (!currentEmp) return;
    setIsClocking(true);
    try {
      const res = await clockIn({
        employeeId: currentEmp.id,
        latitude,
        longitude,
        selfieImageBase64: selfieBase64 || undefined
      });

      showInfo('แจ้งเตือนระบบ', res.message);
      await loadData();
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      showInfo('แจ้งเตือนระบบ', 'Clock-In Rejected: ' + err.message);
    } finally {
      setIsClocking(false);
    }
  }

  async function handleClockOut() {
    if (!currentEmp) return;
    try {
      await clockOut(currentEmp.id);
      showInfo('แจ้งเตือนระบบ', 'Clocked out successfully!');
      await loadData();
    } catch (err: any) {
      showInfo('แจ้งเตือนระบบ', 'Clock-out failed: ' + err.message);
    }
  }

  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEmp) return;
    setIsSubmittingLeave(true);
    try {
      await submitLeave({
        employeeId: currentEmp.id,
        leaveType,
        startDate,
        endDate,
        reason
      });

      showInfo('แจ้งเตือนระบบ', 'Leave request submitted successfully for manager approval!');
      await loadData();
      confetti({ particleCount: 40, spread: 50 });
    } catch (err: any) {
      showInfo('แจ้งเตือนระบบ', 'Leave submission rejected: ' + err.message);
    } finally {
      setIsSubmittingLeave(false);
    }
  }

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      {/* Top Header & Employee Selector */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck style={{ color: 'var(--accent-emerald)', width: 28, height: 28 }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Employee Self-Service & Attendance Desk</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            GPS Geofence NetTopologySuite verification • WebRTC selfie camera • Leave balance tracker
          </p>
        </div>

        {/* Employee Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logged in as:</label>
          <select
            value={currentEmp?.id || ''}
            onChange={e => {
              const found = employees.find(x => x.id === Number(e.target.value));
              if (found) setCurrentEmp(found);
            }}
            style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id} style={{ background: '#0f172a' }}>
                {emp.fullName} ({emp.employeeCode} - {emp.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentEmp && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: GPS Geofenced Attendance Punch-in */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin style={{ width: 20, height: 20, color: 'var(--accent-emerald)' }} />
              Geofenced Attendance Clock-In
            </h2>

            {/* สถานะ Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current สถานะ:</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: currentEmp.attendanceสถานะ === 'CLOCKED_IN' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {currentEmp.attendanceสถานะ}
                </div>
              </div>
              <span className={`badge-${currentEmp.attendanceสถานะ.toLowerCase()}`} style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
                {currentEmp.attendanceสถานะ}
              </span>
            </div>

            {/* GPS Simulation Location Preset */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                GPS Location Simulation (NetTopologySuite Polygon):
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handlePresetChange('HQ_OFFICE')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: locationPreset === 'HQ_OFFICE' ? '1px solid var(--accent-emerald)' : '1px solid var(--border-glass)',
                    background: locationPreset === 'HQ_OFFICE' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                    color: locationPreset === 'HQ_OFFICE' ? '#34d399' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🏢 Inside HQ Geofence (13.7563, 100.5018)
                </button>
                <button
                  onClick={() => handlePresetChange('OUTSIDE_REMOTE')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: locationPreset === 'OUTSIDE_REMOTE' ? '1px solid var(--accent-rose)' : '1px solid var(--border-glass)',
                    background: locationPreset === 'OUTSIDE_REMOTE' ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.03)',
                    color: locationPreset === 'OUTSIDE_REMOTE' ? '#fda4af' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🏖️ Outside Boundary (18.7883, 98.9853)
                </button>
              </div>
            </div>

            {/* WebRTC Face Capture Camera Box */}
            <div style={{ border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '12px', background: 'rgba(0,0,0,0.25)', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>WebRTC Selfie Face Verification</span>
                {!cameraActive && (
                  <button onClick={startCamera} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                    <Camera style={{ width: 12, height: 12 }} /> Start Camera
                  </button>
                )}
              </div>

              {cameraActive ? (
                <div>
                  <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
                  <button onClick={captureSnapshot} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    Capture Face Snapshot
                  </button>
                </div>
              ) : (
                <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Camera preview ready for biometric clock-in verification.
                </div>
              )}

              {selfieBase64 && (
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                  ✅ Face snapshot captured & attached
                </div>
              )}
            </div>

            {/* Clock-in / Out Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              <button
                onClick={handleClockIn}
                disabled={isClocking || currentEmp.attendanceสถานะ === 'CLOCKED_IN'}
                className="btn-success"
                style={{ flex: 1, padding: '12px', fontSize: '0.95rem' }}
              >
                <Clock style={{ width: 16, height: 16 }} />
                {isClocking ? 'Verifying Geofence...' : 'Punch Clock-In (CLOCK_IN)'}
              </button>
              <button
                onClick={handleClockOut}
                disabled={currentEmp.attendanceสถานะ !== 'CLOCKED_IN'}
                className="btn-secondary"
                style={{ padding: '12px 18px', fontSize: '0.95rem' }}
              >
                Clock Out
              </button>
            </div>
          </div>

          {/* Right: Leave Management & Payslip History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Leave Application */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar style={{ width: 20, height: 20, color: 'var(--accent-cyan)' }} />
                  Submit Leave Request
                </h2>
                <span style={{ fontSize: '0.8rem', background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                  Balance: {currentEmp.annualLeaveBalance} Days
                </span>
              </div>

              <form onSubmit={handleLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Leave Type</label>
                    <select
                      value={leaveType}
                      onChange={e => setLeaveType(e.target.value as any)}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                    >
                      <option value="ANNUAL" style={{ background: '#0f172a' }}>ANNUAL (พักร้อน)</option>
                      <option value="SICK" style={{ background: '#0f172a' }}>SICK (ลาป่วย)</option>
                      <option value="PERSONAL" style={{ background: '#0f172a' }}>PERSONAL (ลากิจ)</option>
                      <option value="MATERNITY" style={{ background: '#0f172a' }}>MATERNITY (ลาคลอด)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reason</label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>

                <button type="submit" disabled={isSubmittingLeave} className="btn-primary" style={{ padding: '10px', fontSize: '0.85rem' }}>
                  <Send style={{ width: 14, height: 14 }} /> {isSubmittingLeave ? 'Validating Invariants...' : 'Submit Leave (Checks NoOverlappingLeaves)'}
                </button>
              </form>
            </div>

            {/* Compensation & Bank Info */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText style={{ width: 18, height: 18, color: 'var(--accent-purple)' }} />
                Payroll Direct Credit Information
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                <div>Base Salary: <strong style={{ color: 'var(--accent-emerald)' }}>{currentEmp.baseSalary.toLocaleString()} THB</strong></div>
                <div>Bank: <strong>{currentEmp.bankName} ({currentEmp.bankAccountNumber})</strong></div>
                <div>Tax ID: <strong>{currentEmp.taxId}</strong></div>
                <div>SSF Cap: <strong>5% (750.00 THB)</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


