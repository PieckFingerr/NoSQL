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

---

## WEB APPLICATION

The repository now includes a local boarding house management web application.
The original NoSQL/database documentation above is retained as project history.
The seven business schemas are unchanged; `users` is the only auxiliary collection.
No deployment, Docker, hosting service, or CI/CD workflow is required or included.

### Technology stack and folders

- Frontend: HTML5, CSS3, vanilla JavaScript and native fetch; VS Code Live Server.
- Backend: Node.js 20+, Express, official MongoDB Node.js Driver, dotenv, cors,
  helmet, bcryptjs, jsonwebtoken and multer. Native Node watch mode handles development.
- Database: MongoDB Atlas, accessed only by the backend.

```text
backend/
  .env.example             # Local configuration template; .env is ignored
  package.json             # Install/start/setup/seed/admin/test commands
  backups/.gitkeep         # Business JSON backups; backup JSON is ignored
  src/
    server.js              # Local listener, graceful startup/shutdown
    app.js                 # Express middleware and API registration
    config/database.js     # Reused connection and transactional write queue
    middleware/            # JWT/ADMIN checks, uploads, centralized errors
    controllers/users.js   # Authentication and user administration
    routes/                # Resource APIs, reports, dashboard, data tools
    services/              # Business rules, aggregation pipelines, backup tools
    utils/                 # BSON-aware input validation and response helpers
    scripts/               # Explicit setup, seed, admin creation, syntax check
  test/                    # Offline tests and isolated live integration tests
frontend/
  login.html, index.html
  users.html, rooms.html, tenants.html, contracts.html, services.html
  meter-readings.html, invoices.html, payments.html
  reports.html, data-management.html
  css/style.css
  js/                      # Shared API/auth/UI helpers and page scripts
  # No npm installation or frontend build step
```

### MongoDB Atlas and .env setup

1. In your existing Atlas project, create a database user with read/write access
   to the demonstration database. The explicit setup command also needs permission
   to create collections, modify validators and create indexes.
2. Add your local public IP to Atlas Network Access. Copy the **Drivers / Node.js**
   connection string, including the actual cluster hostname and database user.
   URL-encode special characters in the username/password.
3. From the repository root:

```powershell
cd backend
npm install
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

If `.env` already exists, edit it instead of overwriting it. Set:

```dotenv
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=QuanLyPhongTro
FRONTEND_URL=http://127.0.0.1:5500
JWT_SECRET=change_this_secret
```

The URI and JWT values above are placeholders. Replace them locally with the real
Atlas URI and generated random secret. The backend rejects example credentials
and short/default JWT secrets. Never put these secrets into frontend scripts,
screenshots or Git. `.gitignore` excludes `backend/.env` and backup JSON.

Atlas supports the transactions used by this application. A standalone local
mongod without a replica set does not support this workflow. One local API process
is supported; the frontend and backend themselves are not hosted in the cloud.

### Database initialization and realistic demo data

Run these explicit commands from `backend` after configuring `.env`:

```powershell
npm run db:setup
npm run db:seed
npm run user:create-admin
```

`db:setup` reuses the validators and indexes in the original repository files
against **MONGODB_DB_NAME**. It ignores the playground's hardcoded `use()` selection,
creates the seven collections, and adds the unique username index and a partial
unique ACTIVE-contract room index. It never seeds or deletes business documents.

`db:seed` is optional and explicit. It runs the existing `sample_data.js`, followed
by `database/demo_data.mongodb.js`, adapting simple mongosh calls to the async Node
driver. `$setOnInsert` preserves existing sample edits on reruns. Use a disposable
university demo database when presenting restore or experimenting with member scripts.
Nothing runs automatically on server startup.

The supplemental script fixes P101's original AVAILABLE/ACTIVE mismatch, adds a
fifth tenant, EXPIRED and TERMINATED contract examples, and a separate room with
an ACTIVE contract ending about 15 days after the first seed. It does not overwrite
member files. A fresh seed includes 11 rooms, 5 tenants, 7 contracts, 5 services,
8 readings over two months, 6 invoices and 7 payments. All referenced IDs exist.
The sample contains every requested room/invoice/payment status and all payment
methods. Fixed billing data uses September/October 2026; select October 2026 in
Dashboard/Reports to show it. The new-room workflow can use the current month.

For Compass/VS Code playground work, select the same database as `.env` and run
collection setup, indexes, sample data, then supplemental demo data. The original
`create_collections.js` explicitly selects `QuanLyPhongTro_Test`; change only the
playground copy's `use()` line if targeting another database. The supplied setup
command avoids this mismatch without editing the source file. Do not run original
member demo/test scripts on real production data; they are standalone coursework
examples, and some Member 2 tests expect side effects that database validators
alone cannot provide.

Identified integration inconsistencies are handled in the web app without schema
changes: the original rental-history aggregation references `idCard` instead of
`identityCard`, and its contract-count projection does not project the grouped
`count`. The web reports use the actual schema and correct counters. Member 3's
fallback prices are replaced with explicit missing-rate errors in invoice creation.

### Default/demo user creation

There is no committed default password or public registration endpoint.
`npm run user:create-admin` prompts for username, full name and a password of at
least 10 characters (maximum 72 UTF-8 bytes). The CLI password prompt is visible;
use a private terminal. Passwords are stored only as bcrypt hashes.
Alternatively, set ADMIN_USERNAME, ADMIN_FULL_NAME and ADMIN_PASSWORD temporarily
in the private `.env`, run the command, then remove the plaintext ADMIN_PASSWORD.
The command creates an admin; it never silently resets an existing account.

Log in as ADMIN to add MANAGER accounts. Managers can use business management and
reports; Users and Data Management require ADMIN. Deactivated accounts immediately
lose API access, and the last active administrator and your own account are protected.

### Backend and frontend startup

Backend:

```powershell
cd backend
npm run dev
# Or: npm start
```

Expected API: `http://localhost:5000/api`.
Read-only connectivity check: `http://localhost:5000/api/health`.
Startup prints a success message after a database ping, and exits cleanly with an
explanation if configuration or Atlas connectivity fails. It never seeds on startup.

