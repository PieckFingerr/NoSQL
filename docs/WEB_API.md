# Local Web API

Base: `http://localhost:5000/api`. Send `Authorization: Bearer <token>` after login.
Normal responses are `{ "success": true, "data": ... }`; errors are
`{ "success": false, "message": "..." }`. Downloads return JSON attachments.
ObjectIds are 24-character hexadecimal strings in API requests/responses. Dates
are ISO strings; numeric fields are converted to the original BSON types before writes.

| Resource | Endpoints | Notes |
| --- | --- | --- |
| Health | `GET /health` | Database ping, no credentials returned |
| Authentication | `POST /auth/login`, `GET /auth/me` | Login body: username/password; returns token and safe user |
| Users | `GET, POST /users`; `GET, PUT, DELETE /users/:id`; `PATCH /users/:id/toggle-active` | ADMIN only; passwords hashed; last active admin protected |
| Rooms | `GET, POST /rooms`; `GET, PUT, DELETE /rooms/:id` | search, floor, status filters; referenced rooms cannot be deleted |
| Tenants | `GET, POST /tenants`; `GET, PUT, DELETE /tenants/:id`; `GET /tenants/:id/rental-history` | search matches fullName/phone/identityCard; phone filter supported |
| Contracts | `GET, POST /contracts`; `GET, PUT, DELETE /contracts/:id`; `PATCH /contracts/:id/extend`; `PATCH /contracts/:id/terminate`; `GET /contracts/expiring?days=30` | search, roomId, tenantId, status filters; extend body: endDate |
| Services | `GET, POST /services`; `GET, PUT, DELETE /services/:id`; `PATCH /services/:id/toggle-active` | search, active=true/false filters |
| Readings | `GET, POST /meter-readings`; `GET, PUT, DELETE /meter-readings/:id` | roomId, month, year filters; embedded electricity/water required |
| Invoices | `GET /invoices`; `GET, PUT, DELETE /invoices/:id`; `POST /invoices/generate` | roomId, month, year, status, overdue=true filters; PUT accepts only dueDate |
| Payments | `GET, POST /payments`; `GET /payments/:id` | invoiceId, status filters; immutable payment history |
| Dashboard | `GET /dashboard?month=10&year=2026` | Defaults to current Vietnam month/year |
| Basic queries | `GET /reports/basic/:name` | See names below |
| Advanced queries | `GET /reports/:name` | Aggregations, see names below |
| Import | `POST /data/import/:collection` | ADMIN; multipart `file`; JSON array; atomic insert, no overwrites |
| Export | `GET /data/export/:collection?format=json` | ADMIN; canonical Extended JSON download |
| Backup | `POST /data/backup`; `GET /data/backups`; `GET /data/backups/:filename` | ADMIN; seven collections; excludes users |
| Restore | `POST /data/restore` | ADMIN; JSON `{filename, confirm:"RESTORE"}` OR multipart `file`, `confirm` |

Business collections: `rooms`, `tenants`, `contracts`, `services`, `meter_readings`,
`invoices`, `payments`. Arbitrary collection access and user imports are rejected.

## Basic query names

`available-rooms`, `occupied-rooms`, `maintenance-rooms`, `tenant-phone?phone=0901`,
`active-contracts`, `active-services`, `unpaid-invoices`,
`invoice-payments?invoiceId=<id>`.

## Advanced query names

| Name | Parameters | Pipeline purpose |
| --- | --- | --- |
| monthly-revenue | month, year (optional) | Match SUCCESS payments, group paymentDate by Vietnam month/year |
| electricity-usage | month, year (optional) | Sum electricity.newIndex minus electricity.oldIndex |
| water-usage | month, year (optional) | Sum water.newIndex minus water.oldIndex |
| expiring-contracts | days (default 30) | Match ACTIVE dates; join rooms/tenants; calculate daysLeft |
| overdue-invoices | month, year (optional) | Match outstanding past-due invoices; join rooms/payments; calculate balance |
| tenant-rental-history | tenantId (required) | Join the tenant's contracts with rooms and tenant names |
| room-occupancy | none | Group room statuses and counts |
| invoice-status | month, year (optional) | Group invoice statuses, counts and amounts |
| revenue-by-method | month, year (optional) | Match SUCCESS, group by paymentMethod |
| room-billing-history | roomId (required), month, year (optional) | Join room invoices with services snapshots and payment history |

