use("QuanLyPhongTro_Test");
// MongoDB aggregation queries and statistics
// ========================================================
// Member 3: Mục 2.4 - 9 Truy Vấn & Thống Kê Báo Cáo
// ========================================================

// --------------------------------------------------------
// 1. Danh sách phòng đang trống (AVAILABLE)
// Mục đích: Giúp chủ trọ biết phòng nào sẵn sàng đón khách thuê mới
// --------------------------------------------------------
db.rooms.aggregate([
    {
        $match: {
            status: "AVAILABLE"
        }
    },
    {
        $project: {
            _id: 1,
            roomNumber: 1,
            floor: 1,
            price: 1,
            area: 1,
            status: 1
        }
    },
    {
        $sort: { floor: 1, roomNumber: 1 }
    }
]);

// --------------------------------------------------------
// 2. Danh sách hợp đồng sắp hết hạn (trong vòng 30 ngày tới)
// Mục đích: Chủ trọ chủ động liên hệ gia hạn hợp đồng hoặc chuẩn bị phòng
// --------------------------------------------------------
const currentDate = new Date();
const next30Days = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

db.contracts.aggregate([
    {
        $match: {
            status: "ACTIVE",
            endDate: {
                $gte: currentDate,
                $lte: next30Days
            }
        }
    },
    {
        $lookup: {
            from: "rooms",
            localField: "roomId",
            foreignField: "_id",
            as: "room"
        }
    },
    { $unwind: "$room" },
    {
        $lookup: {
            from: "tenants",
            localField: "tenantIds",
            foreignField: "_id",
            as: "tenants"
        }
    },
    {
        $project: {
            contractId: "$_id",
            roomNumber: "$room.roomNumber",
            startDate: 1,
            endDate: 1,
            monthlyRent: 1,
            deposit: 1,
            tenantNames: "$tenants.fullName",
            daysLeft: {
                $ceil: {
                    $divide: [{ $subtract: ["$endDate", currentDate] }, 1000 * 60 * 60 * 24]
                }
            }
        }
    },
    {
        $sort: { endDate: 1 }
    }
]);

// --------------------------------------------------------
// 3. Lịch sử điện nước của một phòng (kèm tính lượng tiêu thụ)
// Mục đích: Theo dõi sự biến động chỉ số điện nước theo từng tháng của 1 phòng
// --------------------------------------------------------
const targetRoom = db.rooms.findOne({ roomNumber: "P101" });
const targetRoomId = targetRoom ? targetRoom._id : ObjectId("651a00000000000000000101");

db.meter_readings.aggregate([
    {
        $match: {
            roomId: targetRoomId
        }
    },
    {
        $lookup: {
            from: "rooms",
            localField: "roomId",
            foreignField: "_id",
            as: "room"
        }
    },
    { $unwind: "$room" },
    {
        $project: {
            roomNumber: "$room.roomNumber",
            month: 1,
            year: 1,
            electricityOld: "$electricity.oldIndex",
            electricityNew: "$electricity.newIndex",
            electricityUsage: { $subtract: ["$electricity.newIndex", "$electricity.oldIndex"] },
            waterOld: "$water.oldIndex",
            waterNew: "$water.newIndex",
            waterUsage: { $subtract: ["$water.newIndex", "$water.oldIndex"] },
            recordedAt: 1
        }
    },
    {
        $sort: { year: -1, month: -1 }
    }
]);

// --------------------------------------------------------
// 4. Hóa đơn chưa thanh toán (UNPAID hoặc PARTIAL)
// Mục đích: Thống kê các khoản nợ tiền phòng của từng phòng
// --------------------------------------------------------
db.invoices.aggregate([
    {
        $match: {
            status: { $in: ["UNPAID", "PARTIAL"] }
        }
    },
    {
        $lookup: {
            from: "rooms",
            localField: "roomId",
            foreignField: "_id",
            as: "room"
        }
    },
    { $unwind: "$room" },
    {
        $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "invoiceId",
            as: "payments"
        }
    },
    {
        $addFields: {
            totalPaid: {
                $sum: {
                    $map: {
                        input: {
                            $filter: {
                                input: "$payments",
                                as: "p",
                                cond: { $eq: ["$$p.status", "SUCCESS"] }
                            }
                        },
                        as: "validPayment",
                        in: "$$validPayment.amount"
                    }
                }
            }
        }
    },
    {
        $project: {
            roomNumber: "$room.roomNumber",
            month: 1,
            year: 1,
            totalInvoice: "$total",
            totalPaid: 1,
            remainingDebt: { $subtract: ["$total", "$totalPaid"] },
            status: 1,
            dueDate: 1
        }
    },
    {
        $sort: { dueDate: 1 }
    }
]);

