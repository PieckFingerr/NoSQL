// Common MongoDB queries for the project

// Member 1: rooms and services
db.rooms.find({ status: "AVAILABLE" });

db.rooms.find({ status: "OCCUPIED" });

db.rooms.find({ status: "MAINTENANCE" });

db.rooms.findOne({ roomNumber: "P101" });

db.rooms.find({ floor: Int32(2) });

db.services.find({ active: true });