## Request examples

Create a contract:

```json
{
  "roomId": "REPLACE_WITH_ROOM_OBJECTID",
  "tenantIds": ["REPLACE_WITH_TENANT_OBJECTID"],
  "startDate": "2026-10-01T00:00:00Z",
  "endDate": "2027-10-01T00:00:00Z",
  "monthlyRent": 2500000,
  "deposit": 2500000,
  "status": "ACTIVE"
}
```

Record a reading:

```json
{
  "roomId": "REPLACE_WITH_ROOM_OBJECTID",
  "month": 10,
  "year": 2026,
  "electricity": { "oldIndex": 100, "newIndex": 160 },
  "water": { "oldIndex": 20, "newIndex": 28 }
}
```

Generate an invoice:

```json
{
  "roomId": "REPLACE_WITH_ROOM_OBJECTID",
  "month": 10,
  "year": 2026,
  "dueDate": "2026-11-05T00:00:00Z",
  "serviceIds": []
}
```

Uses Electricity, Water, Internet and Garbage when enabled, matching Member 3.
Electricity and Water must exist and be enabled. Select optional serviceIds for
Parking or another flat one-unit charge. Missing utility rates are errors rather
than silently using hardcoded fallback prices. Existing invoice snapshots remain
unchanged when service prices change.

Record a payment:

```json
{
  "invoiceId": "REPLACE_WITH_INVOICE_OBJECTID",
  "amount": 1000000,
  "paymentMethod": "CASH",
  "status": "SUCCESS",
  "note": "First installment"
}
```

Only SUCCESS amounts affect balance. Pending/cancelled entries are retained as
history. Editing/approving past payments is deliberately not exposed; record a
new SUCCESS entry when money is received. No payment deletion endpoint exists.

## Rules and operating scope

- One local API process; an in-process queue serializes writes. Do not run
  multiple API instances or write through Compass while an import/restore runs.
- Atlas transactions atomically commit contract/room, payment/invoice, import,
  and restore changes. There is no non-transactional fallback.
- Setup adds a unique partial roomId index for ACTIVE contracts, preserving
  every existing index. Room/month uniqueness uses the team's compound indexes.
- Before room/contract/invoice reads, dashboard and reports, ACTIVE contracts
  whose endDate has passed are expired transactionally. Their rooms become
  AVAILABLE unless explicitly MAINTENANCE. This also runs before their writes.
- No seed or database reset runs on server startup. Setup and seeding are
  explicit local commands. Restore requires both ADMIN authentication and the
  literal confirmation RESTORE.
- Referenced history is protected with HTTP 409. Invoice billing snapshots
  cannot be rewritten, and billed readings cannot be edited or deleted.
- Import is all-or-nothing. Validation failures return insertedCount=0 with
  errors; malformed JSON/unsupported collections return HTTP 400. Exported
  historical invoice status can be reconstructed by importing invoices as
  UNPAID followed by payments. Full backup/restore is the exact-history path.
- JSON backup preserves ObjectId, Int32, Double and Date using Extended JSON.
  Restore validates relationships, duplicate unique values, ACTIVE occupancy,
  totals and payment-derived status before creating its safety backup. Deletes
  and inserts run in one transaction without dropping collections or indexes.
- Application backups preserve business documents only. Re-run db:setup on a
  fresh database; use mongodump/mongorestore for database metadata/index backups.
- JWTs expire after eight hours. Active status and role are checked in MongoDB
  on every authenticated request, so deactivation takes effect immediately.
