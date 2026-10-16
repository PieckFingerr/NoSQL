use("QuanLyPhongTro_Test");
// ========================================================
// Member 3 - CRUD & Nghiệp Vụ Quản Lý Hóa Đơn (invoices)
// ========================================================

// 1. CREATE: Tự động lập hóa đơn tháng cho một phòng
// Nghiệp vụ:
// - Lấy tiền phòng từ hợp đồng đang ACTIVE (contracts.monthlyRent).
// - Lấy lượng điện, nước tiêu thụ từ meter_readings của tháng/năm đó.
// - Lấy đơn giá điện, nước, internet, rác từ collection services.
// - Embedding mảng services[] để lưu cố định đơn giá và số lượng tại thời điểm xuất hóa đơn.
// - total = rent + tổng tiền tất cả dịch vụ.
function generateMonthlyInvoice(roomId, month, year, dueDate) {
    // 1. Lấy hợp đồng đang hiệu lực của phòng
    const contract = db.contracts.findOne({
        roomId: roomId,
        status: "ACTIVE"
    });
    if (!contract) {
        throw new Error("Khong tim thay hop dong ACTIVE cho phong nay!");
    }

    // 2. Lấy chỉ số điện nước tháng này
    const reading = db.meter_readings.findOne({
        roomId: roomId,
        month: Int32(month),
        year: Int32(year)
    });
    if (!reading) {
        throw new Error("Chua co chi so dien nuoc cho thang " + month + "/" + year + "!");
    }

    const electricityUsed = reading.electricity.newIndex - reading.electricity.oldIndex;
    const waterUsed = reading.water.newIndex - reading.water.oldIndex;

    // 3. Lấy đơn giá dịch vụ từ collection services
    const elecService = db.services.findOne({ name: "Electricity" }) || { price: 3500.0 };
    const waterService = db.services.findOne({ name: "Water" }) || { price: 15000.0 };
    const netService = db.services.findOne({ name: "Internet" }) || { price: 100000.0 };
    const garbageService = db.services.findOne({ name: "Garbage" }) || { price: 30000.0 };

    // 4. Chuẩn bị danh sách dịch vụ embedding
    const services = [
        {
            name: "Electricity",
            quantity: Double(electricityUsed),
            unitPrice: Double(elecService.price),
            amount: Double(electricityUsed * elecService.price)
        },
        {
            name: "Water",
            quantity: Double(waterUsed),
            unitPrice: Double(waterService.price),
            amount: Double(waterUsed * waterService.price)
        },
        {
            name: "Internet",
            quantity: Double(1),
            unitPrice: Double(netService.price),
            amount: Double(netService.price)
        },
        {
            name: "Garbage",
            quantity: Double(1),
            unitPrice: Double(garbageService.price),
            amount: Double(garbageService.price)
        }
    ];

    // 5. Tính tổng tiền
    const totalServices = services.reduce((sum, s) => sum + s.amount, 0);
    const rentAmount = contract.monthlyRent;
    const totalAmount = rentAmount + totalServices;

    const invoiceDoc = {
        roomId: roomId,
        contractId: contract._id,
        month: Int32(month),
        year: Int32(year),
        rent: Double(rentAmount),
        services: services,
        total: Double(totalAmount),
        status: "UNPAID",
        dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Mặc định hạn nộp 7 ngày sau
        createdAt: new Date()
    };

    return db.invoices.insertOne(invoiceDoc);
}

// 2. READ: Lọc các hóa đơn CHƯA THANH TOÁN (UNPAID)
function getUnpaidInvoices() {
    return db.invoices.aggregate([
        { $match: { status: "UNPAID" } },
        {
            $lookup: {
                from: "rooms",
                localField: "roomId",
                foreignField: "_id",
                as: "room"
            }
        },
        { $unwind: "$room" },
        {
            $project: {
                roomNumber: "$room.roomNumber",
                month: 1,
                year: 1,
                rent: 1,
                total: 1,
                status: 1,
                dueDate: 1,
                createdAt: 1
            }
        },
        { $sort: { dueDate: 1 } }
    ]).toArray();
}

