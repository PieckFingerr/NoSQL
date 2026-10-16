// Member 1: run create_collections.js, indexes.js, then sample_data.js
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
        // These writes intentionally fail; unrelated errors are failures too.
        try {
            action();
            check(false, label + " (unexpectedly accepted)");
        } catch (e) {
            check(e.code === code, label + " (expected code " + code + ", got " + e.code + ")");
        }
    }

    // A. Collection existence: do not implicitly create missing collections.
    const names = db.getCollectionNames();
    check(names.includes("rooms"), "rooms exists");
    check(names.includes("services"), "services exists");
    if (!names.includes("rooms") || !names.includes("services")) {
        throw new Error("Run the setup scripts in QuanLyPhongTro_Test first.");
    }

    // C. Show and verify the required indexes before inserting anything.
    const roomIndexes = db.rooms.getIndexes();
    const serviceIndexes = db.services.getIndexes();
    printjson(roomIndexes);
    printjson(serviceIndexes);
    function hasIndex(indexes, field, unique) {
        return indexes.some(index => Object.keys(index.key).length === 1 &&
            index.key[field] === 1 && (!unique || index.unique === true));
    }
    check(hasIndex(roomIndexes, "roomNumber", true), "unique roomNumber index");
    check(hasIndex(roomIndexes, "status", false), "status index");
    check(hasIndex(serviceIndexes, "name", true), "unique service name index");

    // E. Counts before temporary documents are created; existing data may add more.
    print("rooms.countDocuments(): " + db.rooms.countDocuments());
    print("services.countDocuments(): " + db.services.countDocuments());
    check(db.rooms.countDocuments({ roomNumber: { $in: [
        "P101", "P102", "P103", "P201", "P202", "P203", "P301", "P302", "P303", "P304"
    ] } }) === 10, "ten named sample rooms exist");
    check(db.services.countDocuments({ name: { $in: [
        "Electricity", "Water", "Internet", "Garbage", "Parking"
    ] } }) === 5, "five named sample services exist");

    // Every attempted insert has its own ObjectId. Cleanup includes documents
    // unexpectedly accepted when validators/indexes are missing, never sample data.
    const roomIds = [ObjectId(), ObjectId(), ObjectId(), ObjectId()];
    const serviceIds = [ObjectId(), ObjectId()];
    const prefix = "__MEMBER1_TEST_" + roomIds[0].toString();
    const room = {
        _id: roomIds[0], roomNumber: prefix + "_ROOM", floor: Int32(1),
        price: Double(2500000), area: Double(20), status: "AVAILABLE"
    };
    const service = {
        _id: serviceIds[0], name: prefix + "_SERVICE", unit: "month",
        price: Double(100000), active: true
    };
    try {
        // B. Valid BSON types must succeed.
        check(db.rooms.insertOne(room).acknowledged, "valid room inserted");
        check(db.services.insertOne(service).acknowledged, "valid service inserted");
        // Expected validation errors: MongoDB code 121.
        expectFailure(() => db.rooms.insertOne({
            ...room, _id: roomIds[1], roomNumber: prefix + "_NEGATIVE", floor: Int32(-1)
        }), 121, "negative floor rejected");
        expectFailure(() => db.rooms.insertOne({
            ...room, _id: roomIds[2], roomNumber: prefix + "_INVALID", status: "INVALID_STATUS"
        }), 121, "invalid room status rejected");

        // D. Expected duplicate-key errors: code 11000, on different _id values.
        expectFailure(() => db.rooms.insertOne({ ...room, _id: roomIds[3] }),
            11000, "duplicate roomNumber rejected");
        expectFailure(() => db.services.insertOne({ ...service, _id: serviceIds[1] }),
            11000, "duplicate service name rejected");

        // F. Display query results, and verify the temporary records are found.
        printjson(db.rooms.find({ status: "AVAILABLE" }).toArray());
        printjson(db.services.find({ active: true }).toArray());
        check(db.rooms.countDocuments({ _id: room._id, status: "AVAILABLE" }) === 1,
            "AVAILABLE query finds temporary room");
        check(db.services.countDocuments({ _id: service._id, active: true }) === 1,
            "active query finds temporary service");

        // G. CRUD updates on temporary records only; inspect persisted results.
        check(db.rooms.updateOne({ _id: room._id }, { $set: {
            price: Double(2700000), area: Double(22), status: "OCCUPIED"
        } }).modifiedCount === 1, "temporary room updated");
        check(db.rooms.countDocuments({ _id: room._id, price: Double(2700000),
            area: Double(22), status: "OCCUPIED" }) === 1, "room update persisted");
        check(db.services.updateOne({ _id: service._id }, { $set: {
            price: Double(120000), active: false
        } }).modifiedCount === 1, "temporary service updated");
        check(db.services.countDocuments({ _id: service._id, price: Double(120000),
            active: false }) === 1, "service update persisted");
    } finally {
        // H. Exact per-run IDs only; cleanup runs even after unexpected errors.
        for (const id of roomIds) db.rooms.deleteOne({ _id: id });
        for (const id of serviceIds) db.services.deleteOne({ _id: id });
        check(db.rooms.countDocuments({ _id: { $in: roomIds } }) === 0, "temporary rooms cleaned up");
        check(db.services.countDocuments({ _id: { $in: serviceIds } }) === 0, "temporary services cleaned up");
        print("Member 1 tests: " + passed + " passed, " + failed + " failed.");
    }
    if (failed > 0) throw new Error("Member 1 verification failed; review FAIL messages.");
}