// --------------------------------------------------------
// 5. Hóa đơn quá hạn (dueDate < ngày hiện tại và chưa tất toán)
// Mục đích: Cảnh báo những hóa đơn trễ hạn để chủ trọ gửi nhắc nhở
// --------------------------------------------------------
db.invoices.aggregate([
    {
        $match: {
            status: { $in: ["UNPAID", "PARTIAL"] },
            dueDate: { $lt: new Date() }
        }
    },
    {
        $lookup: {
            from: "rooms",
            localField: "roomId",
            foreignField: "_id",
            as: "room"
        }
    },
    { $unwind: "$room" },
    {
        $project: {
            roomNumber: "$room.roomNumber",
            month: 1,
            year: 1,
            total: 1,
            status: 1,
            dueDate: 1,
            daysOverdue: {
                $floor: {
                    $divide: [{ $subtract: [new Date(), "$dueDate"] }, 1000 * 60 * 60 * 24]
                }
            }
        }
    },
    {
        $sort: { daysOverdue: -1 }
    }
]);

// --------------------------------------------------------
// 6. Doanh thu theo tháng
// Mục đích: Thống kê tổng số tiền thu được từ các giao dịch thanh toán thành công theo tháng
// --------------------------------------------------------
db.payments.aggregate([
    {
        $match: {
            status: "SUCCESS"
        }
    },
    {
        $group: {
            _id: {
                year: { $year: "$paymentDate" },
                month: { $month: "$paymentDate" }
            },
            totalRevenue: { $sum: "$amount" },
            transactionCount: { $sum: 1 }
        }
    },
    {
        $project: {
            _id: 0,
            year: "$_id.year",
            month: "$_id.month",
            totalRevenue: 1,
            transactionCount: 1
        }
    },
    {
        $sort: { year: -1, month: -1 }
    }
]);

// --------------------------------------------------------
// 7. Tổng lượng điện tiêu thụ theo tháng
// Mục đích: Theo dõi tổng lượng điện tiêu thụ toàn khu trọ theo từng tháng
// --------------------------------------------------------
db.meter_readings.aggregate([
    {
        $group: {
            _id: {
                year: "$year",
                month: "$month"
            },
            totalElectricityUsage: {
                $sum: { $subtract: ["$electricity.newIndex", "$electricity.oldIndex"] }
            },
            totalRoomsRecorded: { $sum: 1 }
        }
    },
    {
        $project: {
            _id: 0,
            year: "$_id.year",
            month: "$_id.month",
            totalElectricityUsage: 1,
            totalRoomsRecorded: 1,
            averageUsagePerRoom: {
                $round: [{ $divide: ["$totalElectricityUsage", "$totalRoomsRecorded"] }, 2]
            }
        }
    },
    {
        $sort: { year: -1, month: -1 }
    }
]);

// --------------------------------------------------------
// 8. Tổng lượng nước tiêu thụ theo tháng
// Mục đích: Theo dõi tổng lượng nước tiêu thụ toàn khu trọ theo từng tháng
// --------------------------------------------------------
db.meter_readings.aggregate([
    {
        $group: {
            _id: {
                year: "$year",
                month: "$month"
            },
            totalWaterUsage: {
                $sum: { $subtract: ["$water.newIndex", "$water.oldIndex"] }
            },
            totalRoomsRecorded: { $sum: 1 }
        }
    },
    {
        $project: {
            _id: 0,
            year: "$_id.year",
            month: "$_id.month",
            totalWaterUsage: 1,
            totalRoomsRecorded: 1,
            averageUsagePerRoom: {
                $round: [{ $divide: ["$totalWaterUsage", "$totalRoomsRecorded"] }, 2]
            }
        }
    },
    {
        $sort: { year: -1, month: -1 }
    }
]);

// --------------------------------------------------------
// 9. Lịch sử thuê của một người thuê
// Mục đích: Tra cứu toàn bộ các hợp đồng và phòng mà một khách thuê đã từng/đang thuê
// --------------------------------------------------------
db.contracts.aggregate([
    { $unwind: "$tenantIds" },
    {
        $lookup: {
            from: "tenants",
            localField: "tenantIds",
            foreignField: "_id",
            as: "tenant"
        }
    },
    { $unwind: "$tenant" },
    {
        $lookup: {
            from: "rooms",
            localField: "roomId",
            foreignField: "_id",
            as: "room"
        }
    },
    { $unwind: "$room" },
    {
        $project: {
            tenantId: "$tenant._id",
            tenantName: "$tenant.fullName",
            idCard: "$tenant.idCard",
            phone: "$tenant.phone",
            roomNumber: "$room.roomNumber",
            floor: "$room.floor",
            monthlyRent: 1,
            deposit: 1,
            startDate: 1,
            endDate: 1,
            contractStatus: "$status"
        }
    },
    {
        $sort: { startDate: -1 }
    }
]);