// 3. READ: Lọc các hóa đơn ĐÃ THANH TOÁN ĐẦY ĐỦ (PAID)
function getPaidInvoices() {
    return db.invoices.aggregate([
        { $match: { status: "PAID" } },
        {
            $lookup: {
                from: "rooms",
                localField: "roomId",
                foreignField: "_id",
                as: "room"
            }
        },
        { $unwind: "$room" },
        {
            $project: {
                roomNumber: "$room.roomNumber",
                month: 1,
                year: 1,
                total: 1,
                status: 1,
                dueDate: 1
            }
        },
        { $sort: { year: -1, month: -1 } }
    ]).toArray();
}

// 4. READ: Lọc các hóa đơn QUÁ HẠN (Chưa thanh toán hết và quá dueDate)
function getOverdueInvoices() {
    const now = new Date();
    return db.invoices.aggregate([
        {
            $match: {
                status: { $in: ["UNPAID", "PARTIAL"] },
                dueDate: { $lt: now }
            }
        },
        {
            $lookup: {
                from: "rooms",
                localField: "roomId",
                foreignField: "_id",
                as: "room"
            }
        },
        { $unwind: "$room" },
        {
            $project: {
                roomNumber: "$room.roomNumber",
                month: 1,
                year: 1,
                total: 1,
                status: 1,
                dueDate: 1,
                daysOverdue: {
                    $floor: {
                        $divide: [{ $subtract: [now, "$dueDate"] }, 1000 * 60 * 60 * 24]
                    }
                }
            }
        },
        { $sort: { daysOverdue: -1 } }
    ]).toArray();
}

// 5. UPDATE: Gia hạn hoặc cập nhật hạn nộp tiền (dueDate)
function updateInvoiceDueDate(invoiceId, newDueDate) {
    return db.invoices.updateOne(
        { _id: invoiceId },
        { $set: { dueDate: newDueDate } }
    );
}

// 6. DELETE: Xóa hóa đơn (chỉ được xóa khi chưa có thanh toán)
function deleteInvoice(invoiceId) {
    const paymentCount = db.payments.countDocuments({ invoiceId: invoiceId, status: "SUCCESS" });
    if (paymentCount > 0) {
        throw new Error("Khong the xoa hoa don da co giao dich thanh toan thanh cong!");
    }
    return db.invoices.deleteOne({ _id: invoiceId });
}

// ========================================================
// DEMO CHẠY THỬ CRUD & LỌC HÓA ĐƠN
// ========================================================
{
    const sampleRoom = db.rooms.findOne() || { _id: ObjectId() };
    const tempInvoiceId = ObjectId();

    print(">>> 1. INSERT DEMO INVOICE:");
    db.invoices.insertOne({
        _id: tempInvoiceId,
        roomId: sampleRoom._id,
        contractId: ObjectId(),
        month: Int32(11),
        year: Int32(2026),
        rent: Double(2500000),
        services: [
            { name: "Electricity", quantity: Double(50), unitPrice: Double(3500), amount: Double(175000) },
            { name: "Water", quantity: Double(5), unitPrice: Double(15000), amount: Double(75000) }
        ],
        total: Double(2750000),
        status: "UNPAID",
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hôm qua -> quá hạn
        createdAt: new Date()
    });

    try {
        print(">>> 2. LỌC HÓA ĐƠN QUÁ HẠN:");
        const overdue = getOverdueInvoices();
        printjson(overdue);

        print(">>> 3. LỌC HÓA ĐƠN CHƯA THANH TOÁN:");
        const unpaid = getUnpaidInvoices();
        printjson(unpaid);

        print(">>> 4. UPDATE HẠN THANH TOÁN:");
        updateInvoiceDueDate(tempInvoiceId, new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
        const updated = db.invoices.findOne({ _id: tempInvoiceId });
        printjson(updated);
    } finally {
        print(">>> 5. CLEANUP DEMO INVOICE:");
        db.invoices.deleteOne({ _id: tempInvoiceId });
        print("Cleanup demo invoice completed.");
    }
}
