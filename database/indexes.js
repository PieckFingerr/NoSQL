// Create indexes for MongoDB collections

// Member 1: these calls preserve all existing indexes.
db.rooms.createIndex({ roomNumber: 1 }, { unique: true });
db.rooms.createIndex({ status: 1 });
db.services.createIndex({ name: 1 }, { unique: true });

// ========================================================
// Member 3 - Indexes (meter_readings, invoices, payments)
// ========================================================

// 1. meter_readings indexes
// Đảm bảo mỗi phòng chỉ có duy nhất 1 bản ghi số điện nước trong một tháng/năm cụ thể
db.meter_readings.createIndex({ roomId: 1, year: 1, month: 1 }, { unique: true });
// Hỗ trợ truy vấn nhanh lịch sử ghi điện nước theo phòng sắp xếp theo thời gian mới nhất
db.meter_readings.createIndex({ roomId: 1, recordedAt: -1 });
// Hỗ trợ tính toán thống kê tổng lượng điện, nước tiêu thụ theo tháng/năm
db.meter_readings.createIndex({ year: 1, month: 1 });

// 2. invoices indexes
// Đảm bảo mỗi phòng chỉ có duy nhất 1 hóa đơn cho mỗi tháng/năm
db.invoices.createIndex({ roomId: 1, year: 1, month: 1 }, { unique: true });
// Hỗ trợ tra cứu nhanh danh sách hóa đơn theo hợp đồng
db.invoices.createIndex({ contractId: 1 });
// Hỗ trợ tối ưu hóa truy vấn lọc hóa đơn chưa thanh toán hoặc quá hạn thanh toán
db.invoices.createIndex({ status: 1, dueDate: 1 });
// Hỗ trợ thống kê doanh thu và báo cáo tài chính theo tháng/năm
db.invoices.createIndex({ year: 1, month: 1 });

// 3. payments indexes
// Ho tro xem lich su va tinh tong cac khoan thanh toan cho mot hoa don
db.payments.createIndex({ invoiceId: 1 });
// Ho tro thong ke doanh thu thuc thu theo ngay va trang thai giao dich
db.payments.createIndex({ paymentDate: -1, status: 1 });

// ========================================================
// Member 2 - Indexes (tenants, contracts)
// ========================================================
// 1. tenants indexes
// Ho tro tim kiem nhanh nguoi thue theo so dien thoai
db.tenants.createIndex({ phone: 1 });
// Dam bao moi CCCD/CMND chi xuat hien mot lan
db.tenants.createIndex({ identityCard: 1 }, { unique: true });

// 2. contracts indexes
// Ho tro tra xuat hop dong theo phong va trang thai
db.contracts.createIndex({ roomId: 1, status: 1 });
// Dam bao moi phong chi co toi da 1 hop dong ACTIVE (vi pham -> loi 11000)
db.contracts.createIndex(
    { roomId: 1 },
    { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);
// Ho tro tim kiem hop dong sap het han
db.contracts.createIndex({ endDate: 1, status: 1 });
