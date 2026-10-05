// Member 1: services CRUD examples. Select the intended database first.
// Run the whole block; updates and cleanup affect only this run's example.
{
    const exampleId = ObjectId();
    const exampleName = "__MEMBER1_EXAMPLE_SERVICE_" + exampleId.toString();
    // CREATE
    db.services.insertOne({
        _id: exampleId, name: exampleName,
        unit: "kg", price: Double(20000), active: true
    });
    try {
        // READ
        db.services.find({});
        db.services.findOne({ name: "Electricity" });
        db.services.find({ active: true });

        // UPDATE
        db.services.updateOne(
            { _id: exampleId, name: exampleName },
            { $set: { price: Double(25000) } }
        );
        db.services.updateOne(
            { _id: exampleId, name: exampleName },
            { $set: { active: false } }
        );
    } finally {
        // DELETE: only the temporary example inserted above.
        db.services.deleteOne({ _id: exampleId, name: exampleName });
    }
}
