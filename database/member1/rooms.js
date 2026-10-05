// Member 1: rooms CRUD examples. Select the intended database first.
// Run the whole block; updates and cleanup affect only this run's example.
{
    const exampleId = ObjectId();
    const exampleName = "__MEMBER1_EXAMPLE_ROOM_" + exampleId.toString();
    // CREATE
    db.rooms.insertOne({
        _id: exampleId, roomNumber: exampleName,
        floor: Int32(1), price: Double(2500000), area: Double(20), status: "AVAILABLE"
    });
    try {
        // READ
        db.rooms.find({});
        db.rooms.findOne({ roomNumber: "P101" });
        db.rooms.find({ floor: Int32(2) });
        db.rooms.find({ status: "AVAILABLE" });
        db.rooms.find({ status: "OCCUPIED" });
        db.rooms.find({ status: "MAINTENANCE" });

        // UPDATE
        db.rooms.updateOne(
            { _id: exampleId, roomNumber: exampleName },
            { $set: { price: Double(2700000) } }
        );
        db.rooms.updateOne(
            { _id: exampleId, roomNumber: exampleName },
            { $set: { area: Double(22) } }
        );
        db.rooms.updateOne(
            { _id: exampleId, roomNumber: exampleName },
            { $set: { status: "OCCUPIED" } }
        );
    } finally {
        // DELETE: only the temporary example inserted above.
        db.rooms.deleteOne({ _id: exampleId, roomNumber: exampleName });
    }
}
