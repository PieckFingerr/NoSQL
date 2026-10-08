use("QuanLyPhongTro_Test");
// ========================================================
// Member 3 - CRUD & Nghiệp Vụ Quản Lý Thanh Toán (payments)
// ========================================================

// 1. CREATE: Ghi nhận thanh toán mới và tự động cập nhật trạng thái của Hóa đơn (invoice)
// Cho phép một hóa đơn thanh toán nhiều lần (trả từng phần).
// Trạng thái hóa đơn tự động cập nhật:
// - UNPAID: nếu tổng tiền đã thanh toán thành công == 0
// - PARTIAL: nếu 0 < tổng tiền thanh toán < tổng tiền hóa đơn
// - PAID: nếu tổng tiền thanh toán >= tổng tiền hóa đơn
function recordPayment(invoiceId, amount, paymentMethod, status = "SUCCESS", note = "") {
    const invoice = db.invoices.findOne({ _id: invoiceId });
    if (!invoice) {
        throw new Error("Khong tim thay hoa don voi id: " + invoiceId);
    }

    if (amount <= 0) {
        throw new Error("So tien thanh toan phai lon hon 0!");
    }

    // 1. Tạo bản ghi thanh toán
    const paymentDoc = {
        invoiceId: invoiceId,
        amount: Double(amount),
        paymentMethod: paymentMethod, // "CASH", "BANK_TRANSFER", "OTHER"
        paymentDate: new Date(),
        status: status, // "SUCCESS", "PENDING", "CANCELLED"
        note: note
    };

    const insertResult = db.payments.insertOne(paymentDoc);

    // 2. Đồng bộ và cập nhật lại trạng thái hóa đơn
    syncInvoiceStatus(invoiceId);

    return insertResult;
}

// Hàm tính tổng số tiền đã thanh toán thành công và cập nhật trạng thái hóa đơn
function syncInvoiceStatus(invoiceId) {
    const invoice = db.invoices.findOne({ _id: invoiceId });
    if (!invoice) return;

    // Tính tổng số tiền thanh toán thành công (status == "SUCCESS")
    const aggResult = db.payments.aggregate([
        {
            $match: {
                invoiceId: invoiceId,
                status: "SUCCESS"
            }
        },
        {
            $group: {
                _id: "$invoiceId",
                totalPaid: { $sum: "$amount" }
            }
        }
    ]).toArray();

    const totalPaid = aggResult.length > 0 ? aggResult[0].totalPaid : 0;

    let newStatus = "UNPAID";
    if (totalPaid >= invoice.total) {
        newStatus = "PAID";
    } else if (totalPaid > 0) {
        newStatus = "PARTIAL";
    }

    db.invoices.updateOne(
        { _id: invoiceId },
        { $set: { status: newStatus } }
    );

    return {
        invoiceId: invoiceId,
        totalInvoice: invoice.total,
        totalPaid: totalPaid,
        remaining: Math.max(0, invoice.total - totalPaid),
        newStatus: newStatus
    };
}

// 2. READ: Xem lịch sử thanh toán của một hóa đơn
function getPaymentHistoryByInvoice(invoiceId) {
    return db.payments.find({ invoiceId: invoiceId })
        .sort({ paymentDate: -1 })
        .toArray();
}

// 3. READ: Xem thống kê tổng tiền đã thanh toán của một hóa đơn
function getTotalPaidForInvoice(invoiceId) {
    const res = db.payments.aggregate([
        { $match: { invoiceId: invoiceId, status: "SUCCESS" } },
        {
            $group: {
                _id: "$invoiceId",
                totalPaid: { $sum: "$amount" },
                paymentCount: { $sum: 1 }
            }
        }
    ]).toArray();

    return res.length > 0 ? res[0] : { _id: invoiceId, totalPaid: 0, paymentCount: 0 };
}

// 4. UPDATE: Duyệt giao dịch PENDING sang SUCCESS hoặc CANCELLED
function updatePaymentStatus(paymentId, newStatus) {
    if (!["SUCCESS", "PENDING", "CANCELLED"].includes(newStatus)) {
        throw new Error("Trang thai khong hop le: " + newStatus);
    }

    const payment = db.payments.findOne({ _id: paymentId });
    if (!payment) {
        throw new Error("Khong tim thay thanh toan voi id: " + paymentId);
    }

    const res = db.payments.updateOne(
        { _id: paymentId },
        { $set: { status: newStatus } }
    );

    // Đồng bộ lại trạng thái của hóa đơn tương ứng
    syncInvoiceStatus(payment.invoiceId);

    return res;
}

// 5. DELETE: Hủy / Xóa giao dịch thanh toán (chỉ dùng khi giao dịch bị tạo nhầm)
function deletePayment(paymentId) {
    const payment = db.payments.findOne({ _id: paymentId });
    if (!payment) return null;

    const res = db.payments.deleteOne({ _id: paymentId });
    syncInvoiceStatus(payment.invoiceId);
    return res;
}

// ========================================================
// DEMO CHẠY THỬ QUY TRÌNH THANH TOÁN NHIỀU LẦN (PARTIAL -> PAID)
// ========================================================
{
    const tempInvoiceId = ObjectId();
    const tempPaymentId1 = ObjectId();
    const tempPaymentId2 = ObjectId();

    print(">>> 1. TAO HOA DON DEMO (TOTAL = 3,000,000):");
    db.invoices.insertOne({
        _id: tempInvoiceId,
        roomId: ObjectId(),
        contractId: ObjectId(),
        month: Int32(11),
        year: Int32(2026),
        rent: Double(2500000),
        services: [
            { name: "Electricity", quantity: Double(100), unitPrice: Double(3500), amount: Double(350000) },
            { name: "Water", quantity: Double(10), unitPrice: Double(15000), amount: Double(150000) }
        ],
        total: Double(3000000),
        status: "UNPAID",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
    });

    try {
        print(">>> 2. THANH TOAN DOT 1: 1,000,000 VND (CASH) -> Ky vong status = PARTIAL");
        db.payments.insertOne({
            _id: tempPaymentId1,
            invoiceId: tempInvoiceId,
            amount: Double(1000000),
            paymentMethod: "CASH",
            paymentDate: new Date(),
            status: "SUCCESS",
            note: "Dot 1 demo"
        });
        let statusAfterDot1 = syncInvoiceStatus(tempInvoiceId);
        printjson(statusAfterDot1);

        print(">>> 3. THANH TOAN DOT 2: 2,000,000 VND (BANK_TRANSFER) -> Ky vong status = PAID");
        db.payments.insertOne({
            _id: tempPaymentId2,
            invoiceId: tempInvoiceId,
            amount: Double(2000000),
            paymentMethod: "BANK_TRANSFER",
            paymentDate: new Date(),
            status: "SUCCESS",
            note: "Dot 2 demo - tat toan"
        });
        let statusAfterDot2 = syncInvoiceStatus(tempInvoiceId);
        printjson(statusAfterDot2);

        print(">>> 4. XEM LICH SU CAC LAN THANH TOAN:");
        printjson(getPaymentHistoryByInvoice(tempInvoiceId));
    } finally {
        print(">>> 5. CLEANUP DEMO DATA:");
        db.payments.deleteMany({ _id: { $in: [tempPaymentId1, tempPaymentId2] } });
        db.invoices.deleteOne({ _id: tempInvoiceId });
        print("Cleanup completed.");
    }
}
