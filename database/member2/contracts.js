use("QuanLyPhongTro_Test");
// ========================================================
// Member 2 - CRUD & Nghiep Vu Quan Ly Hop Dong (contracts)
// ========================================================

// 1. CREATE: Tao hop dong moi
// Quy tac nghiep vu:
// - Khong duoc tao hop dong ACTIVE moi neu phong dang co hop dong ACTIVE.
// - Khi hop dang co hieu luc: rooms.status = OCCUPIED
function createContract(roomId, tenantIds, startDate, endDate, monthlyRent, deposit) {
    // Kiem tra phong da co hop dong ACTIVE chua
    const existingActive = db.contracts.findOne({
        roomId: roomId,
        status: "ACTIVE"
    });
    if (existingActive) {
        throw new Error("Phong dang co hop dong ACTIVE. Khong the tao hop dong moi!");
    }

    // Kiem tra room ton tai
    const room = db.rooms.findOne({ _id: roomId });
    if (!room) {
        throw new Error("Khong tim thay phong!");
    }

    // Kiem tra tat ca tenantIds ton tai
    for (const tenantId of tenantIds) {
        const tenant = db.tenants.findOne({ _id: tenantId });
        if (!tenant) {
            throw new Error("Khong tim thay nguoi thue voi id: " + tenantId);
        }
    }

    const contractDoc = {
        roomId: roomId,
        tenantIds: tenantIds,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent: Double(monthlyRent),
        deposit: Double(deposit),
        status: "ACTIVE",
        createdAt: new Date()
    };

    const result = db.contracts.insertOne(contractDoc);

    // Cap nhat trang thai phong thanh OCCUPIED
    db.rooms.updateOne(
        { _id: roomId },
        { $set: { status: "OCCUPIED" } }
    );

    return result;
}

// 2. READ: Xem tat ca hop dong
function getAllContracts() {
    return db.contracts.find().toArray();
}

// 3. READ: Xem hop dong theo phong
function getContractsByRoom(roomId) {
    return db.contracts.find({ roomId: roomId }).toArray();
}

// 4. READ: Xem hop dong theo nguoi thue
function getContractsByTenant(tenantId) {
    return db.contracts.find({ tenantIds: tenantId }).toArray();
}

// 5. READ: Tim hop dong sap het han (trong so ngay tro den)
function getExpiringContracts(days) {
    const currentDate = new Date();
    const futureDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000);

    return db.contracts.find({
        status: "ACTIVE",
        endDate: {
            $gte: currentDate,
            $lte: futureDate
        }
    }).toArray();
}

// 6. READ: Lay thong tin hop dong theo ID
function getContractById(contractId) {
    return db.contracts.findOne({ _id: contractId });
}

// 7. UPDATE: Gia han hop dong
function renewContract(contractId, newEndDate) {
    const contract = db.contracts.findOne({ _id: contractId });
    if (!contract) {
        throw new Error("Khong tim thay hop dong voi id: " + contractId);
    }

    if (contract.status !== "ACTIVE") {
        throw new Error("Chi co the gia han hop dong co trang thai ACTIVE!");
    }

    return db.contracts.updateOne(
        { _id: contractId },
        {
            $set: {
                endDate: new Date(newEndDate),
                status: "ACTIVE",
                updatedAt: new Date()
            }
        }
    );
}

// 8. UPDATE: Ket thuc hop dong
function terminateContract(contractId) {
    const contract = db.contracts.findOne({ _id: contractId });
    if (!contract) {
        throw new Error("Khong tim thay hop dong voi id: " + contractId);
    }

    const result = db.contracts.updateOne(
        { _id: contractId },
        {
            $set: {
                status: "TERMINATED",
                updatedAt: new Date()
            }
        }
    );

    // Cap nhat trang thai phong thanh AVAILABLE neu khong co hop dong ACTIVE khac cho phong nay
    const otherActive = db.contracts.findOne({
        roomId: contract.roomId,
        status: "ACTIVE",
        _id: { $ne: contractId }
    });
    if (!otherActive) {
        db.rooms.updateOne(
            { _id: contract.roomId },
            { $set: { status: "AVAILABLE" } }
        );
    }

    return result;
}

// 9. DELETE: Xoa hop dong (chi duoc xoa khi chua co hoa don)
function deleteContract(contractId) {
    const contract = db.contracts.findOne({ _id: contractId });
    if (!contract) {
        throw new Error("Khong tim thay hop dong voi id: " + contractId);
    }

    const invoiceCount = db.invoices.countDocuments({ contractId: contractId });
    if (invoiceCount > 0) {
        throw new Error("Khong the xoa hop dong da co hoa don!");
    }

    const result = db.contracts.deleteOne({ _id: contractId });

    // Cap nhat trang thai phong thanh AVAILABLE neu khong co hop dong ACTIVE khac
    const otherActive = db.contracts.findOne({
        roomId: contract.roomId,
        status: "ACTIVE"
    });
    if (!otherActive) {
        db.rooms.updateOne(
            { _id: contract.roomId },
            { $set: { status: "AVAILABLE" } }
        );
    }

    return result;
}

