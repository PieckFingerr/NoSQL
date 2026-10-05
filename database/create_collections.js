// Create MongoDB collections for the boarding house management database

// Member 1: select the intended database in mongosh or Compass before running.
// Existing rooms/services collections receive the same validation rules.
const member1Validators = {
    rooms: {
        $jsonSchema: {
            bsonType: "object",
            required: ["roomNumber", "floor", "price", "area", "status"],
            properties: {
                _id: { bsonType: "objectId" },
                roomNumber: { bsonType: "string" },
                floor: { bsonType: "int", minimum: 0 },
                price: { bsonType: "double", minimum: 0 },
                area: { bsonType: "double", minimum: 0 },
                status: {
                    bsonType: "string",
                    enum: ["AVAILABLE", "OCCUPIED", "MAINTENANCE"]
                }
            }
        }
    },
    services: {
        $jsonSchema: {
            bsonType: "object",
            required: ["name", "unit", "price", "active"],
            properties: {
                _id: { bsonType: "objectId" },
                name: { bsonType: "string" },
                unit: { bsonType: "string" },
                price: { bsonType: "double", minimum: 0 },
                active: { bsonType: "bool" }
            }
        }
    }
};

for (const collectionName of Object.keys(member1Validators)) {
    const options = {
        validator: member1Validators[collectionName],
        validationLevel: "strict",
        validationAction: "error"
    };

    if (db.getCollectionInfos({ name: collectionName }).length === 0) {
        db.createCollection(collectionName, options);
    } else {
        const result = db.runCommand({ collMod: collectionName, ...options });
        if (result.ok !== 1) {
            throw new Error("Could not validate " + collectionName + ": " + result.errmsg);
        }
    }
}

// MongoDB validation does not assign defaults. Member 1 inserts explicitly
// supply active: true when no different active status is requested.
