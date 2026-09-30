# 🏠 Quản Lý Phòng Trọ - MongoDB

## 📌 Giới thiệu

Đây là đồ án môn **NoSQL** với đề tài **Quản lý phòng trọ**, sử dụng **MongoDB** làm hệ quản trị cơ sở dữ liệu.

Đồ án tập trung vào việc thiết kế, xây dựng và thao tác với cơ sở dữ liệu MongoDB để hỗ trợ các nghiệp vụ cơ bản trong quản lý phòng trọ.

Các chức năng chính gồm:

- Quản lý phòng trọ
- Quản lý người thuê
- Quản lý hợp đồng
- Quản lý dịch vụ
- Quản lý chỉ số điện, nước
- Quản lý hóa đơn
- Quản lý thanh toán
- Tra cứu và thống kê dữ liệu

> Đồ án hiện tại tập trung vào phần **Database MongoDB**, chưa triển khai Website, Frontend hoặc Backend API.

---

## 👥 Thành viên

**Nhóm 15**

| STT | MSSV | Họ và tên |
| --- | --- | --- |
| 1 | 2001220582 | Phạm Sỹ Nguyên |
| 2 | 2001221047 | Châu Gia Vinh |
| 3 | 2001220528 | Nguyễn Võ Thiên Minh |

---

## 🛠 Công nghệ sử dụng

- MongoDB
- MongoDB Compass
- mongosh
- JavaScript
- Git
- GitHub
- Visual Studio Code

---

## 🗄️ Cấu trúc cơ sở dữ liệu

Hệ thống gồm 7 collection chính:

```text
QuanLyPhongTro
│
├── rooms
├── tenants
├── contracts
├── services
├── meter_readings
├── invoices
└── payments
```

### `rooms`

Lưu thông tin các phòng trọ.

Các thông tin chính:

- Mã phòng
- Số phòng
- Tầng
- Giá thuê
- Diện tích
- Trạng thái phòng

Trạng thái phòng gồm:

```text
AVAILABLE
OCCUPIED
MAINTENANCE
```

---

### `tenants`

Lưu thông tin người thuê.

Các thông tin chính:

- Họ tên
- Số điện thoại
- Email
- CCCD/CMND
- Ngày sinh

---

### `contracts`

Lưu thông tin hợp đồng thuê phòng.

Collection này liên kết phòng và người thuê với nhau.

Các thông tin chính:

- Phòng thuê
- Danh sách người thuê
- Ngày bắt đầu
- Ngày kết thúc
- Giá thuê hàng tháng
- Tiền cọc
- Trạng thái hợp đồng

Trạng thái hợp đồng gồm:

```text
ACTIVE
EXPIRED
TERMINATED
```

---

### `services`

Lưu danh sách các dịch vụ của khu trọ.

Ví dụ:

- Điện
- Nước
- Internet
- Rác
- Giữ xe

Các thông tin chính:

- Tên dịch vụ
- Đơn vị tính
- Đơn giá
- Trạng thái sử dụng

---

### `meter_readings`

Lưu chỉ số điện và nước của từng phòng theo từng tháng.

Các thông tin chính:

- Phòng
- Tháng
- Năm
- Chỉ số điện
- Chỉ số nước
- Thời gian ghi nhận

Chỉ số điện và nước được lưu dưới dạng Embedded Document.

Ví dụ:

```javascript
electricity: {
    oldIndex: 100,
    newIndex: 150
}

water: {
    oldIndex: 20,
    newIndex: 25
}
```

---

### `invoices`

Lưu thông tin hóa đơn hàng tháng của từng phòng.

Các thông tin chính:

- Phòng
- Hợp đồng
- Tháng
- Năm
- Tiền phòng
- Danh sách dịch vụ
- Tổng tiền
- Trạng thái hóa đơn
- Hạn thanh toán

Trạng thái hóa đơn gồm:

```text
UNPAID
PARTIAL
PAID
```

---

### `payments`

Lưu lịch sử thanh toán của các hóa đơn.

Các thông tin chính:

- Hóa đơn
- Số tiền thanh toán
- Phương thức thanh toán
- Ngày thanh toán
- Trạng thái

Phương thức thanh toán gồm:

```text
CASH
BANK_TRANSFER
OTHER
```

Trạng thái thanh toán gồm:

```text
SUCCESS
PENDING
CANCELLED
```

---

## 🔗 Quan hệ giữa các Collection

Các collection được liên kết với nhau thông qua `ObjectId`.

```text
rooms
  │
  │ roomId
  ▼
contracts
  │
  ├──────────────► tenants
  │                  tenantIds[]
  │
  │ contractId
  ▼
invoices
  │
  │ invoiceId
  ▼
payments
```

Ngoài ra:

```text
rooms
  │
  │ roomId
  ▼
meter_readings
```

Các liên kết chính:

```text
contracts.roomId
→ rooms._id
```

```text
contracts.tenantIds[]
→ tenants._id
```

```text
meter_readings.roomId
→ rooms._id
```

```text
invoices.roomId
→ rooms._id
```

```text
invoices.contractId
→ contracts._id
```

```text
payments.invoiceId
→ invoices._id
```
---

## 📂 Cấu trúc thư mục

```text
QuanLyPhongTro/
│
├── README.md
│
├── database/
│   │
│   ├── create_collections.js
│   ├── indexes.js
│   ├── sample_data.js
│   │
│   ├── member1/
│   │   ├── rooms.js
│   │   └── services.js
│   │
│   ├── member2/
│   │   ├── tenants.js
│   │   └── contracts.js
│   │
│   ├── member3/
│   │   ├── meter_readings.js
│   │   ├── invoices.js
│   │   └── payments.js
│   │
│   └── queries/
│       ├── basic_queries.js
│       └── aggregation.js
│
└── docs/
    └── report.docx
```
### Ý nghĩa các file và thư mục

#### `create_collections.js`

Chứa các câu lệnh dùng để tạo các collection cần thiết cho database.

#### `indexes.js`

Chứa các câu lệnh tạo index nhằm hỗ trợ tìm kiếm và truy vấn dữ liệu hiệu quả hơn.

#### `sample_data.js`

Chứa dữ liệu mẫu dùng để kiểm thử database.

#### `member1/`

Chứa các thao tác CRUD và truy vấn liên quan đến:

```text
rooms
services
```

#### `member2/`

Chứa các thao tác CRUD và truy vấn liên quan đến:

```text
tenants
contracts
```

#### `member3/`

Chứa các thao tác CRUD và truy vấn liên quan đến:

```text
meter_readings
invoices
payments
```

#### `queries/basic_queries.js`

Chứa các câu truy vấn cơ bản dùng để:

- Tìm kiếm dữ liệu
- Lọc dữ liệu
- Tra cứu dữ liệu
- Kiểm tra dữ liệu theo điều kiện

#### `queries/aggregation.js`

Chứa các truy vấn sử dụng MongoDB Aggregation Pipeline để thực hiện các thống kê.

#### `docs/`

Chứa báo cáo và các tài liệu liên quan đến đồ án.
---

## 🧪 Dữ liệu mẫu

Mỗi thành viên chịu trách nhiệm tạo dữ liệu mẫu cho các collection mình phụ trách.

Dữ liệu giữa các collection cần có sự liên kết hợp lệ.

Các trường tham chiếu quan trọng gồm:

```text
roomId
tenantIds
contractId
invoiceId
```

Các trường trên phải chứa `ObjectId` tương ứng với document tồn tại trong collection được tham chiếu.
