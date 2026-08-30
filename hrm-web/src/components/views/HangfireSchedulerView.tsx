'use client';

import React from 'react';
import { CalendarClock, Server, MapPin, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';

export default function HangfireSchedulerView() {
  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarClock style={{ color: 'var(--accent-purple)', width: 28, height: 28 }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Hangfire Background Scheduler & Cron Desk</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Recurring payroll execution • In-memory Hangfire server • Geospatial boundary telemetry
          </p>
        </div>

        <a
          href="http://localhost:5060/hangfire"
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
          style={{ fontSize: '0.85rem', textDecoration: 'none' }}
        >
          <ExternalLink style={{ width: 14, height: 14 }} /> Open Hangfire Dashboard (:5060)
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recurring Jobs */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server style={{ width: 18, height: 18, color: 'var(--accent-cyan)' }} />
            Configured Recurring Cron Jobs
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>monthly-payroll-run</span>
                <span className="badge-executed" style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                  Active (Cron)
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Target: <code>PayrollService.ExecutePayrollBatchAsync(YYYY-MM)</code>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Cron Schedule: <code>0 18 28 * *</code> (Runs at 18:00 on the 28th of every month)
              </div>
            </div>
          </div>
        </div>

        {/* Geofence Parameters */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin style={{ width: 18, height: 18, color: 'var(--accent-emerald)' }} />
            NetTopologySuite Geofence Invariant
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '4px' }}>HQ Center Coordinates</div>
              <div>Latitude: <code>13.7563° N</code></div>
              <div>Longitude: <code>100.5018° E</code></div>
              <div style={{ marginTop: '4px' }}>Allowed Radius: <strong>250 meters</strong></div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '4px' }}>Side-effects Pipeline</div>
              <div>✅ <strong>Bank Flat-File TXT:</strong> Formatted for Thai direct credit banks</div>
              <div>✅ <strong>QuestPDF 2025:</strong> Bilingual Thai/English PDF payslips</div>
              <div>✅ <strong>Tax Engine:</strong> Auto Social Security 5% (max 750) & PND1 Withholding</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
