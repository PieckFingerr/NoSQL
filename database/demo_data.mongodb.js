// Supplemental data only. Run after sample_data.js in the SAME database.
// No database selection or destructive reset; existing member files stay intact.
{
    // Repair the known sample integration mismatch: an active lease occupies P101.
    const p101 = db.rooms.findOne({ roomNumber: "P101" });
    if (p101 && db.contracts.findOne({ roomId: p101._id, status: "ACTIVE" })) {
        db.rooms.updateOne({ _id: p101._id, status: "AVAILABLE" }, { $set: { status: "OCCUPIED" } });
    }
    const demoTenantId = ObjectId("660000000000000000000001");
    db.tenants.updateOne({ _id: demoTenantId }, { $setOnInsert: {
        fullName: "Vo Minh Anh", phone: "0945678901", email: "minhanh@example.com",
        identityCard: "005678901234", dateOfBirth: new Date("2000-06-15T00:00:00Z")
    } }, { upsert: true });
    // Historical contracts on an available room demonstrate all contract statuses.
    const historicalRoom = db.rooms.findOne({ roomNumber: "P202" });
    if (historicalRoom) {
        db.contracts.updateOne({ _id: ObjectId("660000000000000000000002") }, { $setOnInsert: {
            roomId: historicalRoom._id, tenantIds: [demoTenantId],
            startDate: new Date("2024-01-01T00:00:00Z"), endDate: new Date("2024-12-31T00:00:00Z"),
            monthlyRent: Double(3200000), deposit: Double(3200000), status: "EXPIRED"
        } }, { upsert: true });
        db.contracts.updateOne({ _id: ObjectId("660000000000000000000003") }, { $setOnInsert: {
            roomId: historicalRoom._id, tenantIds: [demoTenantId],
            startDate: new Date("2025-01-01T00:00:00Z"), endDate: new Date("2025-06-30T00:00:00Z"),
            monthlyRent: Double(3200000), deposit: Double(3200000), status: "TERMINATED"
        } }, { upsert: true });
    }
    // A relative-date room keeps the expiring-contract demo useful in future years.
    const demoRoomId = ObjectId("660000000000000000000004");
    db.rooms.updateOne({ _id: demoRoomId }, { $setOnInsert: {
        roomNumber: "DEMO-EXPIRING", floor: Int32(4), price: Double(2900000), area: Double(20), status: "OCCUPIED"
    } }, { upsert: true });
    db.contracts.updateOne({ _id: ObjectId("660000000000000000000005") }, { $setOnInsert: {
        roomId: demoRoomId, tenantIds: [demoTenantId],
        startDate: new Date(Date.now() - 15 * 86400000), endDate: new Date(Date.now() + 15 * 86400000),
        monthlyRent: Double(2900000), deposit: Double(2900000), status: "ACTIVE"
    } }, { upsert: true });
}
