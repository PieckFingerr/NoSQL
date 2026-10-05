// CRUD and queries for rooms collection

// Run against the selected database after collection validation and indexes.
// Execute examples individually. P901 is separate from the sample rooms.

// CREATE / INSERT
// Insert a demonstration room if absent; rerunning does not duplicate it.
db.rooms.updateOne(
    { roomNumber: "P901" },
    {
        $setOnInsert: {
            roomNumber: "P901",
            floor: Int32(9),
            price: Double(4500000),
            area: Double(32),
            status: "AVAILABLE"
        }
    },
    { upsert: true }
);

// READ
db.rooms.find({});

db.rooms.findOne({ roomNumber: "P101" });

db.rooms.find({ floor: Int32(2) });

db.rooms.find({ status: "AVAILABLE" });

db.rooms.find({ status: "OCCUPIED" });

db.rooms.find({ status: "MAINTENANCE" });

// UPDATE
db.rooms.updateOne(
    { roomNumber: "P901" },
    { $set: { price: Double(4700000) } }
);

db.rooms.updateOne(
    { roomNumber: "P901" },
    { $set: { area: Double(34) } }
);

db.rooms.updateOne(
    { roomNumber: "P901" },
    { $set: { status: "OCCUPIED" } }
);

// DELETE
// Example only: uncomment to delete the demonstration room.
// db.rooms.deleteOne({ roomNumber: "P901" });
