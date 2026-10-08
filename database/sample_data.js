use("QuanLyPhongTro_Test");
// Insert sample data for testing

// ========================================================
// Member 3 - Sample Data (meter_readings, invoices, payments)
// ========================================================

// 1. Chuẩn bị / tra cứu ObjectId của các phòng liên kết
let room101 = db.rooms.findOne({ roomNumber: "P101" });
if (!room101) {
    const id = ObjectId("651a00000000000000000101");
    db.rooms.updateOne(
        { roomNumber: "P101" },
        { $setOnInsert: { _id: id, roomNumber: "P101", floor: Int32(1), price: Double(2500000), area: Double(18), status: "OCCUPIED" } },
        { upsert: true }
    );
    room101 = db.rooms.findOne({ roomNumber: "P101" });
}

let room102 = db.rooms.findOne({ roomNumber: "P102" });
if (!room102) {
    const id = ObjectId("651a00000000000000000102");
    db.rooms.updateOne(
        { roomNumber: "P102" },
        { $setOnInsert: { _id: id, roomNumber: "P102", floor: Int32(1), price: Double(2800000), area: Double(20), status: "OCCUPIED" } },
        { upsert: true }
    );
    room102 = db.rooms.findOne({ roomNumber: "P102" });
}

let room201 = db.rooms.findOne({ roomNumber: "P201" });
if (!room201) {
    const id = ObjectId("651a00000000000000000201");
    db.rooms.updateOne(
        { roomNumber: "P201" },
        { $setOnInsert: { _id: id, roomNumber: "P201", floor: Int32(2), price: Double(3000000), area: Double(22), status: "OCCUPIED" } },
        { upsert: true }
    );
    room201 = db.rooms.findOne({ roomNumber: "P201" });
}

let room203 = db.rooms.findOne({ roomNumber: "P203" });
if (!room203) {
    const id = ObjectId("651a00000000000000000203");
    db.rooms.updateOne(
        { roomNumber: "P203" },
        { $setOnInsert: { _id: id, roomNumber: "P203", floor: Int32(2), price: Double(3500000), area: Double(26), status: "OCCUPIED" } },
        { upsert: true }
    );
    room203 = db.rooms.findOne({ roomNumber: "P203" });
}

// 2. Chuẩn bị / tra cứu Hợp đồng mẫu
let contract101 = db.contracts.findOne({ roomId: room101._id });
if (!contract101) {
    const contractId = ObjectId("651b00000000000000000101");
    db.contracts.updateOne(
        { _id: contractId },
        { $setOnInsert: {
            _id: contractId,
            roomId: room101._id,
            tenantIds: [ObjectId("651c00000000000000000001")],
            startDate: new Date("2026-01-01T00:00:00Z"),
            endDate: new Date("2026-12-31T00:00:00Z"),
            monthlyRent: Double(2500000),
            deposit: Double(2500000),
            status: "ACTIVE"
        } },
        { upsert: true }
    );
    contract101 = db.contracts.findOne({ _id: contractId });
}

let contract102 = db.contracts.findOne({ roomId: room102._id });
if (!contract102) {
    const contractId = ObjectId("651b00000000000000000102");
    db.contracts.updateOne(
        { _id: contractId },
        { $setOnInsert: {
            _id: contractId,
            roomId: room102._id,
            tenantIds: [ObjectId("651c00000000000000000002")],
            startDate: new Date("2026-02-01T00:00:00Z"),
            endDate: new Date("2026-10-31T00:00:00Z"), // Sắp hết hạn trong tháng 10
            monthlyRent: Double(2800000),
            deposit: Double(2800000),
            status: "ACTIVE"
        } },
        { upsert: true }
    );
    contract102 = db.contracts.findOne({ _id: contractId });
}

let contract201 = db.contracts.findOne({ roomId: room201._id });
if (!contract201) {
    const contractId = ObjectId("651b00000000000000000201");
    db.contracts.updateOne(
        { _id: contractId },
        { $setOnInsert: {
            _id: contractId,
            roomId: room201._id,
            tenantIds: [ObjectId("651c00000000000000000003")],
            startDate: new Date("2026-03-01T00:00:00Z"),
            endDate: new Date("2027-03-01T00:00:00Z"),
            monthlyRent: Double(3000000),
            deposit: Double(3000000),
            status: "ACTIVE"
        } },
        { upsert: true }
    );
    contract201 = db.contracts.findOne({ _id: contractId });
}

let contract203 = db.contracts.findOne({ roomId: room203._id });
if (!contract203) {
    const contractId = ObjectId("651b00000000000000000203");
    db.contracts.updateOne(
        { _id: contractId },
        { $setOnInsert: {
            _id: contractId,
            roomId: room203._id,
            tenantIds: [ObjectId("651c00000000000000000004")],
            startDate: new Date("2026-01-15T00:00:00Z"),
            endDate: new Date("2026-11-15T00:00:00Z"),
            monthlyRent: Double(3500000),
            deposit: Double(3500000),
            status: "ACTIVE"
        } },
        { upsert: true }
    );
    contract203 = db.contracts.findOne({ _id: contractId });
}