Frontend:

1. Open the repository root in VS Code.
2. Install/enable the VS Code **Live Server** extension.
3. Right-click `frontend/login.html` ? **Open with Live Server**.
4. With the repository root as the served folder, open
   `http://127.0.0.1:5500/frontend/login.html`.
   If you open only `frontend/` as the VS Code folder, the URL is
   `http://127.0.0.1:5500/login.html` instead. Both use the same allowed origin.
5. Log in using the administrator created above.

No frontend npm or bundler is required. `frontend/js/api.js` talks to
`http://localhost:5000/api` and attaches the session JWT. If Live Server uses
`localhost:5500`, either open `127.0.0.1:5500` or add that origin to FRONTEND_URL
(comma-separated allowed origins). Do not open HTML directly using file://.

### APIs, CRUD and business functions

See [complete API reference](docs/WEB_API.md) for endpoints, filters, request
examples, response formats, business rules and supported operating scope.

Sidebar pages: Dashboard, Rooms, Tenants, Contracts, Services, Meter Readings,
Invoices, Payments, Reports, Data Management, Users and Logout. Pages include
forms, detail dialogs, search/filter controls, sorted tables, status badges,
loading/empty/error/success states, currency/date formatting and confirmations.

CRUD presentation: create/edit/read/delete an unused room, tenant and service.
Attempt to delete a leased room or referenced tenant/service to demonstrate HTTP
409. Historical contracts/invoices/readings also have reference-aware deletion;
payments are append-only. An invoice with any payment history cannot be deleted.

Contract creation validates room/tenant references and dates, rejects another
ACTIVE room contract, and sets the room OCCUPIED. Extend moves the end date
forward. Terminate/expire releases the room while preserving intentional
MAINTENANCE. Expired ACTIVE contracts are reconciled before relevant API queries.

Meter indexes keep the exact existing embedded structure. Each room/year/month
has at most one reading and invoice. New indexes cannot be smaller than old ones.
Invoice rent comes from the ACTIVE contract; utility usage comes from readings;
service prices are embedded as snapshots. Editing a service does not rewrite old
invoices. SUCCESS payments alone determine UNPAID/PARTIAL/PAID and revenue.
Overpayment is rejected transactionally. Invoice editing only changes dueDate.

### Basic queries and advanced queries

The **Reports** page provides click-to-run controls for eight basic queries:
available rooms, occupied rooms, maintenance rooms, tenant phone search, active
contracts, active services, unpaid invoices and invoice payment history.

