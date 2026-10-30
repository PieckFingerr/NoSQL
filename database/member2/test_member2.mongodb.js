// Member 2: run create_collections.js, indexes.js, then sample_data.js
// against QuanLyPhongTro_Test before running this whole playground.
use("QuanLyPhongTro_Test");

{
    var passed = 0; // var: mongosh CLI dua function ra khoi block
    var failed = 0; // var: mongosh CLI dua function ra khoi block
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
    print("BAT DAU KIEM THU TOAN DIEN MEMBER 2 (tenants, contracts)");
    print("========================================================");

    // A. Kiem tra collection ton tai
    const names = db.getCollectionNames();
    check(names.includes("tenants"), "tenants exists");
    check(names.includes("contracts"), "contracts exists");

    if (!names.includes("tenants") || !names.includes("contracts")) {
        throw new Error("Vui long chay script database/create_collections.js truoc!");
    }

    // B. Kiem tra cac Indexes cua Member 2
    function hasIndex(indexes, keys, unique) {
        return indexes.some(idx => {
            const keyNames = Object.keys(idx.key);
            const targetNames = Object.keys(keys);
            if (keyNames.length !== targetNames.length) return false;
            const matchKeys = keyNames.every(k => idx.key[k] === keys[k]);
            return matchKeys && (!unique || idx.unique === true);
        });
    }

    const tenantIndexes = db.tenants.getIndexes();
    const contractIndexes = db.contracts.getIndexes();

    check(hasIndex(tenantIndexes, { phone: 1 }, false), "tenants index (phone)");
    check(hasIndex(tenantIndexes, { identityCard: 1 }, true), "tenants unique index (identityCard)");
    check(hasIndex(contractIndexes, { roomId: 1, status: 1 }, false), "contracts index (roomId, status)");
    check(hasIndex(contractIndexes, { roomId: 1 }, true), "contracts unique ACTIVE index (roomId)");
    check(hasIndex(contractIndexes, { endDate: 1, status: 1 }, false), "contracts index (endDate, status)");

    // C. Kiem tra so luong document mau ban dau
    print("tenants count: " + db.tenants.countDocuments());
    print("contracts count: " + db.contracts.countDocuments());

    // Tao ID test rieng biet de cleanup an toan, khong dong vao sample data
    const testTenantId1 = ObjectId();
    const testTenantId2 = ObjectId();
    const testRoomId = ObjectId();
    const testContractId1 = ObjectId();
    const testContractId2 = ObjectId();
    const expiringRoomId = ObjectId();
    const expiringTenantId = ObjectId();
    const expiringContractId = ObjectId();

    const createdTenantIds = [testTenantId1, testTenantId2, expiringTenantId];
    const createdRoomIds = [testRoomId, expiringRoomId];
    const createdContractIds = [testContractId1, testContractId2, expiringContractId];

    try {
        // ========================================================
        // D. TEST TENANTS
        // ========================================================
        print("\n--- 1. Testing tenants ---");

        // 1. Insert hop le
        const validTenant1 = {
            _id: testTenantId1,
            fullName: "Test Tenant 1",
            phone: "0911111111",
            email: "test1@email.com",
            identityCard: "111111111111",
            dateOfBirth: new Date("1990-01-01T00:00:00Z")
        };
        check(db.tenants.insertOne(validTenant1).acknowledged, "valid tenant 1 inserted");

        // 2. Reject duplicate identityCard (code 11000)
        expectFailure(() => {
            db.tenants.insertOne({
                _id: testTenantId2,
                fullName: "Test Tenant 2",
                phone: "0922222222",
                email: "test2@email.com",
                identityCard: "111111111111", // Trung lap
                dateOfBirth: new Date("1991-01-01T00:00:00Z")
            });
        }, 11000, "rejected duplicate identityCard");

        // 3. Tim kiem theo so dien thoai
        const foundByPhone = db.tenants.findOne({ phone: "0911111111" });
        check(foundByPhone !== null && foundByPhone.fullName === "Test Tenant 1", "find tenant by phone works");

        // 4. Tim kiem theo CCCD/CMND
        const foundByIdCard = db.tenants.findOne({ identityCard: "111111111111" });
        check(foundByIdCard !== null && foundByIdCard.fullName === "Test Tenant 1", "find tenant by identityCard works");

        // 5. Cap nhat thong tin nguoi thue
        const updateResult = db.tenants.updateOne(
            { _id: testTenantId1 },
            { $set: { phone: "0933333333" } }
        );
        check(updateResult.modifiedCount === 1, "update tenant phone works");
        const updatedTenant = db.tenants.findOne({ _id: testTenantId1 });
        check(updatedTenant.phone === "0933333333", "tenant phone updated correctly");

        // ========================================================
        // E. TEST CONTRACTS
        // ========================================================
        print("\n--- 2. Testing contracts ---");

        // Tao phong de test hop dong
        db.rooms.insertOne({
            _id: testRoomId,
            roomNumber: "P999",
            floor: Int32(1),
            price: Double(2000000),
            area: Double(15),
            status: "AVAILABLE"
        });

        // 1. Insert hop dong hop le
        const validContract1 = {
            _id: testContractId1,
            roomId: testRoomId,
            tenantIds: [testTenantId1],
            startDate: new Date("2026-01-01T00:00:00Z"),
            endDate: new Date("2026-12-31T00:00:00Z"),
            monthlyRent: Double(2000000),
            deposit: Double(2000000),
            status: "ACTIVE"
        };
        check(db.contracts.insertOne(validContract1).acknowledged, "valid contract 1 inserted");

        // MongoDB khong co trigger: thuc hien buoc cap nhat phong nhu createContract()
        db.rooms.updateOne({ _id: testRoomId }, { $set: { status: "OCCUPIED" } });

        // Kiem tra phong da duoc cap nhat thanh OCCUPIED
        const roomAfterContract = db.rooms.findOne({ _id: testRoomId });
        check(roomAfterContract.status === "OCCUPIED", "room status changed to OCCUPIED");

        // 2. Reject tao hop dong ACTIVE trung lap cho cung phong
        expectFailure(() => {
            db.contracts.insertOne({
                _id: testContractId2,
                roomId: testRoomId,
                tenantIds: [testTenantId1],
                startDate: new Date("2027-01-01T00:00:00Z"),
                endDate: new Date("2027-12-31T00:00:00Z"),
                monthlyRent: Double(2500000),
                deposit: Double(2500000),
                status: "ACTIVE" // Trung lap ACTIVE cho cung phong
            });
        }, 11000, "rejected duplicate ACTIVE contract for same room");

        // 3. Xem hop dong theo phong
        const contractsByRoom = db.contracts.find({ roomId: testRoomId }).toArray();
        check(contractsByRoom.length === 1, "get contracts by room works");

        // 4. Xem hop dong theo nguoi thue
        const contractsByTenant = db.contracts.find({ tenantIds: testTenantId1 }).toArray();
        check(contractsByTenant.length === 1, "get contracts by tenant works");

        // 5. Ket thuc hop dong
        db.contracts.updateOne(
            { _id: testContractId1 },
            { $set: { status: "TERMINATED" } }
        );
        // Nhu terminateContract(): tra phong ve AVAILABLE neu khong con hop dong ACTIVE
        if (!db.contracts.findOne({ roomId: testRoomId, status: "ACTIVE" })) {
            db.rooms.updateOne({ _id: testRoomId }, { $set: { status: "AVAILABLE" } });
        }
        const roomAfterTerminate = db.rooms.findOne({ _id: testRoomId });
        check(roomAfterTerminate.status === "AVAILABLE", "room status changed to AVAILABLE after terminate");

        // ========================================================
        // F. TEST EXPIRING CONTRACTS QUERY
        // ========================================================
        print("\n--- 3. Testing expiring contracts query ---");

        // Tao hop dong sap het han
        db.rooms.insertOne({
            _id: expiringRoomId,
            roomNumber: "P888",
            floor: Int32(2),
            price: Double(1500000),
            area: Double(12),
            status: "AVAILABLE"
        });
        db.tenants.insertOne({
            _id: expiringTenantId,
            fullName: "Expiring Tenant",
            phone: "0944444444",
            email: "expiring@email.com",
            identityCard: "444444444444",
            dateOfBirth: new Date("1992-01-01T00:00:00Z")
        });

        const daysFromNow = 15;
        const expiringDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
        db.contracts.insertOne({
            _id: expiringContractId,
            roomId: expiringRoomId,
            tenantIds: [expiringTenantId],
            startDate: new Date(),
            endDate: expiringDate,
            monthlyRent: Double(1500000),
            deposit: Double(1500000),
            status: "ACTIVE"
        });

        const now = new Date();
        const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringContracts = db.contracts.find({
            status: "ACTIVE",
            endDate: { $gte: now, $lte: futureDate }
        }).toArray();
        check(expiringContracts.length > 0, "find expiring contracts works");

    } finally {
        // ========================================================
        // H. CLEANUP DU LIEU TEST
        // ========================================================
        print("\n--- 4. Cleanup Test Data ---");
        for (const id of createdTenantIds) db.tenants.deleteOne({ _id: id });
        for (const id of createdContractIds) db.contracts.deleteOne({ _id: id });
        for (const id of createdRoomIds) db.rooms.deleteOne({ _id: id });

        check(db.tenants.countDocuments({ _id: { $in: createdTenantIds } }) === 0, "test tenants cleaned up");
        check(db.contracts.countDocuments({ _id: { $in: createdContractIds } }) === 0, "test contracts cleaned up");
        check(db.rooms.countDocuments({ _id: { $in: createdRoomIds } }) === 0, "test rooms cleaned up");

        print("========================================================");
        print("KET QUA KIEM THU MEMBER 2: " + passed + " PASSED, " + failed + " FAILED.");
        print("========================================================");
    }

    if (failed > 0) {
        throw new Error("Kiem thu Member 2 that bai! Vui long kiem tra cac muc FAIL.");
    }
}