// ========================================================
// 3. Dữ liệu mẫu meter_readings
// ========================================================
const member3MeterReadings = [
    // P101: Tháng 9 và Tháng 10
    {
        _id: ObjectId("652000000000000000000109"),
        roomId: room101._id,
        month: Int32(9),
        year: Int32(2026),
        electricity: { oldIndex: Double(100), newIndex: Double(150) }, // dùng 50 kWh
        water: { oldIndex: Double(20), newIndex: Double(25) },         // dùng 5 m3
        recordedAt: new Date("2026-09-30T17:00:00Z")
    },
    {
        _id: ObjectId("652000000000000000000110"),
        roomId: room101._id,
        month: Int32(10),
        year: Int32(2026),
        electricity: { oldIndex: Double(150), newIndex: Double(210) }, // dùng 60 kWh
        water: { oldIndex: Double(25), newIndex: Double(32) },         // dùng 7 m3
        recordedAt: new Date("2026-10-01T08:00:00Z")
    },
    // P102: Tháng 9 và Tháng 10
    {
        _id: ObjectId("652000000000000000000209"),
        roomId: room102._id,
        month: Int32(9),
        year: Int32(2026),
        electricity: { oldIndex: Double(80), newIndex: Double(135) },  // dùng 55 kWh
        water: { oldIndex: Double(15), newIndex: Double(21) },         // dùng 6 m3
        recordedAt: new Date("2026-09-30T17:30:00Z")
    },
    {
        _id: ObjectId("652000000000000000000210"),
        roomId: room102._id,
        month: Int32(10),
        year: Int32(2026),
        electricity: { oldIndex: Double(135), newIndex: Double(195) }, // dùng 60 kWh
        water: { oldIndex: Double(21), newIndex: Double(28) },         // dùng 7 m3
        recordedAt: new Date("2026-10-01T08:30:00Z")
    },
    // P201: Tháng 9 và Tháng 10
    {
        _id: ObjectId("652000000000000000000309"),
        roomId: room201._id,
        month: Int32(9),
        year: Int32(2026),
        electricity: { oldIndex: Double(200), newIndex: Double(270) }, // dùng 70 kWh
        water: { oldIndex: Double(30), newIndex: Double(38) },         // dùng 8 m3
        recordedAt: new Date("2026-09-30T18:00:00Z")
    },
    {
        _id: ObjectId("652000000000000000000310"),
        roomId: room201._id,
        month: Int32(10),
        year: Int32(2026),
        electricity: { oldIndex: Double(270), newIndex: Double(350) }, // dùng 80 kWh
        water: { oldIndex: Double(38), newIndex: Double(48) },         // dùng 10 m3
        recordedAt: new Date("2026-10-01T09:00:00Z")
    },
    // P203: Tháng 9 và Tháng 10
    {
        _id: ObjectId("652000000000000000000409"),
        roomId: room203._id,
        month: Int32(9),
        year: Int32(2026),
        electricity: { oldIndex: Double(110), newIndex: Double(170) }, // dùng 60 kWh
        water: { oldIndex: Double(18), newIndex: Double(24) },         // dùng 6 m3
        recordedAt: new Date("2026-09-30T18:30:00Z")
    },
    {
        _id: ObjectId("652000000000000000000410"),
        roomId: room203._id,
        month: Int32(10),
        year: Int32(2026),
        electricity: { oldIndex: Double(170), newIndex: Double(240) }, // dùng 70 kWh
        water: { oldIndex: Double(24), newIndex: Double(31) },         // dùng 7 m3
        recordedAt: new Date("2026-10-01T09:30:00Z")
    }
];

for (const reading of member3MeterReadings) {
    db.meter_readings.updateOne(
        { roomId: reading.roomId, month: reading.month, year: reading.year },
        { $setOnInsert: reading },
        { upsert: true }
    );
}

// ========================================================
// 4. Dữ liệu mẫu invoices
// ========================================================
// Đơn giá: Điện 3,500 đ/kWh, Nước 15,000 đ/m3, Internet 100,000 đ/phòng, Rác 30,000 đ/phòng
const invoiceP101_T09 = ObjectId("653000000000000000000109");
const invoiceP101_T10 = ObjectId("653000000000000000000110");
const invoiceP102_T10 = ObjectId("653000000000000000000210");
const invoiceP201_T10 = ObjectId("653000000000000000000310");
const invoiceP203_T09 = ObjectId("653000000000000000000409");
const invoiceP203_T10 = ObjectId("653000000000000000000410");