Ten advanced aggregation reports: monthly successful revenue, electricity usage,
water usage, expiring contracts, overdue invoices with balances, tenant rental
history, room occupancy, invoice status, revenue by payment method and room
monthly billing history. Select month/year/room/tenant/days as appropriate.
Results are shown as tables and full documents. The dashboard provides room,
tenant, contract, debt, revenue and utility summary cards.

### MONGODB COMPASS DEMO

Connect MongoDB Compass with the same private Atlas URI. Select the database
configured in `.env`. Use the embedded **mongosh** shell in Compass to paste the
scripts below. Compass's collection **Filter** box accepts only the filter object;
its **Aggregations** tab accepts the pipeline array, without `db...aggregate()`.
For a JavaScript Playground, use the MongoDB for VS Code extension connected to
the same Atlas cluster and prepend `use("QuanLyPhongTro")` if appropriate.

Basic query:

```javascript
db.rooms.find({ status: "AVAILABLE" })
```

Monthly revenue (SUCCESS payments, Vietnam calendar month):

```javascript
db.payments.aggregate([
  { $match: { status: "SUCCESS" } },
  { $group: {
      _id: {
        year: { $year: { date: "$paymentDate", timezone: "Asia/Ho_Chi_Minh" } },
        month: { $month: { date: "$paymentDate", timezone: "Asia/Ho_Chi_Minh" } }
      },
      totalRevenue: { $sum: "$amount" },
      transactionCount: { $sum: 1 }
  } },
  { $sort: { "_id.year": -1, "_id.month": -1 } }
])
```

Expiring contracts:

```javascript
db.contracts.aggregate([
  { $match: {
      status: "ACTIVE",
      endDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) }
  } },
  { $lookup: { from: "rooms", localField: "roomId", foreignField: "_id", as: "room" } },
  { $unwind: "$room" },
  { $project: { roomNumber: "$room.roomNumber", endDate: 1, monthlyRent: 1 } },
  { $sort: { endDate: 1 } }
])
```

Overdue invoices:

```javascript
db.invoices.aggregate([
  { $match: { status: { $in: ["UNPAID", "PARTIAL"] }, dueDate: { $lt: new Date() } } },
  { $lookup: { from: "rooms", localField: "roomId", foreignField: "_id", as: "room" } },
  { $unwind: "$room" },
  { $project: { roomNumber: "$room.roomNumber", month: 1, year: 1, total: 1, status: 1, dueDate: 1 } },
  { $sort: { dueDate: 1 } }
])
```

Electricity and water usage:

```javascript
db.meter_readings.aggregate([
  { $group: {
      _id: { year: "$year", month: "$month" },
      electricityUsage: { $sum: { $subtract: ["$electricity.newIndex", "$electricity.oldIndex"] } },
      waterUsage: { $sum: { $subtract: ["$water.newIndex", "$water.oldIndex"] } }
  } },
  { $sort: { "_id.year": -1, "_id.month": -1 } }
])
```

