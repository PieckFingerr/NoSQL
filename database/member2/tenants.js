use("QuanLyPhongTro_Test");
// ========================================================
// Member 2 - CRUD & Nghiep Vu Quan Ly Nguoi Thue (tenants)
// ========================================================

// 1. CREATE: Them nguoi thue moi
function createTenant(fullName, phone, email, identityCard, dateOfBirth) {
    const existing = db.tenants.findOne({ identityCard: identityCard });
    if (existing) {
        throw new Error("CCCD/CMND da ton he thoi!");
    }
    const existingPhone = db.tenants.findOne({ phone: phone });
    if (existingPhone) {
        throw new Error("So dien thoai da ton tai!");
    }

    const tenantDoc = {
        fullName: fullName,
        phone: phone,
        email: email,
        identityCard: identityCard,
        dateOfBirth: new Date(dateOfBirth),
        createdAt: new Date()
    };

    return db.tenants.insertOne(tenantDoc);
}

// 2. READ: Lay thong tin nguoi thue theo ID
function getTenantById(tenantId) {
    return db.tenants.findOne({ _id: tenantId });
}

// 3. READ: Tim nguoi thue theo so dien thoai
function getTenantByPhone(phone) {
    return db.tenants.findOne({ phone: phone });
}

// 4. READ: Tim nguoi thue theo CCCD/CMND
function getTenantByIdentityCard(identityCard) {
    return db.tenants.findOne({ identityCard: identityCard });
}

// 5. READ: Xem tat ca nguoi thue
function getAllTenants() {
    return db.tenants.find().toArray();
}

// 6. UPDATE: Cap nhat thong tin nguoi thue
function updateTenant(tenantId, updates) {
    const tenant = db.tenants.findOne({ _id: tenantId });
    if (!tenant) {
        throw new Error("Khong tim thay nguoi thue voi id: " + tenantId);
    }

    if (updates.identityCard && updates.identityCard !== tenant.identityCard) {
        const existing = db.tenants.findOne({ identityCard: updates.identityCard });
        if (existing) {
            throw new Error("CCCD/CMND da ton tai!");
        }
    }

    if (updates.phone && updates.phone !== tenant.phone) {
        const existingPhone = db.tenants.findOne({ phone: updates.phone });
        if (existingPhone) {
            throw new Error("So dien thoai da ton tai!");
        }
    }

    return db.tenants.updateOne(
        { _id: tenantId },
        { $set: updates }
    );
}

// 7. DELETE: Xoa nguoi thue (chi duoc xoa khi khong co hop dong)
function deleteTenant(tenantId) {
    const contractCount = db.contracts.countDocuments({ tenantIds: tenantId });
    if (contractCount > 0) {
        throw new Error("Khong the xoa nguoi thue dang co hop dong!");
    }
    return db.tenants.deleteOne({ _id: tenantId });
}

// ========================================================
// DEMO CHAY THU CRUD NGUOI THUE
// ========================================================
{
    const tempTenantId = ObjectId();

    print(">>> 1. INSERT DEMO TENANT:");
    db.tenants.insertOne({
        _id: tempTenantId,
        fullName: "Demo Tenant",
        phone: "0999999999",
        email: "demo@email.com",
        identityCard: "999999999999",
        dateOfBirth: new Date("1990-01-01T00:00:00Z"),
        createdAt: new Date()
    });

    try {
        print(">>> 2. READ TENANT BY PHONE:");
        const byPhone = getTenantByPhone("0999999999");
        printjson(byPhone);

        print(">>> 3. READ TENANT BY IDENTITY CARD:");
        const byIdCard = getTenantByIdentityCard("999999999999");
        printjson(byIdCard);

        print(">>> 4. UPDATE TENANT:");
        updateTenant(tempTenantId, { phone: "0988888888" });
        const updated = getTenantById(tempTenantId);
        printjson(updated);

        print(">>> 5. GET ALL TENANTS:");
        const all = getAllTenants();
        printjson(all);
    } finally {
        print(">>> 6. DELETE DEMO TENANT (CLEANUP):");
        db.tenants.deleteOne({ _id: tempTenantId });
        print("Cleanup demo tenant completed.");
    }
}