const member3Invoices = [
    // 1. P101 Tháng 9: Đã thanh toán (PAID)
    {
        _id: invoiceP101_T09,
        roomId: room101._id,
        contractId: contract101._id,
        month: Int32(9),
        year: Int32(2026),
        rent: Double(2500000),
        services: [
            { name: "Electricity", quantity: Double(50), unitPrice: Double(3500), amount: Double(175000) },
            { name: "Water", quantity: Double(5), unitPrice: Double(15000), amount: Double(75000) },
            { name: "Internet", quantity: Double(1), unitPrice: Double(100000), amount: Double(100000) },
            { name: "Garbage", quantity: Double(1), unitPrice: Double(30000), amount: Double(30000) }
        ],
        total: Double(2880000), // 2500000 + 175000 + 75000 + 100000 + 30000
        status: "PAID",
        dueDate: new Date("2026-10-05T00:00:00Z"),
        createdAt: new Date("2026-10-01T08:00:00Z")
    },
    // 2. P101 Tháng 10: Thanh toán 1 phần (PARTIAL)
    {
        _id: invoiceP101_T10,
        roomId: room101._id,
        contractId: contract101._id,
        month: Int32(10),
        year: Int32(2026),
        rent: Double(2500000),
        services: [
            { name: "Electricity", quantity: Double(60), unitPrice: Double(3500), amount: Double(210000) },
            { name: "Water", quantity: Double(7), unitPrice: Double(15000), amount: Double(105000) },
            { name: "Internet", quantity: Double(1), unitPrice: Double(100000), amount: Double(100000) },
            { name: "Garbage", quantity: Double(1), unitPrice: Double(30000), amount: Double(30000) }
        ],
        total: Double(2945000), // 2500000 + 210000 + 105000 + 100000 + 30000
        status: "PARTIAL",
        dueDate: new Date("2026-10-10T00:00:00Z"),
        createdAt: new Date("2026-10-02T08:00:00Z")
    },
    // 3. P102 Tháng 10: Chưa thanh toán và QUÁ HẠN (dueDate < 08/10/2026) -> UNPAID & Overdue
    {
        _id: invoiceP102_T10,
        roomId: room102._id,
        contractId: contract102._id,
        month: Int32(10),
        year: Int32(2026),
        rent: Double(2800000),
        services: [
            { name: "Electricity", quantity: Double(60), unitPrice: Double(3500), amount: Double(210000) },
            { name: "Water", quantity: Double(7), unitPrice: Double(15000), amount: Double(105000) },
            { name: "Internet", quantity: Double(1), unitPrice: Double(100000), amount: Double(100000) },
            { name: "Garbage", quantity: Double(1), unitPrice: Double(30000), amount: Double(30000) },
            { name: "Parking", quantity: Double(1), unitPrice: Double(100000), amount: Double(100000) }
        ],
        total: Double(3345000),
        status: "UNPAID",
        dueDate: new Date("2026-10-05T00:00:00Z"), // Đã quá hạn
        createdAt: new Date("2026-10-01T09:00:00Z")
    },
    // 4. P201 Tháng 10: Chưa thanh toán nhưng CHƯA QUÁ HẠN -> UNPAID
    {
        _id: invoiceP201_T10,
        roomId: room201._id,
        contractId: contract201._id,
        month: Int32(10),
        year: Int32(2026),
        rent: Double(3000000),
        services: [
            { name: "Electricity", quantity: Double(80), unitPrice: Double(3500), amount: Double(280000) },
            { name: "Water", quantity: Double(10), unitPrice: Double(15000), amount: Double(150000) },
            { name: "Internet", quantity: Double(1), unitPrice: Double(100000), amount: Double(100000) },
            { name: "Garbage", quantity: Double(1), unitPrice: Double(30000), amount: Double(30000) }
        ],
        total: Double(3560000),
        status: "UNPAID",
        dueDate: new Date("2026-10-15T00:00:00Z"), // Chưa quá hạn
        createdAt: new Date("2026-10-01T10:00:00Z")
    },
    // 5. P203 Tháng 9: Đã thanh toán 2 đợt (PAID)
    {
        _id: invoiceP203_T09,
        roomId: room203._id,
        contractId: contract203._id,
        month: Int32(9),
        year: Int32(2026),
        rent: Double(3500000),
        services: [
            { name: "Electricity", quantity: Double(60), unitPrice: Double(3500), amount: Double(210000) },
            { name: "Water", quantity: Double(6), unitPrice: Double(15000), amount: Double(90000) },
            { name: "Internet", quantity: Double(1), unitPrice: Double(100000), amount: Double(100000) },
            { name: "Garbage", quantity: Double(1), unitPrice: Double(30000), amount: Double(30000) }
        ],
        total: Double(3930000),
        status: "PAID",
        dueDate: new Date("2026-10-05T00:00:00Z"),
        createdAt: new Date("2026-10-01T10:30:00Z")
    },
    // 6. P203 Tháng 10: Thanh toán 1 phần (PARTIAL)
    {
        _id: invoiceP203_T10,
        roomId: room203._id,
        contractId: contract203._id,
        month: Int32(10),
        year: Int32(2026),
        rent: Double(3500000),
        services: [
            { name: "Electricity", quantity: Double(70), unitPrice: Double(3500), amount: Double(245000) },
            { name: "Water", quantity: Double(7), unitPrice: Double(15000), amount: Double(105000) },
            { name: "Internet", quantity: Double(1), unitPrice: Double(100000), amount: Double(100000) },
            { name: "Garbage", quantity: Double(1), unitPrice: Double(30000), amount: Double(30000) }
        ],
        total: Double(3980000),
        status: "PARTIAL",
        dueDate: new Date("2026-10-12T00:00:00Z"),
        createdAt: new Date("2026-10-02T11:00:00Z")
    }
];

