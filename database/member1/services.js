// CRUD and queries for services collection

// Execute examples individually after collection validation and indexes.
// Laundry is separate from the five sample services; prices are in VND.

// CREATE / INSERT
// Explicit active: true implements the insert default (MongoDB has no defaults).
db.services.updateOne(
    { name: "Laundry" },
    {
        $setOnInsert: {
            name: "Laundry",
            unit: "kg",
            price: Double(20000),
            active: true
        }
    },
    { upsert: true }
);

// READ
db.services.find({});

db.services.findOne({ name: "Electricity" });

db.services.find({ active: true });

// UPDATE
db.services.updateOne(
    { name: "Laundry" },
    { $set: { price: Double(25000) } }
);

db.services.updateOne(
    { name: "Laundry" },
    { $set: { active: false } }
);

// DELETE
// Example only: uncomment to delete the demonstration service.
// db.services.deleteOne({ name: "Laundry" });
