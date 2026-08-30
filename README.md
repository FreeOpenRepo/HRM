# 03_HRM_PAYROLL_ENGINE: Geofenced Attendance & Automated Payroll

ระบบบริหารทรัพยากรบุคคลและคำนวณเงินเดือนอัตโนมัติ (HRM & Payroll Engine) พร้อมระบบลงเวลาทำงานผ่านการตรวจสอบพิกัด Geofence (Polygon Boundary) ร่วมกับ WebRTC Face Capture, ระบบจัดการวันลาแบบป้องกันวันซ้อนทับ, และการสร้างไฟล์ส่งธนาคารพร้อมสลิปเงินเดือนเข้ารหัส PDF/A

---

## 🔄 ภาพรวม Workflow การทำงาน (Business & Technical Workflow)

```mermaid
flowchart TD
    Employee["Employee (พนักงาน)<br/>เปิดมือถือหน้าบริษัท / ไซต์งาน"] -->|"1. Clock In (IDLE to CLOCKED_IN)"| GeofenceCheck{"Geofence Check<br/>NetTopologySuite.Within"}
    GeofenceCheck -->|"อยู่นอกพื้นที่ Geofence"| RejectLocation["Reject (ClockInWithinGeofenceBoundaryOnly)"]
    GeofenceCheck -->|"อยู่ในพื้นที่และใบหน้าถูกต้อง"| ClockInSuccess["ลงเวลาเข้างานสำเร็จ<br/>บันทึกพิกัด GPS และ Timestamp ลง PostGIS"]
    
    Employee -->|"ยื่นขอลาพักร้อน/ลาป่วย"| LeaveReq["2. Leave Request (PENDING to APPROVED)<br/>NoOverlappingLeaves"]
    LeaveReq --> HRAdmin["HR Admin (หัวหน้างาน)<br/>กดอนุมัติการลา"]
    
    HangfireCron["Hangfire Cron Scheduler<br/>ทุกสิ้นเดือน 28th 23:59"] -->|"3. Run Batch (SCHEDULED to EXECUTED)"| BatchPayroll["ประมวลผลเงินเดือนทั้งองค์กร"]
    BatchPayroll --> BankFile["ClosedXML & Flat-File<br/>สร้างไฟล์ TXT สั่งจ่ายเงินเดือนตามฟอร์แมตธนาคาร"]
    BatchPayroll --> Payslips["QuestPDF Slip Engine<br/>สร้างสลิปเงินเดือน PDF เข้ารหัสผ่าน 6 หลัก"]
```

### รายละเอียดขั้นตอนการเปลี่ยนสถานะ (State Transitions):
1. **`IDLE ➔ CLOCKED_IN` (Trigger: `CLOCK_IN`)**: พนักงานกดเช็คอิน ระบบดึงพิกัด GPS จากมือถือแล้วนำมาเปรียบเทียบกับขอบเขตพื้นที่บริษัท (Polygon Geofence) ผ่านเอนจิน PostGIS
2. **`PENDING ➔ APPROVED` (Trigger: `APPROVE_LEAVE`)**: ฝ่ายบุคคลอนุมัติใบลา โดยระบบจะตรวจสอบไม่ให้มีวันลาหรือช่วงเวลาที่ซ้ำซ้อนกัน
3. **`SCHEDULED ➔ EXECUTED` (Trigger: `CRON_PAYROLL_RUN`)**: ระบบรันคำนวณเงินเดือนอัตโนมัติ หักขาด ลา มาสาย ประกันสังคม ภาษีหัก ณ ที่จ่าย และออกไฟล์จ่ายเงินเดือนให้ธนาคาร

---

## 🛡️ กฎเหล็กของระบบ (Domain Invariants)

1. **`ClockInWithinGeofenceBoundaryOnly` (ลงเวลาได้เฉพาะภายในพื้นที่ที่กำหนดเท่านั้น)**:
   - ป้องกันการเช็คอินทิพย์จากที่บ้านหรือนอกสถานที่ โดยใช้การคำนวณแบบ Geospatial Polygon Intersection
2. **`NoOverlappingLeaves` (ห้ามมีวันลาซ้อนทับกัน)**:
   - พนักงานไม่สามารถยื่นขอลาในวันหรือช่วงเวลาที่มีใบลาเดิมที่ได้รับอนุมัติหรือรอพิจารณาอยู่แล้วได้

---

## 💻 Tech Stack & เหตุผลในการเลือกใช้

| ส่วนประกอบ | เทคโนโลยีที่เลือก | เหตุผลที่เลือก | ข้อดีหลัก (Advantages) |
|---|---|---|---|
| **Frontend Map** | **Next.js 16 + react-leaflet** | แสดงแผนที่และขอบเขต Geofence ได้อย่างชัดเจนบนอุปกรณ์พกพา | พนักงานเห็นระยะห่างระหว่างจุดที่ยืนอยู่กับรั้วบริษัทได้ทันที |
| **Face Verification**| **WebRTC Face Capture** | ดึงภาพจากกล้องหน้ามือถือแบบสดเพื่อยืนยันตัวตน | ป้องกันการลงเวลาแทนกัน (Buddy Punching) |
| **Geospatial Engine** | **NetTopologySuite + PostGIS** | มาตรฐานการคำนวณพิกัดเชิงภูมิศาสตร์ระดับโลก (OpenGIS) | คำนวณ Point-in-Polygon ได้อย่างแม่นยำระดับเซนติเมตร และประมวลผลเร็วมาก |
| **Cron Scheduler** | **Hangfire (.NET)** | ระบบจัดการ Background Jobs และ Cron ที่มี Dashboard ในตัว | ทำงานต่อเนื่อง มั่นใจได้ว่าเงินเดือนจะถูกประมวลผลตรงเวลาทุกสิ้นเดือนแม้เซิร์ฟเวอร์จะถูกรีสตาร์ต |
| **Bank Export** | **ClosedXML + Flat-File Text** | สร้างไฟล์ Excel สรุปยอดและไฟล์ Text ฟอร์แมตเฉพาะของธนาคาร (SCB, KBank, BBL) | นำไฟล์ส่งให้ธนาคารโอนเงินเข้าบัญชีพนักงานได้ทันทีโดยไม่ต้องคีย์มือ |
| **Encrypted Payslip**| **QuestPDF** | สร้างสลิปเงินเดือนสวยงามพร้อมเข้ารหัสป้องกันการเปิดอ่านด้วยรหัสผ่านส่วนตัว | ปลอดภัย ข้อมูลเงินเดือนไม่รั่วไหลตามมาตรฐาน PDPA |

---

## 🚀 สรุปสถาปัตยกรรม (Architecture Highlights)

- **Geospatial & Payroll Precision**: รวมการคำนวณเชิงพิกัดจริงเข้ากับการคำนวณตัวเลขทางการเงินที่มีความแม่นยำสูง
