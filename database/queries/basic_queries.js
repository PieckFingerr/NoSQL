use("QuanLyPhongTro_Test");
// Common MongoDB queries for the project

// ========================================================
// Member 3 - Basic Queries (meter_readings, invoices, payments)
// ========================================================

// 1. Xem lịch sử điện nước của một phòng cụ thể (sắp xếp giảm dần theo năm, tháng)
db.meter_readings.find({ roomId: ObjectId("651a00000000000000000101") })
    .sort({ year: -1, month: -1 });

// 2. Tra cứu toàn bộ chỉ số điện nước được ghi trong tháng 10 năm 2026
db.meter_readings.find({ month: Int32(10), year: Int32(2026) });

// 3. Lọc danh sách tất cả hóa đơn chưa thanh toán (status: UNPAID)
db.invoices.find({ status: "UNPAID" });

// 4. Lọc danh sách hóa đơn đã thanh toán đầy đủ (status: PAID)
db.invoices.find({ status: "PAID" });

// 5. Lọc danh sách hóa đơn thanh toán một phần (status: PARTIAL)
db.invoices.find({ status: "PARTIAL" });

// 6. Lọc các hóa đơn bị quá hạn thanh toán (chưa tất toán và dueDate < thời điểm hiện tại)
db.invoices.find({
    status: { $in: ["UNPAID", "PARTIAL"] },
    dueDate: { $lt: new Date() }
});

// 7. Xem lịch sử các lần thanh toán của một hóa đơn cụ thể
db.payments.find({ invoiceId: ObjectId("653000000000000000000109") })
    .sort({ paymentDate: -1 });

// 8. Tra cứu các giao dịch thanh toán thành công qua chuyển khoản ngân hàng (BANK_TRANSFER)
db.payments.find({
    paymentMethod: "BANK_TRANSFER",
    status: "SUCCESS"
});

// ========================================================
// Member 2 - Basic Queries (tenants, contracts)
// ========================================================

// 1. Tim nguoi thue theo so dien thoai
db.tenants.find({ phone: "0901234567" });

// 2. Tim nguoi thue theo CCCD/CMND
db.tenants.find({ identityCard: "001234567890" });

// 3. Xem tat ca hop dong
db.contracts.find();

// 4. Xem hop dong theo phong
db.contracts.find({ roomId: ObjectId("651a00000000000000000101") });

// 5. Xem hop dong theo nguoi thue
db.contracts.find({ tenantIds: ObjectId("651c00000000000000000001") });

// 6. Tim hop dong sap het han (trong 30 ngay toi)
const now = new Date();
const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
db.contracts.find({
    status: "ACTIVE",
    endDate: { $gte: now, $lte: next30Days }
});
