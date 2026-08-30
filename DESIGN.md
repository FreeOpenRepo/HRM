system: 03_HRM_PAYROLL_ENGINE
tech_stack:
  frontend: "Next.js 16 + react-leaflet + WebRTC Face Capture + Recharts"
  backend: ".NET 10 + Hangfire + NetTopologySuite + ClosedXML + QuestPDF"
  orm: "EF Core 10 (Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite)"
  storage: "PostgreSQL 18 (PostGIS) + Redis + S3"
  protocols: "HTTPS, GeoJSON, Bank Flat-File TXT"
spec:
  actors: [Employee, HRAdmin, HangfireScheduler]
  invariants: [NoOverlappingLeaves, ClockInWithinGeofenceBoundaryOnly]
  state_transitions:
    - { from: IDLE, to: CLOCKED_IN, trigger: CLOCK_IN, handler: "Attendance.ClockIn", validation: "NetTopologySuite.Within(Coords, Polygon)" }
    - { from: PENDING, to: APPROVED, trigger: APPROVE_LEAVE, handler: "Leave.Approve" }
    - { from: SCHEDULED, to: EXECUTED, trigger: CRON_PAYROLL_RUN, handler: "Payroll.ExecuteBatch", side_effects: ["BankExport.GenerateTxt", "QuestPdf.GenerateEncryptedSlips"] }