for (const invoice of member3Invoices) {
    db.invoices.updateOne(
        { _id: invoice._id },
        { $setOnInsert: invoice },
        { upsert: true }
    );
}

// ========================================================
// 5. Dữ liệu mẫu payments
// ========================================================
const member3Payments = [
    // 1. Thanh toán full cho invoiceP101_T09
    {
        _id: ObjectId("654000000000000000000001"),
        invoiceId: invoiceP101_T09,
        amount: Double(2880000),
        paymentMethod: "BANK_TRANSFER",
        paymentDate: new Date("2026-10-03T10:15:00Z"),
        status: "SUCCESS",
        note: "Chuyen khoan tien phong thang 9"
    },
    // 2. Thanh toán đợt 1 cho invoiceP101_T10 (trả 1,500,000 / 2,945,000 -> PARTIAL)
    {
        _id: ObjectId("654000000000000000000002"),
        invoiceId: invoiceP101_T10,
        amount: Double(1500000),
        paymentMethod: "CASH",
        paymentDate: new Date("2026-10-04T14:30:00Z"),
        status: "SUCCESS",
        note: "Dong truoc 1 phan tien phong thang 10"
    },
    // 3. Thanh toán đợt 1 cho invoiceP203_T09 (2,000,000 / 3,930,000)
    {
        _id: ObjectId("654000000000000000000003"),
        invoiceId: invoiceP203_T09,
        amount: Double(2000000),
        paymentMethod: "BANK_TRANSFER",
        paymentDate: new Date("2026-10-02T09:00:00Z"),
        status: "SUCCESS",
        note: "Chuyen khoan dot 1 thang 9"
    },
    // 4. Thanh toán đợt 2 cho invoiceP203_T09 (1,930,000 -> tong 3,930,000 -> PAID)
    {
        _id: ObjectId("654000000000000000000004"),
        invoiceId: invoiceP203_T09,
        amount: Double(1930000),
        paymentMethod: "CASH",
        paymentDate: new Date("2026-10-04T18:00:00Z"),
        status: "SUCCESS",
        note: "Thanh toan tien mat dot 2 tat toan hoa don thang 9"
    },
    // 5. Thanh toán đợt 1 cho invoiceP203_T10 (2,000,000 / 3,980,000 -> PARTIAL)
    {
        _id: ObjectId("654000000000000000000005"),
        invoiceId: invoiceP203_T10,
        amount: Double(2000000),
        paymentMethod: "BANK_TRANSFER",
        paymentDate: new Date("2026-10-05T11:20:00Z"),
        status: "SUCCESS",
        note: "Chuyen khoan dot 1 thang 10"
    },
    // 6. Giao dịch đang chờ xử lý (PENDING) cho invoiceP102_T10
    {
        _id: ObjectId("654000000000000000000006"),
        invoiceId: invoiceP102_T10,
        amount: Double(3345000),
        paymentMethod: "BANK_TRANSFER",
        paymentDate: new Date("2026-10-07T16:00:00Z"),
        status: "PENDING",
        note: "Chuyen khoan qua app cho xac nhan sao ke"
    },
    // 7. Giao dịch bị hủy (CANCELLED) cho invoiceP201_T10
    {
        _id: ObjectId("654000000000000000000007"),
        invoiceId: invoiceP201_T10,
        amount: Double(3560000),
        paymentMethod: "OTHER",
        paymentDate: new Date("2026-10-06T15:00:00Z"),
        status: "CANCELLED",
        note: "Giao dich vi dien tu that bai do loi mang"
    }
];

for (const payment of member3Payments) {
    db.payments.updateOne(
        { _id: payment._id },
        { $setOnInsert: payment },
        { upsert: true }
    );
}
