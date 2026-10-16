// Member 3: run create_collections.js, indexes.js, then sample_data.js
// against QuanLyPhongTro_Test before running this whole playground.
use("QuanLyPhongTro_Test");

{
    let passed = 0;
    let failed = 0;
    function check(condition, label) {
        print((condition ? "PASS: " : "FAIL: ") + label);
        if (condition) passed++; else failed++;
    }
    function expectFailure(action, code, label) {
        try {
            action();
            check(false, label + " (unexpectedly accepted)");
        } catch (e) {
            check(e.code === code, label + " (expected code " + code + ", got " + e.code + ")");
        }
    }

    print("========================================================");
    print("BAT DAU KIEM THU TOAN DIEN MEMBER 3 (meter_readings, invoices, payments)");
    print("========================================================");

    // A. Kiem tra collection ton tai
    const names = db.getCollectionNames();
    check(names.includes("meter_readings"), "meter_readings exists");
    check(names.includes("invoices"), "invoices exists");
    check(names.includes("payments"), "payments exists");

    if (!names.includes("meter_readings") || !names.includes("invoices") || !names.includes("payments")) {
        throw new Error("Vui long chay script database/create_collections.js truoc!");
    }

    // B. Kiem tra cac Indexes cua Member 3
    function hasIndex(indexes, keys, unique) {
        return indexes.some(idx => {
            const keyNames = Object.keys(idx.key);
            const targetNames = Object.keys(keys);
            if (keyNames.length !== targetNames.length) return false;
            const matchKeys = keyNames.every(k => idx.key[k] === keys[k]);
            return matchKeys && (!unique || idx.unique === true);
        });
    }

    const mrIndexes = db.meter_readings.getIndexes();
    const invIndexes = db.invoices.getIndexes();
    const payIndexes = db.payments.getIndexes();

    check(hasIndex(mrIndexes, { roomId: 1, year: 1, month: 1 }, true), "meter_readings unique compound index (roomId, year, month)");
    check(hasIndex(invIndexes, { roomId: 1, year: 1, month: 1 }, true), "invoices unique compound index (roomId, year, month)");
    check(hasIndex(payIndexes, { invoiceId: 1 }, false), "payments index (invoiceId)");

    // C. Kiem tra so luong document mau ban dau
    print("meter_readings count: " + db.meter_readings.countDocuments());
    print("invoices count: " + db.invoices.countDocuments());
    print("payments count: " + db.payments.countDocuments());

    // Tao ID test rieng biet de cleanup an toan, khong dong vao sample data
    const testRoomId = ObjectId();
    const testContractId = ObjectId();
    const readingId1 = ObjectId();
    const readingId2 = ObjectId();
    const readingId3 = ObjectId();
    const invoiceId1 = ObjectId();
    const invoiceId2 = ObjectId();
    const paymentId1 = ObjectId();
    const paymentId2 = ObjectId();
    const paymentId3 = ObjectId();

    const createdReadingIds = [readingId1, readingId2, readingId3];
    const createdInvoiceIds = [invoiceId1, invoiceId2];
    const createdPaymentIds = [paymentId1, paymentId2, paymentId3];

    try {
        // ========================================================
        // D. TEST METER_READINGS
        // ========================================================
        print("\n--- 1. Testing meter_readings ---");

        // 1. Insert hop le
        const validReading = {
            _id: readingId1,
            roomId: testRoomId,
            month: Int32(11),
            year: Int32(2026),
            electricity: { oldIndex: Double(100), newIndex: Double(160) }, // dung 60 kWh
            water: { oldIndex: Double(20), newIndex: Double(28) },         // dung 8 m3
            recordedAt: new Date()
        };
        check(db.meter_readings.insertOne(validReading).acknowledged, "valid meter_reading inserted");

        // 2. Reject khi newIndex < oldIndex (quy tac nghiep vu: code 121)
        expectFailure(() => {
            db.meter_readings.insertOne({
                _id: readingId2,
                roomId: testRoomId,
                month: Int32(12),
                year: Int32(2026),
                electricity: { oldIndex: Double(160), newIndex: Double(140) }, // LOI: newIndex < oldIndex
                water: { oldIndex: Double(28), newIndex: Double(35) },
                recordedAt: new Date()
            });
        }, 121, "rejected electricity newIndex < oldIndex");

        // 3. Reject duplicate index (cung roomId, month, year: code 11000)
        expectFailure(() => {
            db.meter_readings.insertOne({
                _id: readingId3,
                roomId: testRoomId,
                month: Int32(11), // Cung thang 11/2026 voi validReading
                year: Int32(2026),
                electricity: { oldIndex: Double(100), newIndex: Double(180) },
                water: { oldIndex: Double(20), newIndex: Double(30) },
                recordedAt: new Date()
            });
        }, 11000, "rejected duplicate meter reading for same room and month/year");

        // ========================================================
        // E. TEST INVOICES
        // ========================================================
        print("\n--- 2. Testing invoices ---");

        // 1. Insert invoice hop le
        const validInvoice = {
            _id: invoiceId1,
            roomId: testRoomId,
            contractId: testContractId,
            month: Int32(11),
            year: Int32(2026),
            rent: Double(2500000),
            services: [
                { name: "Electricity", quantity: Double(60), unitPrice: Double(3500), amount: Double(210000) },
                { name: "Water", quantity: Double(8), unitPrice: Double(15000), amount: Double(120000) }
            ],
            total: Double(2830000), // 2500000 + 210000 + 120000
            status: "UNPAID",
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            createdAt: new Date()
        };
        check(db.invoices.insertOne(validInvoice).acknowledged, "valid invoice inserted");

        // 2. Reject invoice sai enum status (code 121)
        expectFailure(() => {
            db.invoices.insertOne({
                ...validInvoice,
                _id: ObjectId(),
                status: "UNKNOWN_STATUS"
            });
        }, 121, "rejected invalid invoice status enum");

        // 3. Reject duplicate invoice cho cung 1 phong trong 1 thang/nam (code 11000)
        expectFailure(() => {
            db.invoices.insertOne({
                ...validInvoice,
                _id: invoiceId2
            });
        }, 11000, "rejected duplicate invoice for same room and month/year");

        // ========================================================
        // F. TEST PAYMENTS & MULTI-PAYMENT WORKFLOW
        // ========================================================
        print("\n--- 3. Testing payments & multi-installment workflow ---");

        // 1. Reject payment sai amount (amount < 0: code 121)
        expectFailure(() => {
            db.payments.insertOne({
                _id: ObjectId(),
                invoiceId: invoiceId1,
                amount: Double(-500000),
                paymentMethod: "CASH",
                paymentDate: new Date(),
                status: "SUCCESS"
            });
        }, 121, "rejected negative payment amount");

        // 2. Thanh toan dot 1 (1,000,000 VND < total 2,830,000 VND)
        check(db.payments.insertOne({
            _id: paymentId1,
            invoiceId: invoiceId1,
            amount: Double(1000000),
            paymentMethod: "CASH",
            paymentDate: new Date(),
            status: "SUCCESS",
            note: "Dot 1 thanh toan"
        }).acknowledged, "payment installment 1 inserted");

        // Tinh tong va cap nhat trang thai invoice thanh PARTIAL
        let paidAgg1 = db.payments.aggregate([
            { $match: { invoiceId: invoiceId1, status: "SUCCESS" } },
            { $group: { _id: "$invoiceId", totalPaid: { $sum: "$amount" } } }
        ]).toArray();
        let totalPaid1 = paidAgg1[0].totalPaid;
        check(totalPaid1 === 1000000, "total paid after installment 1 is 1,000,000");

        db.invoices.updateOne(
            { _id: invoiceId1 },
            { $set: { status: totalPaid1 >= validInvoice.total ? "PAID" : "PARTIAL" } }
        );
        let invoiceAfterDot1 = db.invoices.findOne({ _id: invoiceId1 });
        check(invoiceAfterDot1.status === "PARTIAL", "invoice transitioned to PARTIAL");

        // 3. Thanh toan dot 2 (1,830,000 VND -> tat toan du 2,830,000 VND)
        check(db.payments.insertOne({
            _id: paymentId2,
            invoiceId: invoiceId1,
            amount: Double(1830000),
            paymentMethod: "BANK_TRANSFER",
            paymentDate: new Date(),
            status: "SUCCESS",
            note: "Dot 2 tat toan hoa don"
        }).acknowledged, "payment installment 2 inserted");

        let paidAgg2 = db.payments.aggregate([
            { $match: { invoiceId: invoiceId1, status: "SUCCESS" } },
            { $group: { _id: "$invoiceId", totalPaid: { $sum: "$amount" } } }
        ]).toArray();
        let totalPaid2 = paidAgg2[0].totalPaid;
        check(totalPaid2 === 2830000, "total paid after installment 2 is 2,830,000");

        db.invoices.updateOne(
            { _id: invoiceId1 },
            { $set: { status: totalPaid2 >= validInvoice.total ? "PAID" : "PARTIAL" } }
        );
        let invoiceAfterDot2 = db.invoices.findOne({ _id: invoiceId1 });
        check(invoiceAfterDot2.status === "PAID", "invoice transitioned to PAID");

        // ========================================================
        // G. TEST AGGREGATION & STATISTICS QUERIES
        // ========================================================
        print("\n--- 4. Testing Aggregation Queries ---");

        // Test doanh thu theo thang
        const revenueAgg = db.payments.aggregate([
            { $match: { status: "SUCCESS" } },
            {
                $group: {
                    _id: { year: { $year: "$paymentDate" }, month: { $month: "$paymentDate" } },
                    total: { $sum: "$amount" }
                }
            }
        ]).toArray();
        check(revenueAgg.length > 0, "monthly revenue aggregation returns data");

        // Test luong dien tieu thu theo thang
        const elecAgg = db.meter_readings.aggregate([
            {
                $group: {
                    _id: { year: "$year", month: "$month" },
                    totalElec: { $sum: { $subtract: ["$electricity.newIndex", "$electricity.oldIndex"] } }
                }
            }
        ]).toArray();
        check(elecAgg.length > 0, "monthly electricity consumption aggregation returns data");

        // Test luong nuoc tieu thu theo thang
        const waterAgg = db.meter_readings.aggregate([
            {
                $group: {
                    _id: { year: "$year", month: "$month" },
                    totalWater: { $sum: { $subtract: ["$water.newIndex", "$water.oldIndex"] } }
                }
            }
        ]).toArray();
        check(waterAgg.length > 0, "monthly water consumption aggregation returns data");

    } finally {
        // ========================================================
        // H. CLEANUP DU LIEU TEST
        // ========================================================
        print("\n--- 5. Cleanup Test Data ---");
        for (const id of createdReadingIds) db.meter_readings.deleteOne({ _id: id });
        for (const id of createdInvoiceIds) db.invoices.deleteOne({ _id: id });
        for (const id of createdPaymentIds) db.payments.deleteOne({ _id: id });

        check(db.meter_readings.countDocuments({ _id: { $in: createdReadingIds } }) === 0, "test meter_readings cleaned up");
        check(db.invoices.countDocuments({ _id: { $in: createdInvoiceIds } }) === 0, "test invoices cleaned up");
        check(db.payments.countDocuments({ _id: { $in: createdPaymentIds } }) === 0, "test payments cleaned up");

        print("========================================================");
        print("KET QUA KIEM THU MEMBER 3: " + passed + " PASSED, " + failed + " FAILED.");
        print("========================================================");
    }

    if (failed > 0) {
        throw new Error("Kiem thu Member 3 that bai! Vui long kiem tra cac muc FAIL.");
    }
}
