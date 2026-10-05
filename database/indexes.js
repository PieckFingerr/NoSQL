// Create indexes for MongoDB collections

// Member 1: these calls preserve all existing indexes.
db.rooms.createIndex({ roomNumber: 1 }, { unique: true });
db.rooms.createIndex({ status: 1 });
db.services.createIndex({ name: 1 }, { unique: true });
