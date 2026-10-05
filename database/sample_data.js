// Insert sample data for testing

// Member 1: run create_collections.js and indexes.js first in the same database.
// Prices are in VND; room prices are monthly and areas are in square metres.
// $setOnInsert makes reruns safe and preserves edits to existing records.
const member1Rooms = [
    { roomNumber: "P101", floor: Int32(1), price: Double(2500000), area: Double(18), status: "AVAILABLE" },
    { roomNumber: "P102", floor: Int32(1), price: Double(2800000), area: Double(20), status: "OCCUPIED" },
    { roomNumber: "P103", floor: Int32(1), price: Double(3000000), area: Double(22), status: "MAINTENANCE" },
    { roomNumber: "P201", floor: Int32(2), price: Double(3000000), area: Double(22), status: "OCCUPIED" },
    { roomNumber: "P202", floor: Int32(2), price: Double(3200000), area: Double(24), status: "AVAILABLE" },
    { roomNumber: "P203", floor: Int32(2), price: Double(3500000), area: Double(26), status: "OCCUPIED" },
    { roomNumber: "P301", floor: Int32(3), price: Double(3300000), area: Double(24), status: "AVAILABLE" },
    { roomNumber: "P302", floor: Int32(3), price: Double(3500000), area: Double(26), status: "MAINTENANCE" },
    { roomNumber: "P303", floor: Int32(3), price: Double(3800000), area: Double(28), status: "OCCUPIED" },
    { roomNumber: "P304", floor: Int32(3), price: Double(4000000), area: Double(30), status: "AVAILABLE" }
];

for (const room of member1Rooms) {
    db.rooms.updateOne(
        { roomNumber: room.roomNumber },
        { $setOnInsert: room },
        { upsert: true }
    );
}

const member1Services = [
    { name: "Electricity", unit: "kWh", price: Double(3500), active: true },
    { name: "Water", unit: "m3", price: Double(15000), active: true },
    { name: "Internet", unit: "room/month", price: Double(100000), active: true },
    { name: "Garbage", unit: "room/month", price: Double(30000), active: true },
    { name: "Parking", unit: "motorbike/month", price: Double(100000), active: true }
];

for (const service of member1Services) {
    db.services.updateOne(
        { name: service.name },
        { $setOnInsert: service },
        { upsert: true }
    );
}
