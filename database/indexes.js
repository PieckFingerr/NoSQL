use("QuanLyPhongTro_Test");
// Create indexes for MongoDB collections

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
// Hỗ trợ xem lịch sử và tính tổng các khoản thanh toán cho một hóa đơn
db.payments.createIndex({ invoiceId: 1 });
// Hỗ trợ thống kê doanh thu thực thu theo ngày và trạng thái giao dịch
db.payments.createIndex({ paymentDate: -1, status: 1 });
