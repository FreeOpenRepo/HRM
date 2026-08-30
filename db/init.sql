-- =============================================================================
-- HRM & Payroll Engine Initial Database Schema & Seed Data (hrm_db)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- PostGIS enabled for Geofence validation

DROP TABLE IF EXISTS "Payrolls" CASCADE;
DROP TABLE IF EXISTS "Attendances" CASCADE;
DROP TABLE IF EXISTS "Geofences" CASCADE;
DROP TABLE IF EXISTS "Employees" CASCADE;

-- 1. Employees
CREATE TABLE "Employees" (
    "Id" SERIAL PRIMARY KEY,
    "EmployeeCode" VARCHAR(50) NOT NULL UNIQUE,
    "FullName" VARCHAR(200) NOT NULL,
    "Email" VARCHAR(150) NOT NULL UNIQUE,
    "Department" VARCHAR(100) NOT NULL,
    "Position" VARCHAR(100) NOT NULL,
    "BaseSalary" NUMERIC(12, 2) NOT NULL DEFAULT 35000.00,
    "IsActive" BOOLEAN DEFAULT TRUE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Geofences (Office & Warehouse boundaries)
CREATE TABLE "Geofences" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(150) NOT NULL,
    "CenterLatitude" DOUBLE PRECISION NOT NULL,
    "CenterLongitude" DOUBLE PRECISION NOT NULL,
    "RadiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 200.0
);

-- 3. Attendances (Check-In / Out with Geofence & Selfie verification)
CREATE TABLE "Attendances" (
    "Id" SERIAL PRIMARY KEY,
    "EmployeeId" INT NOT NULL REFERENCES "Employees"("Id") ON DELETE CASCADE,
    "CheckInTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "CheckOutTime" TIMESTAMP WITH TIME ZONE,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,
    "IsWithinGeofence" BOOLEAN DEFAULT TRUE,
    "SelfieBase64" TEXT,
    "Status" VARCHAR(50) DEFAULT 'ON_TIME' -- ON_TIME, LATE, ABSENT
);

-- 4. Payrolls (Thai Social Security Fund & Withholding Tax 3%)
CREATE TABLE "Payrolls" (
    "Id" SERIAL PRIMARY KEY,
    "PayrollCode" VARCHAR(50) NOT NULL UNIQUE,
    "EmployeeId" INT NOT NULL REFERENCES "Employees"("Id") ON DELETE CASCADE,
    "PeriodMonth" VARCHAR(10) NOT NULL, -- e.g. "2026-08"
    "BaseSalary" NUMERIC(12, 2) NOT NULL,
    "OvertimePay" NUMERIC(12, 2) DEFAULT 0.00,
    "SocialSecurityDeduction" NUMERIC(12, 2) NOT NULL DEFAULT 750.00, -- Max 750 THB
    "WithholdingTax" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "NetPay" NUMERIC(12, 2) NOT NULL,
    "IsPaid" BOOLEAN DEFAULT FALSE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Data
INSERT INTO "Employees" ("Id", "EmployeeCode", "FullName", "Email", "Department", "Position", "BaseSalary") VALUES
(1, 'EMP-1001', 'Kamonwan Somboon', 'kamonwan.s@enterprise.com', 'Engineering', 'Senior Systems Architect', 95000.00),
(2, 'EMP-1002', 'Prasit Charoen', 'prasit.c@enterprise.com', 'Operations', 'Warehouse Lead Supervisor', 48000.00),
(3, 'EMP-1003', 'Siriporn Rungrueang', 'siriporn.r@enterprise.com', 'Human Resources', 'HR Specialist', 42000.00)
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "Geofences" ("Id", "Name", "CenterLatitude", "CenterLongitude", "RadiusMeters") VALUES
(1, 'Bangkok Headquarters (Sathorn)', 13.7225, 100.5284, 250.0),
(2, 'Eastern Logistics Hub (Chonburi)', 13.3611, 100.9847, 500.0)
ON CONFLICT ("Id") DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Employees"', 'Id'), COALESCE(max("Id"), 1)) FROM "Employees";
SELECT setval(pg_get_serial_sequence('"Geofences"', 'Id'), COALESCE(max("Id"), 1)) FROM "Geofences";