// 10. UPDATE: Chuyen cac hop dong ACTIVE da qua endDate sang EXPIRED
// Phong duoc tra ve AVAILABLE neu khong con hop dong ACTIVE (giu nguyen MAINTENANCE)
function expireContracts(asOfDate) {
    const now = asOfDate ? new Date(asOfDate) : new Date();
    const expired = db.contracts.find({
        status: "ACTIVE",
        endDate: { $lt: now }
    }).toArray();

    for (const contract of expired) {
        db.contracts.updateOne(
            { _id: contract._id, status: "ACTIVE" },
            { $set: { status: "EXPIRED", updatedAt: new Date() } }
        );

        const otherActive = db.contracts.findOne({
            roomId: contract.roomId,
            status: "ACTIVE"
        });
        if (!otherActive) {
            db.rooms.updateOne(
                { _id: contract.roomId, status: "OCCUPIED" },
                { $set: { status: "AVAILABLE" } }
            );
        }
    }

    return { expiredCount: expired.length, contractIds: expired.map(c => c._id) };
}

// ========================================================
// DEMO CHAY THU CRUD HOP DONG
// ========================================================
{
    const tempRoomId = ObjectId();
    const tempTenantId = ObjectId();
    let tempContractId = null;

    print(">>> 1. TAO PHONG VA NGUOI THUE DEMO:");
    db.rooms.insertOne({
        _id: tempRoomId,
        roomNumber: "P999",
        floor: Int32(1),
        price: Double(2000000),
        area: Double(15),
        status: "AVAILABLE"
    });
    db.tenants.insertOne({
        _id: tempTenantId,
        fullName: "Demo Tenant",
        phone: "0900000000",
        email: "demo@email.com",
        identityCard: "888888888888",
        dateOfBirth: new Date("1995-01-01T00:00:00Z")
    });

    try {
        print(">>> 2. TAO HOP DONG MOI:");
        const contractResult = createContract(
            tempRoomId,
            [tempTenantId],
            new Date("2026-01-01T00:00:00Z"),
            new Date("2026-12-31T00:00:00Z"),
            2000000,
            2000000
        );
        printjson(contractResult);
        tempContractId = contractResult.insertedId;

        // Kiem tra trang thai phong
        const roomAfter = db.rooms.findOne({ _id: tempRoomId });
        print("Trang thai phong sau khi tao hop dong: " + roomAfter.status);

        print(">>> 3. THU TAO HOP DONG ACTIVE TRUNG LAP (PHAI THAT BAI):");
        try {
            createContract(
                tempRoomId,
                [tempTenantId],
                new Date("2026-02-01T00:00:00Z"),
                new Date("2027-01-31T00:00:00Z"),
                2500000,
                2500000
            );
            print("LOI: Duoc phep tao hop dong trung lap ACTIVE!");
        } catch (e) {
            print("Dung: " + e.message);
        }

        print(">>> 4. XEM HOP DONG THEO PHONG:");
        const byRoom = getContractsByRoom(tempRoomId);
        printjson(byRoom);

        print(">>> 5. XEM HOP DONG THEO NGUOI THUE:");
        const byTenant = getContractsByTenant(tempTenantId);
        printjson(byTenant);

        print(">>> 6. GIA HAN HOP DONG:");
        renewContract(tempContractId, new Date("2027-12-31T00:00:00Z"));
        const renewed = getContractById(tempContractId);
        printjson(renewed);

        print(">>> 7. KET THUC HOP DONG:");
        terminateContract(tempContractId);
        const terminated = getContractById(tempContractId);
        printjson(terminated);

        // Kiem tra trang thai phong sau khi ket thuc
        const roomAfterTerm = db.rooms.findOne({ _id: tempRoomId });
        print("Trang thai phong sau khi ket thuc hop dong: " + roomAfterTerm.status);
    } finally {
        print(">>> 8. CLEANUP DEMO DATA:");
        // Xoa theo roomId de don ca hop dong tao ra truoc khi buoc nao do loi
        db.contracts.deleteMany({ roomId: tempRoomId });
        db.tenants.deleteOne({ _id: tempTenantId });
        db.rooms.deleteOne({ _id: tempRoomId });
        print("Cleanup demo contract completed.");
    }
}
