use("QuanLyPhongTro_Test");
// Create MongoDB collections for the boarding house management database

// ========================================================
// Member 3 - Meter Readings, Invoices, Payments
// ========================================================
const member3Validators = {
    meter_readings: {
        $jsonSchema: {
            bsonType: "object",
            required: ["roomId", "month", "year", "electricity", "water", "recordedAt"],
            properties: {
                _id: { bsonType: "objectId" },
                roomId: {
                    bsonType: "objectId",
                    description: "Reference to rooms collection (must be valid ObjectId)"
                },
                month: {
                    bsonType: "int",
                    minimum: 1,
                    maximum: 12,
                    description: "Reading month, integer from 1 to 12"
                },
                year: {
                    bsonType: "int",
                    minimum: 2020,
                    description: "Reading year, integer >= 2020"
                },
                electricity: {
                    bsonType: "object",
                    required: ["oldIndex", "newIndex"],
                    description: "Embedded electricity meter reading",
                    properties: {
                        oldIndex: { bsonType: "double", minimum: 0 },
                        newIndex: { bsonType: "double", minimum: 0 }
                    }
                },
                water: {
                    bsonType: "object",
                    required: ["oldIndex", "newIndex"],
                    description: "Embedded water meter reading",
                    properties: {
                        oldIndex: { bsonType: "double", minimum: 0 },
                        newIndex: { bsonType: "double", minimum: 0 }
                    }
                },
                recordedAt: {
                    bsonType: "date",
                    description: "Timestamp when meter was recorded"
                }
            }
        },
        $expr: {
            $and: [
                { $gte: ["$electricity.newIndex", "$electricity.oldIndex"] },
                { $gte: ["$water.newIndex", "$water.oldIndex"] }
            ]
        }
    },
    invoices: {
        $jsonSchema: {
            bsonType: "object",
            required: ["roomId", "contractId", "month", "year", "rent", "services", "total", "status", "dueDate"],
            properties: {
                _id: { bsonType: "objectId" },
                roomId: {
                    bsonType: "objectId",
                    description: "Reference to rooms collection"
                },
                contractId: {
                    bsonType: "objectId",
                    description: "Reference to contracts collection"
                },
                month: {
                    bsonType: "int",
                    minimum: 1,
                    maximum: 12,
                    description: "Invoice month (1-12)"
                },
                year: {
                    bsonType: "int",
                    minimum: 2020,
                    description: "Invoice year (>= 2020)"
                },
                rent: {
                    bsonType: "double",
                    minimum: 0,
                    description: "Monthly room rent snapshot from contract"
                },
                services: {
                    bsonType: "array",
                    description: "Embedded array of services snapshot at invoice creation time",
                    items: {
                        bsonType: "object",
                        required: ["name", "quantity", "unitPrice", "amount"],
                        properties: {
                            name: { bsonType: "string" },
                            quantity: { bsonType: "double", minimum: 0 },
                            unitPrice: { bsonType: "double", minimum: 0 },
                            amount: { bsonType: "double", minimum: 0 }
                        }
                    }
                },
                total: {
                    bsonType: "double",
                    minimum: 0,
                    description: "Total invoice amount = rent + sum of services"
                },
                status: {
                    bsonType: "string",
                    enum: ["UNPAID", "PARTIAL", "PAID"],
                    description: "Invoice payment status"
                },
                dueDate: {
                    bsonType: "date",
                    description: "Payment due date"
                },
                createdAt: {
                    bsonType: "date",
                    description: "Creation timestamp"
                }
            }
        }
    },
    payments: {
        $jsonSchema: {
            bsonType: "object",
            required: ["invoiceId", "amount", "paymentMethod", "paymentDate", "status"],
            properties: {
                _id: { bsonType: "objectId" },
                invoiceId: {
                    bsonType: "objectId",
                    description: "Reference to invoices collection"
                },
                amount: {
                    bsonType: "double",
                    minimum: 0,
                    description: "Payment amount, double >= 0"
                },
                paymentMethod: {
                    bsonType: "string",
                    enum: ["CASH", "BANK_TRANSFER", "OTHER"],
                    description: "Payment method"
                },
                paymentDate: {
                    bsonType: "date",
                    description: "Payment date timestamp"
                },
                status: {
                    bsonType: "string",
                    enum: ["SUCCESS", "PENDING", "CANCELLED"],
                    description: "Payment status"
                },
                note: {
                    bsonType: "string",
                    description: "Optional notes for the payment"
                }
            }
        }
    }
};

// ========================================================
// Member 2 - Tenants, Contracts
// ========================================================
const member2Validators = {
    tenants: {
        $jsonSchema: {
            bsonType: "object",
            required: ["fullName", "phone", "email", "identityCard", "dateOfBirth"],
            properties: {
                _id: { bsonType: "objectId" },
                fullName: { bsonType: "string", description: "Ho va ten nguoi thue" },
                phone: { bsonType: "string", description: "So dien thoai" },
                email: { bsonType: "string", description: "Email" },
                identityCard: { bsonType: "string", description: "CCCD/CMND" },
                dateOfBirth: { bsonType: "date", description: "Ngay sinh" }
            }
        }
    },
    contracts: {
        $jsonSchema: {
            bsonType: "object",
            required: ["roomId", "tenantIds", "startDate", "endDate", "monthlyRent", "deposit", "status"],
            properties: {
                _id: { bsonType: "objectId" },
                roomId: { bsonType: "objectId", description: "Reference to rooms collection" },
                tenantIds: {
                    bsonType: "array",
                    items: { bsonType: "objectId" },
                    description: "Danh sach nguoi thue tham chieu den tenants"
                },
                startDate: { bsonType: "date", description: "Ngay bat dau hop dong" },
                endDate: { bsonType: "date", description: "Ngay ket thuc hop dong" },
                monthlyRent: { bsonType: "double", minimum: 0, description: "Tien thue hang thang" },
                deposit: { bsonType: "double", minimum: 0, description: "Tien coc" },
                status: {
                    bsonType: "string",
                    enum: ["ACTIVE", "EXPIRED", "TERMINATED"],
                    description: "Trang thai hop dong"
                }
            }
        }
    }
};

const allValidators = { ...member2Validators, ...member3Validators };

for (const collectionName of Object.keys(allValidators)) {
    const options = {
        validator: allValidators[collectionName],
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
