use("QuanLyPhongTro_Test");
// ========================================================
// Member 3 - CRUD & Nghiệp Vụ Quản Lý Chỉ Số Điện Nước (meter_readings)
// ========================================================

// 1. CREATE: Nhập chỉ số điện nước tháng mới cho một phòng
// Quy tắc nghiệp vụ:
// - newIndex >= oldIndex cho cả điện và nước.
// - Nếu không nhập oldIndex, hệ thống tự động tìm newIndex của kỳ trước liền kề để làm oldIndex.
function recordMeterReading(roomId, month, year, electricityReading, waterReading) {
    // Tự động tìm chỉ số kỳ trước nếu chưa có oldIndex
    let elecOld = electricityReading.oldIndex;
    let waterOld = waterReading.oldIndex;

    if (elecOld === undefined || waterOld === undefined) {
        const lastReading = db.meter_readings.find({ roomId: roomId })
            .sort({ year: -1, month: -1 })
            .limit(1)
            .toArray()[0];

        if (lastReading) {
            if (elecOld === undefined) elecOld = lastReading.electricity.newIndex;
            if (waterOld === undefined) waterOld = lastReading.water.newIndex;
        } else {
            if (elecOld === undefined) elecOld = 0.0;
            if (waterOld === undefined) waterOld = 0.0;
        }
    }

    // Kiểm tra quy tắc nghiệp vụ: chỉ số mới không được nhỏ hơn chỉ số cũ
    if (electricityReading.newIndex < elecOld) {
        throw new Error("Loi nghiep vu: Chi so dien moi (" + electricityReading.newIndex + ") khong duoc nho hon chi so cu (" + elecOld + ")!");
    }
    if (waterReading.newIndex < waterOld) {
        throw new Error("Loi nghiep vu: Chi so nuoc moi (" + waterReading.newIndex + ") khong duoc nho hon chi so cu (" + waterOld + ")!");
    }

    const doc = {
        roomId: roomId,
        month: Int32(month),
        year: Int32(year),
        electricity: {
            oldIndex: Double(elecOld),
            newIndex: Double(electricityReading.newIndex)
        },
        water: {
            oldIndex: Double(waterOld),
            newIndex: Double(waterReading.newIndex)
        },
        recordedAt: new Date()
    };

    return db.meter_readings.insertOne(doc);
}

// 2. READ: Xem lịch sử điện nước theo phòng (sắp xếp giảm dần theo thời gian)
function getRoomMeterHistory(roomId) {
    return db.meter_readings.aggregate([
        { $match: { roomId: roomId } },
        { $sort: { year: -1, month: -1 } },
        {
            $project: {
                roomId: 1,
                month: 1,
                year: 1,
                recordedAt: 1,
                electricity: 1,
                water: 1,
                // Tính lượng điện & nước tiêu thụ
                electricityUsage: { $subtract: ["$electricity.newIndex", "$electricity.oldIndex"] },
                waterUsage: { $subtract: ["$water.newIndex", "$water.oldIndex"] }
            }
        }
    ]).toArray();
}

// 3. READ: Xem lịch sử ghi nhận điện nước của tất cả các phòng theo tháng/năm
function getMeterReadingsByPeriod(month, year) {
    return db.meter_readings.aggregate([
        { $match: { month: Int32(month), year: Int32(year) } },
        {
            $lookup: {
                from: "rooms",
                localField: "roomId",
                foreignField: "_id",
                as: "roomInfo"
            }
        },
        { $unwind: "$roomInfo" },
        {
            $project: {
                roomNumber: "$roomInfo.roomNumber",
                month: 1,
                year: 1,
                electricityOld: "$electricity.oldIndex",
                electricityNew: "$electricity.newIndex",
                electricityUsed: { $subtract: ["$electricity.newIndex", "$electricity.oldIndex"] },
                waterOld: "$water.oldIndex",
                waterNew: "$water.newIndex",
                waterUsed: { $subtract: ["$water.newIndex", "$water.oldIndex"] },
                recordedAt: 1
            }
        },
        { $sort: { roomNumber: 1 } }
    ]).toArray();
}

// 4. UPDATE: Hiệu chỉnh chỉ số điện nước (ví dụ khi nhân viên nhập nhầm)
function updateMeterReading(readingId, newElecIndex, newWaterIndex) {
    const reading = db.meter_readings.findOne({ _id: readingId });
    if (!reading) {
        throw new Error("Khong tim thay ban ghi chi so voi id: " + readingId);
    }

    if (newElecIndex < reading.electricity.oldIndex) {
        throw new Error("Chi so dien moi khong duoc nho hon chi so cu!");
    }
    if (newWaterIndex < reading.water.oldIndex) {
        throw new Error("Chi so nuoc moi khong duoc nho hon chi so cu!");
    }

    return db.meter_readings.updateOne(
        { _id: readingId },
        {
            $set: {
                "electricity.newIndex": Double(newElecIndex),
                "water.newIndex": Double(newWaterIndex),
                recordedAt: new Date()
            }
        }
    );
}

// 5. DELETE: Xóa chỉ số
function deleteMeterReading(readingId) {
    return db.meter_readings.deleteOne({ _id: readingId });
}

// ========================================================
// DEMO CHẠY THỬ CRUD & ROLLBACK DỮ LIỆU TẠM
// ========================================================
{
    const tempRoom = db.rooms.findOne() || { _id: ObjectId() };
    const tempReadingId = ObjectId();

    print(">>> 1. INSERT DEMO METER READING:");
    db.meter_readings.insertOne({
        _id: tempReadingId,
        roomId: tempRoom._id,
        month: Int32(11),
        year: Int32(2026),
        electricity: { oldIndex: Double(100), newIndex: Double(165) },
        water: { oldIndex: Double(20), newIndex: Double(28) },
        recordedAt: new Date()
    });

    try {
        print(">>> 2. READ DEMO METER HISTORY FOR ROOM:");
        const history = getRoomMeterHistory(tempRoom._id);
        printjson(history);

        print(">>> 3. UPDATE DEMO METER READING:");
        db.meter_readings.updateOne(
            { _id: tempReadingId },
            { $set: { "electricity.newIndex": Double(170) } }
        );
        const updated = db.meter_readings.findOne({ _id: tempReadingId });
        printjson(updated);
    } finally {
        print(">>> 4. DELETE DEMO RECORD (CLEANUP):");
        db.meter_readings.deleteOne({ _id: tempReadingId });
        print("Cleanup demo meter reading completed.");
    }
}