The web Reports page runs equivalent queries, including room/tenant lookups and
status statistics, so the group can demonstrate both GUI and application access.
MongoDB references: [Node driver transactions](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/)
and [Extended JSON](https://www.mongodb.com/docs/drivers/node/current/data-formats/extended-json/).

### Import / export

ADMIN ? Data Management ? choose a whitelisted collection and upload a `.json`
file containing an array (maximum 10 MB / 5000 rows). Both ordinary JSON and
MongoDB Extended JSON are accepted; BSON ObjectIds, dates, ints and doubles are
normalized to the original validators. New documents are inserted; existing IDs
and unique values are not overwritten. Validation/business failures return zero
insertions and row/errors; a failed batch is rolled back.

Import dependencies in this order: rooms ? tenants ? services ? contracts ?
meter_readings ? invoices ? payments. Import standalone invoices as UNPAID and
then import their payments to derive final status. Use full backup/restore to
preserve PAID/PARTIAL historical data exactly across all collections.

Example fresh room import:

```json
[
  { "roomNumber": "IMPORT-01", "floor": 1, "price": 2500000, "area": 20, "status": "AVAILABLE" }
]
```

Export selects a collection and downloads a dated JSON attachment. Canonical
Extended JSON uses `$oid`, `$date`, `$numberInt`, `$numberDouble`; these are BSON
representations, not schema changes. Users are excluded from business data tools.

### Backup / restore

ADMIN ? Data Management ? **Create backup**. The backend stores the seven
collections in `backend/backups/backup-*.json` and returns filename, creation time
and collection counts. List/download controls are available on the same page.

A backup has createdAt, database and collections keys. Restore can select a stored
backup OR upload the same structure. It requires typing `RESTORE` plus a browser
confirmation. Database name must match the connected database. ObjectId links,
unique values, totals and payment-derived states are validated first. A safety
backup is saved before all seven business collections are replaced in a single
MongoDB transaction. Any write failure rolls back the replacement. Collections,
validators and indexes are not dropped; users remain unchanged. There is no
unauthenticated or automatic restore. Keep the backup outside the project as well
if you need protection against loss of the local machine.

Optional full database tooling (not required for normal operation):

```powershell
# Run in a private terminal. Use your local URI; never commit a filled-in command.
mongodump --uri="<ATLAS_URI>" --db="QuanLyPhongTro" --archive="boarding-house.archive.gz" --gzip
# Restore into a disposable, empty demo database; verify namespace mappings first.
mongorestore --uri="<ATLAS_URI>" --archive="boarding-house.archive.gz" --gzip --nsInclude="QuanLyPhongTro.*"
```

MongoDB Database Tools are installed separately. Do not use `--drop` against your
shared database. Unlike application JSON backup, these tools can include indexes
and auxiliary collections according to your selected namespaces.

### Full local demo scenario

1. Start backend and Live Server; log in as ADMIN. Briefly show user management.
2. Create AVAILABLE room `WEB-DEMO` (floor 5, area 22, monthly price 2,500,000).
3. Create a new tenant with unique phone and identity card.
4. Create an ACTIVE contract for that room/tenant, starting now and ending in
   30 days; monthlyRent/deposit 2,500,000. Show the room becomes OCCUPIED.
5. Attempt another ACTIVE contract to show conflict rejection.
6. Enter this month's reading: electricity 100?160; water 20?28.
7. Generate the invoice with a future due date. With sample prices and no optional
   Parking, total = 2,500,000 + 210,000 + 120,000 + 100,000 + 30,000 = 2,960,000.
8. Record 1,000,000 SUCCESS CASH payment. Show PARTIAL / 1,960,000 remaining.
9. Record 1,960,000 SUCCESS BANK_TRANSFER payment. Show PAID / zero balance.
10. Dashboard: select the payment month/year; revenue has increased by 2,960,000.
11. Reports: run room occupancy, revenue, consumption and room billing history.
12. Export rooms, then create/download a full backup.
13. Demonstrate import and confirmed restore only on a disposable demo database.
14. Show contract extension/termination and safe deletion conflicts.

### Testing, rubric evidence and troubleshooting

See [verification checklist and test details](docs/WEB_VERIFICATION.md).

```powershell
cd backend
npm run check
npm test
npm run test:integration
```

Live integration tests require a real Atlas URI and create an isolated random
`QuanLyPhongTro_Web_*_Test` database. They never use the application's normal
configured database for test writes. A TEST_MONGODB_DB_NAME override must be
explicitly isolated, empty, and end in `_Test`.

- **Placeholder configuration / ENOTFOUND / ETIMEOUT:** replace the sample Atlas
  hostname and credentials in `.env`; check DNS/network and your Atlas cluster.
- **Authentication failed connecting to Atlas:** use a database user, not your
  Atlas website account; URL-encode special characters and confirm permissions.
- **Server selection timeout:** check Atlas IP access list and outbound network.
- **JWT_SECRET rejected:** generate a random secret of at least 32 characters;
  restart backend and log in again after changing it.
- **MongoDB validation error / collections missing:** run `npm run db:setup` on
  the same MONGODB_DB_NAME; do not loosen the team's validators.
- **Duplicate ACTIVE contracts during setup:** inspect and resolve existing data
  intentionally; setup does not delete or silently rewrite contracts.
- **CORS / failed fetch:** start the backend, open frontend through Live Server,
  and match FRONTEND_URL to the browser origin (127.0.0.1 versus localhost).
- **Login fails:** run the explicit admin command; no default credentials exist.
- **Empty dashboard revenue:** select October 2026 for original seed payments or
  the current month for newly recorded payments. Only SUCCESS is counted.
- **409 deleting:** the record is referenced by history; disable/terminate where
  appropriate instead of deleting it.
- **Restore rejected:** use the same database name, complete seven-collection
  structure, consistent references/statuses, ADMIN login and exact confirmation.
- **Transactions unavailable:** use Atlas or a replica set; there is no unsafe
  delete/insert fallback for a standalone server.
